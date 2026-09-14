package dev.multistack.app.config;

import dev.multistack.app.allure.UnitTestBase;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Epic("GitHub OAuth")
@Feature("GithubOAuthProperties")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("GithubOAuthProperties")
class GithubOAuthPropertiesTest extends UnitTestBase {

    @Test
    @DisplayName("configured requires both client id and secret")
    void configuredRequiresIdAndSecret() {
        assertTrue(props("id", "secret").configured());
        assertFalse(props(null, "secret").configured());
        assertFalse(props("", "secret").configured());
        assertFalse(props("  ", "secret").configured());
        assertFalse(props("id", null).configured());
        assertFalse(props("id", "").configured());
        assertFalse(props("id", "  ").configured());
        assertFalse(GithubOAuthProperties.hasText(null));
        assertFalse(GithubOAuthProperties.hasText(""));
        assertFalse(GithubOAuthProperties.hasText("  "));
        assertTrue(GithubOAuthProperties.hasText("id"));
    }

    @Test
    @DisplayName("repo API URL joins login and YAML e2e.stack without a trailing slash")
    void repoApiUrlJoinsOwnerAndName() {
        assertEquals(
                "https://api.github.com/repos/octocat/java-junit5-rest_assured-selenide",
                props("id", "secret").repoApiUrl("octocat", "java-junit5-rest_assured-selenide"));
        assertEquals(
                "https://example.test/repos/octocat/n",
                new GithubOAuthProperties("id", "secret", "t", "u", "r", "https://example.test/repos/")
                        .repoApiUrl("octocat", "n"));
        assertEquals(
                "/octocat/n",
                new GithubOAuthProperties("id", "secret", "t", "u", "r", null)
                        .repoApiUrl("octocat", "n"));
    }

    private static GithubOAuthProperties props(String id, String secret) {
        return new GithubOAuthProperties(
                id, secret, "t", "u", "https://api.github.com/user/repos", "https://api.github.com/repos");
    }
}
