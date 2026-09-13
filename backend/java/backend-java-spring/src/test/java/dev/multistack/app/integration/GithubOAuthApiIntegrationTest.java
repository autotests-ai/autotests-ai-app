package dev.multistack.app.integration;

import dev.multistack.app.allure.IntegrationTestBase;
import dev.multistack.app.dto.GithubOAuthRequest;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Epic("GitHub OAuth")
@Feature("POST /api/oauth/github")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("GitHub OAuth API in-process")
class GithubOAuthApiIntegrationTest extends IntegrationTestBase {

    @DynamicPropertySource
    static void emptyGithubOAuth(DynamicPropertyRegistry registry) {
        registry.add("github.oauth.client-id", () -> "");
        registry.add("github.oauth.client-secret", () -> "");
        registry.add("github.oauth.token-url", () -> "https://example.test/login/oauth/access_token");
        registry.add("github.oauth.user-url", () -> "https://example.test/user");
        registry.add("github.oauth.repos-url", () -> "https://example.test/user/repos");
        registry.add("github.oauth.repo-api-base", () -> "https://example.test/repos");
    }

    @Test
    @DisplayName("POST /api/oauth/github is public and rejects a blank body with 400, not 401")
    void exchangeIsPublicAndValidates() {
        ResponseEntity<String> response = postJson(
                "/api/oauth/github",
                Map.of(),
                String.class);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("code"));
        assertFalse(response.getBody().contains("access_token"));
        assertFalse(response.getBody().contains("\"token\""));
    }

    @Test
    @DisplayName("POST /api/oauth/github is 503 without a secret and never returns a token")
    void exchangeWithoutSecretIsUnavailable() {
        ResponseEntity<String> response = postJson(
                "/api/oauth/github",
                new GithubOAuthRequest("gh-code", "csrf"),
                String.class);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getHeaders().getContentType());
        assertTrue(response.getHeaders().getContentType().isCompatibleWith(MediaType.APPLICATION_JSON));
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("GitHub OAuth is not configured"));
        assertFalse(response.getBody().contains("access_token"));
        assertFalse(response.getBody().contains("\"token\""));
        assertFalse(response.getBody().contains("\"login\""));
        assertFalse(response.getHeaders().containsKey("Set-Cookie"));
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos is 401 without the GitHub cookie and never hits GitHub")
    void createRepoWithoutCookieIsUnauthorized() {
        ResponseEntity<String> response = rest.postForEntity(
                "/api/oauth/github/repos",
                null,
                String.class);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("oauth cookie missing"));
        assertFalse(response.getBody().contains("access_token"));
        assertFalse(response.getBody().contains("\"token\""));
        assertFalse(response.getBody().contains("\"created\""));
        assertFalse(response.getBody().contains("octocat"));
    }
}
