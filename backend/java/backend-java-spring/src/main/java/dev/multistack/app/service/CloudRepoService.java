package dev.multistack.app.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.config.GithubCloudProperties;
import dev.multistack.app.dto.CloudRepoPushResponse;
import dev.multistack.app.dto.CloudRepoResponse;
import dev.multistack.app.dto.GithubTreeBlob;
import dev.multistack.app.exception.AuthException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@EnableConfigurationProperties(GithubCloudProperties.class)
public class CloudRepoService {

    public static final String DEFAULT_BRANCH = "main";

    private static final String USER_AGENT = "autotests-ai-app";

    private final GithubCloudProperties properties;
    private final IdpOAuthService idpOAuthService;
    private final AssembleTree assembleTree;
    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    CloudRepoService(
            GithubCloudProperties properties,
            IdpOAuthService idpOAuthService,
            RestClient.Builder restClientBuilder) {
        this(properties, idpOAuthService, new AssembleTree(List.of()), restClientBuilder);
    }

    @Autowired
    public CloudRepoService(
            GithubCloudProperties properties,
            IdpOAuthService idpOAuthService,
            AssembleTree assembleTree,
            RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.idpOAuthService = idpOAuthService;
        this.assembleTree = assembleTree;
        this.restClient = restClientBuilder.build();
    }

    public CloudRepoResponse createRepo(String accessToken, String yaml) {
        String login = requireCloudSession(accessToken);
        String stack = AssembleTree.e2eStack(yaml);
        String repo = repoName(login, stack);
        if (!repoExists(repo)) {
            createOrgRepo(repo);
        }
        return new CloudRepoResponse(login, htmlUrl(login, stack), true);
    }

    public CloudRepoPushResponse pushTree(String accessToken, String yaml) {
        String login = requireCloudSession(accessToken);
        String stack = AssembleTree.e2eStack(yaml);
        String repo = repoName(login, stack);
        List<GithubTreeBlob> blobs = assembleTree.blobs(yaml);
        if (blobs.isEmpty()) {
            throw pushFailed();
        }
        String parentSha = existingCommitSha(repo);
        String currentTreeSha = parentSha == null ? null : existingTreeSha(repo, parentSha);
        String treeSha = createTreeSha(repo, blobs);
        if (treeSha.equals(currentTreeSha)) {
            return new CloudRepoPushResponse(login, htmlUrl(login, stack), true);
        }
        String commitSha = createCommitSha(repo, treeSha, parentSha);
        publishRef(repo, commitSha, parentSha != null);
        return new CloudRepoPushResponse(login, htmlUrl(login, stack), true);
    }

    public static String repoName(String login, String stack) {
        return login + "-" + stack;
    }

    public static String htmlUrl(String login, String stack) {
        return "https://github.com/" + GithubCloudProperties.ORG + "/" + repoName(login, stack);
    }

    private String requireCloudSession(String accessToken) {
        if (!properties.configured()) {
            throw new AuthException(503, "GitHub cloud is not configured");
        }
        if (accessToken == null || accessToken.isBlank()) {
            throw new AuthException(401, "oauth cookie missing");
        }
        return idpOAuthService.login(accessToken);
    }

    private boolean repoExists(String repo) {
        final int status;
        try {
            status = restClient.get()
                    .uri(properties.repoApiUrl(repo))
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, bearer())
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

    private void createOrgRepo(String repo) {
        final int status;
        try {
            status = restClient.post()
                    .uri(properties.reposUrl())
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, bearer())
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "name", repo,
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

    private String existingCommitSha(String repo) {
        String url = properties.repoApiUrl(repo) + "/git/ref/heads/" + DEFAULT_BRANCH;
        try {
            return restClient.get()
                    .uri(url)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, bearer())
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

    private String existingTreeSha(String repo, String commitSha) {
        String url = properties.repoApiUrl(repo) + "/git/commits/" + commitSha;
        try {
            return restClient.get()
                    .uri(url)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, bearer())
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

    private String createTreeSha(String repo, List<GithubTreeBlob> blobs) {
        List<Map<String, String>> tree = new ArrayList<>();
        for (GithubTreeBlob blob : blobs) {
            tree.add(Map.of(
                    "path", blob.path(),
                    "mode", "100644",
                    "type", "blob",
                    "content", blob.content()));
        }
        return postSha(properties.repoApiUrl(repo) + "/git/trees", Map.of("tree", tree));
    }

    private String createCommitSha(String repo, String treeSha, String parentSha) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("message", "Assemble " + repo);
        body.put("tree", treeSha);
        if (parentSha != null) {
            body.put("parents", List.of(parentSha));
        }
        return postSha(properties.repoApiUrl(repo) + "/git/commits", body);
    }

    private void publishRef(String repo, String commitSha, boolean exists) {
        String api = properties.repoApiUrl(repo);
        String url = exists
                ? api + "/git/refs/heads/" + DEFAULT_BRANCH
                : api + "/git/refs";
        Object body = exists
                ? Map.of("sha", commitSha)
                : Map.of("ref", "refs/heads/" + DEFAULT_BRANCH, "sha", commitSha);
        var spec = exists ? restClient.patch() : restClient.post();
        try {
            int status = spec
                    .uri(url)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, bearer())
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

    private String postSha(String url, Object body) {
        try {
            return restClient.post()
                    .uri(url)
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, bearer())
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

    private String bearer() {
        return "Bearer " + properties.token();
    }

    private <T> T readJson(ClientHttpResponse response, Class<T> type) {
        try {
            return objectMapper.readValue(response.getBody(), type);
        } catch (IOException ex) {
            throw pushFailed();
        }
    }

    private static AuthException createFailed() {
        return new AuthException(401, "oauth create failed");
    }

    private static AuthException pushFailed() {
        return new AuthException(401, "oauth push failed");
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
