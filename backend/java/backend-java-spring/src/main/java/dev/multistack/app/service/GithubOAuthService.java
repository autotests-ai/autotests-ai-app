package dev.multistack.app.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.config.GithubOAuthProperties;
import dev.multistack.app.dto.GithubOAuthPushResponse;
import dev.multistack.app.dto.GithubOAuthRepoResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.dto.GithubOAuthSession;
import dev.multistack.app.dto.GithubTreeBlob;
import dev.multistack.app.exception.AuthException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@EnableConfigurationProperties(GithubOAuthProperties.class)
public class GithubOAuthService {

    public static final String COOKIE_NAME = "github_oauth";
    public static final String COOKIE_PATH = "/api/oauth";
    public static final String REPO_NAME = "java-junit5-rest_assured-selenide";
    public static final String DEFAULT_BRANCH = "main";

    private static final Pattern GITHUB_LOGIN =
            Pattern.compile("^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$");
    private static final String USER_AGENT = "autotests-ai-app";
    private static final Duration COOKIE_MAX_AGE = Duration.ofDays(1);

    private final GithubOAuthProperties properties;
    private final RestClient restClient;
    private final AssembleTree assembleTree;
    private final ObjectMapper objectMapper = new ObjectMapper();

    GithubOAuthService(GithubOAuthProperties properties, RestClient.Builder restClientBuilder) {
        this(properties, restClientBuilder, new AssembleTree());
    }

