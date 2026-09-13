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

@Epic("Dest cloud")
@Feature("GithubCloudProperties")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("GithubCloudProperties")
class GithubCloudPropertiesTest extends UnitTestBase {

    @Test
    @DisplayName("configured requires the org token")
    void configuredRequiresToken() {
        assertTrue(props("ghs_cloud").configured());
        assertFalse(props(null).configured());
        assertFalse(props("").configured());
        assertFalse(props("  ").configured());
        assertFalse(GithubCloudProperties.hasText(null));
        assertFalse(GithubCloudProperties.hasText(""));
        assertFalse(GithubCloudProperties.hasText("  "));
        assertTrue(GithubCloudProperties.hasText("ghs_cloud"));
        assertEquals("autotests-cloud", GithubCloudProperties.ORG);
    }

    @Test
    @DisplayName("repo API URL joins autotests-cloud and {login}-{e2e.stack}")
    void repoApiUrlJoinsOrgAndName() {
        assertEquals(
                "https://api.github.com/repos/autotests-cloud/qaguru-python-pytest",
                props("ghs_cloud").repoApiUrl("qaguru-python-pytest"));
        assertEquals(
                "https://example.test/repos/autotests-cloud/n",
                new GithubCloudProperties("ghs_cloud", "r", "https://example.test/repos/")
                        .repoApiUrl("n"));
        assertEquals(
                "/autotests-cloud/n",
                new GithubCloudProperties("ghs_cloud", "r", null).repoApiUrl("n"));
        assertFalse(props("ghs_cloud").repoApiUrl("qaguru-python-pytest").contains("octocat"));
        assertFalse(props("ghs_cloud").repoApiUrl("qaguru-python-pytest").contains("svasenkov"));
    }

    private static GithubCloudProperties props(String token) {
        return new GithubCloudProperties(
                token,
                "https://api.github.com/orgs/autotests-cloud/repos",
                "https://api.github.com/repos");
    }
}
