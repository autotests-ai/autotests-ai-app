package dev.multistack.app.service;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import dev.multistack.app.config.IdpOAuthProperties;
import dev.multistack.app.dto.IdpOAuthRequest;
import dev.multistack.app.dto.IdpOAuthSession;
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
import java.util.regex.Pattern;

@Service
@EnableConfigurationProperties(IdpOAuthProperties.class)
public class IdpOAuthService {

    public static final String COOKIE_NAME = "idp_oauth";
    public static final String COOKIE_PATH = "/api/cloud";

    private static final Pattern SCHOOL_LOGIN =
            Pattern.compile("^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$");
    private static final String USER_AGENT = "autotests-ai-app";
    private static final Duration COOKIE_MAX_AGE = Duration.ofDays(1);

    private final IdpOAuthProperties properties;
    private final RestClient restClient;

    public IdpOAuthService(IdpOAuthProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    public IdpOAuthSession exchange(IdpOAuthRequest request) {
        if (!properties.configured()) {
            throw new AuthException(503, "IdP OAuth is not configured");
        }
        String accessToken = requestAccessToken(request);
        String login = login(accessToken);
        return new IdpOAuthSession(login, accessToken);
    }

    public String login(String accessToken) {
        String login = requestLogin(accessToken);
        if (!isSchoolLogin(login)) {
            throw new AuthException(401, "oauth login missing");
        }
        return login;
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

    static boolean isSchoolLogin(String login) {
        if (login == null || login.equalsIgnoreCase("unknown")) {
            return false;
        }
        return SCHOOL_LOGIN.matcher(login).matches();
    }

    private String requestAccessToken(IdpOAuthRequest request) {
        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "authorization_code");
        form.add("client_id", properties.clientId());
        form.add("client_secret", properties.clientSecret());
        form.add("code", request.code());
        form.add("redirect_uri", request.redirectUri());
        IdpTokenPayload payload;
        try {
            payload = restClient.post()
                    .uri(properties.tokenUrl())
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form)
                    .retrieve()
                    .body(IdpTokenPayload.class);
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
        IdpUserinfoPayload payload;
        try {
            payload = restClient.get()
                    .uri(properties.userinfoUrl())
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + accessToken)
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(IdpUserinfoPayload.class);
        } catch (RestClientException ex) {
            throw exchangeFailed();
        }
        if (payload == null) {
            return null;
        }
        if (IdpOAuthProperties.hasText(payload.preferredUsername())) {
            return payload.preferredUsername();
        }
        return payload.username();
    }

    private static AuthException exchangeFailed() {
        return new AuthException(401, "oauth exchange failed");
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record IdpTokenPayload(@JsonProperty("access_token") String accessToken) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    static record IdpUserinfoPayload(
            @JsonProperty("preferred_username") String preferredUsername,
            String username
    ) {
    }
}