    @Autowired
    public GithubOAuthService(
            GithubOAuthProperties properties,
            RestClient.Builder restClientBuilder,
            AssembleTree assembleTree) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.assembleTree = assembleTree;
    }

    public GithubOAuthSession exchange(GithubOAuthRequest request) {
        if (!properties.configured()) {
            throw new AuthException(503, "GitHub OAuth is not configured");
        }
        String accessToken = requestAccessToken(request.code());
        String login = requestLogin(accessToken);
        if (!isGithubLogin(login)) {
            throw new AuthException(401, "oauth login missing");
        }
        return new GithubOAuthSession(login, accessToken);
    }

    public GithubOAuthRepoResponse createRepo(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new AuthException(401, "oauth cookie missing");
        }
        String login = requestLogin(accessToken);
        if (!isGithubLogin(login)) {
            throw new AuthException(401, "oauth login missing");
        }
        if (!repoExists(accessToken, login)) {
            createRemoteRepo(accessToken);
        }
        return new GithubOAuthRepoResponse(login, htmlUrl(login), true);
    }

    public GithubOAuthPushResponse pushTree(String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new AuthException(401, "oauth cookie missing");
        }
        String login = requestLogin(accessToken);
        if (!isGithubLogin(login)) {
            throw new AuthException(401, "oauth login missing");
        }
        List<GithubTreeBlob> blobs = assembleTree.blobs();
        if (blobs.isEmpty()) {
            throw pushFailed();
        }
        String parentSha = existingCommitSha(accessToken, login);
        String currentTreeSha = parentSha == null ? null : existingTreeSha(accessToken, login, parentSha);
        String treeSha = createTreeSha(accessToken, login, blobs);
        if (treeSha.equals(currentTreeSha)) {
            return new GithubOAuthPushResponse(login, htmlUrl(login), true);
        }
        String commitSha = createCommitSha(accessToken, login, treeSha, parentSha);
        publishRef(accessToken, login, commitSha, parentSha != null);
        return new GithubOAuthPushResponse(login, htmlUrl(login), true);
    }

    public ResponseCookie toCookie(String accessToken, boolean secure) {
        return ResponseCookie.from(COOKIE_NAME, accessToken)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path(COOKIE_PATH)
                .maxAge(COOKIE_MAX_AGE)
                .build();
    }

    static boolean isGithubLogin(String login) {
        if (login == null || login.equalsIgnoreCase("unknown")) {
            return false;
        }
        return GITHUB_LOGIN.matcher(login).matches();
    }

    public static String htmlUrl(String login) {
        return "https://github.com/" + login + "/" + REPO_NAME;
    }

    private String requestAccessToken(String code) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("client_id", properties.clientId());
        form.add("client_secret", properties.clientSecret());
        form.add("code", code);
        GithubTokenPayload payload;
        try {
            payload = restClient.post()
                    .uri(properties.tokenUrl())
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(GithubTokenPayload.class);
        } catch (RestClientException ex) {
            throw exchangeFailed();
        }
        String token = payload == null ? null : payload.accessToken();
        if (token == null || token.isBlank()) {
            throw exchangeFailed();
        }
        return token;
    }

    private String requestLogin(String accessToken) {
        GithubUserPayload payload;
        try {
            payload = restClient.get()
                    .uri(properties.userUrl())
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(GithubUserPayload.class);
        } catch (RestClientException ex) {
            throw exchangeFailed();
        }
        return payload == null ? null : payload.login();
    }

    private boolean repoExists(String accessToken, String login) {
        final int status;
        try {
            status = restClient.get()
                    .uri(properties.repoApiUrl(login, REPO_NAME))
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .exchange((request, response) -> response.getStatusCode().value());
        } catch (RestClientException ex) {
            throw createFailed();
        }
        if (status == 200) {
            return true;
        }
        if (status == 404) {
            return false;
        }
        throw createFailed();
    }

    private void createRemoteRepo(String accessToken) {
        final int status;
        try {
            status = restClient.post()
                    .uri(properties.reposUrl())
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "name", REPO_NAME,
                            "private", Boolean.FALSE,
                            "auto_init", Boolean.FALSE))
                    .exchange((request, response) -> response.getStatusCode().value());
        } catch (RestClientException ex) {
            throw createFailed();
        }
        if (status == 201 || status == 200 || status == 422) {
            return;
        }
        throw createFailed();
    }

    private static AuthException exchangeFailed() {
        return new AuthException(401, "oauth exchange failed");
    }

    private static AuthException createFailed() {
        return new AuthException(401, "oauth create failed");
    }

    private static AuthException pushFailed() {
        return new AuthException(401, "oauth push failed");
    }

    private String existingCommitSha(String accessToken, String login) {
        String url = properties.repoApiUrl(login, REPO_NAME) + "/git/ref/heads/" + DEFAULT_BRANCH;
        try {
            return restClient.get()
                    .uri(url)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .exchange((request, response) -> {
                        int status = response.getStatusCode().value();
                        if (status == 404) {
                            return null;
                        }
                        if (status != 200) {
                            throw pushFailed();
                        }
                        GithubRefPayload payload = readJson(response, GithubRefPayload.class);
                        if (payload == null || payload.object() == null) {
                            return null;
                        }
                        String sha = payload.object().sha();
                        if (sha == null || sha.isBlank()) {
                            return null;
                        }
                        return sha;
                    });
        } catch (RestClientException ex) {
            throw pushFailed();
        }
    }

    private String existingTreeSha(String accessToken, String login, String commitSha) {
        String url = properties.repoApiUrl(login, REPO_NAME) + "/git/commits/" + commitSha;
        try {
            return restClient.get()
                    .uri(url)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .exchange((request, response) -> {
                        if (response.getStatusCode().value() != 200) {
                            throw pushFailed();
                        }
                        GithubCommitPayload payload = readJson(response, GithubCommitPayload.class);
                        if (payload == null || payload.tree() == null) {
                            return null;
                        }
                        String sha = payload.tree().sha();
                        if (sha == null || sha.isBlank()) {
                            return null;
                        }
                        return sha;
                    });
        } catch (RestClientException ex) {
            throw pushFailed();
        }
    }

    private String createTreeSha(String accessToken, String login, List<GithubTreeBlob> blobs) {
        List<Map<String, String>> tree = new ArrayList<>();
        for (GithubTreeBlob blob : blobs) {
            tree.add(Map.of(
                    "path", blob.path(),
                    "mode", "100644",
                    "type", "blob",
                    "content", blob.content()));
        }
        return postSha(
                properties.repoApiUrl(login, REPO_NAME) + "/git/trees",
                accessToken,
                Map.of("tree", tree));
    }

    private String createCommitSha(
            String accessToken, String login, String treeSha, String parentSha) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "Assemble " + REPO_NAME);
        body.put("tree", treeSha);
        if (parentSha != null) {
            body.put("parents", List.of(parentSha));
        }
        return postSha(
                properties.repoApiUrl(login, REPO_NAME) + "/git/commits",
                accessToken,
                body);
    }

    private void publishRef(String accessToken, String login, String commitSha, boolean exists) {
        String repo = properties.repoApiUrl(login, REPO_NAME);
        String url = exists
                ? repo + "/git/refs/heads/" + DEFAULT_BRANCH
                : repo + "/git/refs";
        Object body = exists
                ? Map.of("sha", commitSha)
                : Map.of("ref", "refs/heads/" + DEFAULT_BRANCH, "sha", commitSha);
        var spec = exists ? restClient.patch() : restClient.post();
        try {
            int status = spec
                    .uri(url)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .exchange((request, response) -> response.getStatusCode().value());
            if (status != 200 && status != 201) {
                throw pushFailed();
            }
        } catch (RestClientException ex) {
            throw pushFailed();
        }
    }

    private String postSha(String url, String accessToken, Object body) {
        try {
            return restClient.post()
                    .uri(url)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .exchange((request, response) -> {
                        int status = response.getStatusCode().value();
                        if (status != 200 && status != 201) {
                            throw pushFailed();
                        }
                        GithubShaPayload payload = readJson(response, GithubShaPayload.class);
                        if (payload == null || payload.sha() == null || payload.sha().isBlank()) {
                            throw pushFailed();
                        }
                        return payload.sha();
                    });
        } catch (RestClientException ex) {
            throw pushFailed();
        }
    }

    private <T> T readJson(ClientHttpResponse response, Class<T> type) {
        try {
            return objectMapper.readValue(response.getBody(), type);
        } catch (IOException ex) {
            throw pushFailed();
        }
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubTokenPayload(@JsonProperty("access_token") String accessToken) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubUserPayload(String login) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubShaPayload(String sha) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubRefPayload(GithubRefObject object) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubRefObject(String sha) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubCommitPayload(GithubShaPayload tree) {
    }
}
