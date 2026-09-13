package dev.multistack.app.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import dev.multistack.app.config.GithubOAuthProperties;
import dev.multistack.app.dto.GithubOAuthRepoResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.dto.GithubOAuthSession;
import dev.multistack.app.exception.AuthException;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Map;
import java.util.regex.Pattern;

@Service
@EnableConfigurationProperties(GithubOAuthProperties.class)
public class GithubOAuthService {

    public static final String COOKIE_NAME = "github_oauth";
    public static final String COOKIE_PATH = "/api/oauth";
    public static final String REPO_NAME = "java-junit5-rest_assured-selenide";

    private static final Pattern GITHUB_LOGIN =
            Pattern.compile("^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$");
    private static final String USER_AGENT = "autotests-ai-app";
    private static final Duration COOKIE_MAX_AGE = Duration.ofDays(1);

    private final GithubOAuthProperties properties;
    private final RestClient restClient;

    public GithubOAuthService(GithubOAuthProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
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

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubTokenPayload(@JsonProperty("access_token") String accessToken) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubUserPayload(String login) {
    }
}
