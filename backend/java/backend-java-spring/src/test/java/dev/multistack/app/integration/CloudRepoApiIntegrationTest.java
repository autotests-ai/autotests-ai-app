package dev.multistack.app.integration;

import dev.multistack.app.allure.IntegrationTestBase;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Epic("Dest cloud")
@Feature("POST /api/cloud/repos")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("Dest cloud repo API in-process")
class CloudRepoApiIntegrationTest extends IntegrationTestBase {

    @DynamicPropertySource
    static void emptyGithubCloud(DynamicPropertyRegistry registry) {
        registry.add("github.cloud.token", () -> "");
        registry.add("github.cloud.repos-url", () -> "https://example.test/orgs/autotests-cloud/repos");
        registry.add("github.cloud.repo-api-base", () -> "https://example.test/repos");
    }

    @Test
    @DisplayName("POST /api/cloud/repos is 503 without GitHub env and never returns a token")
    void createWithoutGithubEnvIsUnavailable() {
        ResponseEntity<String> response = rest.postForEntity(
                "/api/cloud/repos",
                null,
                String.class);

        assertEquals(HttpStatus.SERVICE_UNAVAILABLE, response.getStatusCode());
        assertNotNull(response.getHeaders().getContentType());
        assertTrue(response.getHeaders().getContentType().isCompatibleWith(MediaType.APPLICATION_JSON));
        assertNotNull(response.getBody());
        assertTrue(response.getBody().contains("GitHub cloud is not configured"));
        assertFalse(response.getBody().contains("access_token"));
        assertFalse(response.getBody().contains("\"token\""));
        assertFalse(response.getBody().contains("\"created\""));
        assertFalse(response.getBody().contains("\"login\""));
        assertFalse(response.getBody().contains("ghs_"));
        assertFalse(response.getBody().contains("ghp_"));
        assertFalse(response.getHeaders().containsKey("Set-Cookie"));
    }
}
