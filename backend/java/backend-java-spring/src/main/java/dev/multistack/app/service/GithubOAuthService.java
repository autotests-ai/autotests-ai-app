package dev.multistack.app.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import dev.multistack.app.config.GithubOAuthProperties;
import dev.multistack.app.dto.GithubOAuthLoginResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.exception.AuthException;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.regex.Pattern;

@Service
@EnableConfigurationProperties(GithubOAuthProperties.class)
public class GithubOAuthService {

    private static final Pattern GITHUB_LOGIN =
            Pattern.compile("^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$");
    private static final String USER_AGENT = "autotests-ai-app";

    private final GithubOAuthProperties properties;
    private final RestClient restClient;

    public GithubOAuthService(GithubOAuthProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    public GithubOAuthLoginResponse exchange(GithubOAuthRequest request) {
        if (!properties.configured()) {
            throw new AuthException(503, "GitHub OAuth is not configured");
        }
        String accessToken = requestAccessToken(request.code());
        String login = requestLogin(accessToken);
        if (!isGithubLogin(login)) {
            throw new AuthException(401, "oauth login missing");
        }
        return new GithubOAuthLoginResponse(login);
    }

    static boolean isGithubLogin(String login) {
        if (login == null || login.equalsIgnoreCase("unknown")) {
            return false;
        }
        return GITHUB_LOGIN.matcher(login).matches();
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

    private static AuthException exchangeFailed() {
        return new AuthException(401, "oauth exchange failed");
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubTokenPayload(@JsonProperty("access_token") String accessToken) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record GithubUserPayload(String login) {
    }
}
