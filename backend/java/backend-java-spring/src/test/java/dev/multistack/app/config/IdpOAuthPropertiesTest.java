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

@Epic("Dest cloud")
@Feature("IdpOAuthProperties")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("IdpOAuthProperties")
class IdpOAuthPropertiesTest extends UnitTestBase {

    private static final String TOKEN = "https://idp.example/token";
    private static final String USERINFO = "https://idp.example/userinfo";

    @Test
    @DisplayName("configured requires school IdP client, secret, and URLs")
    void configuredRequiresClientSecretAndSchoolUrls() {
        assertTrue(props("id", "secret", TOKEN, USERINFO).configured());
        assertFalse(props("id", "", TOKEN, USERINFO).configured());
        assertFalse(props("id", "  ", TOKEN, USERINFO).configured());
        assertFalse(props("id", null, TOKEN, USERINFO).configured());
        assertFalse(props("", "secret", TOKEN, USERINFO).configured());
        assertFalse(props("id", "secret", "", USERINFO).configured());
        assertFalse(props("id", "secret", TOKEN, "").configured());
    }

    @Test
    @DisplayName("school IdP URLs reject GitHub, missing host, and illegal URIs")
    void isSchoolIdpUrlRejectsGithubAndInvalid() {
        assertTrue(IdpOAuthProperties.isSchoolIdpUrl(TOKEN));
        assertTrue(IdpOAuthProperties.isSchoolIdpUrl(
                "http://127.0.0.1:8543/realms/qa-guru/protocol/openid-connect/token"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl(null));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl(""));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("  "));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("ftp://idp.example/token"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("https://github.com/login/oauth/access_token"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("https://api.github.com/user"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("idp.example/token"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("http:///"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("http://["));
    }

    private static IdpOAuthProperties props(String id, String secret, String token, String userinfo) {
        return new IdpOAuthProperties(id, secret, token, userinfo);
    }
}
