package dev.multistack.app.config;

import dev.multistack.app.allure.UnitTestBase;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

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
        assertTrue(new GithubOAuthProperties("id", "secret", "t", "u").configured());
        assertFalse(new GithubOAuthProperties(null, "secret", "t", "u").configured());
        assertFalse(new GithubOAuthProperties("", "secret", "t", "u").configured());
        assertFalse(new GithubOAuthProperties("  ", "secret", "t", "u").configured());
        assertFalse(new GithubOAuthProperties("id", null, "t", "u").configured());
        assertFalse(new GithubOAuthProperties("id", "", "t", "u").configured());
        assertFalse(new GithubOAuthProperties("id", "  ", "t", "u").configured());
        assertFalse(GithubOAuthProperties.hasText(null));
        assertFalse(GithubOAuthProperties.hasText(""));
        assertFalse(GithubOAuthProperties.hasText("  "));
        assertTrue(GithubOAuthProperties.hasText("id"));
    }
}
