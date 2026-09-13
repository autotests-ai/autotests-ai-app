package dev.multistack.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.IdpOAuthProperties;
import dev.multistack.app.dto.IdpOAuthLoginResponse;
import dev.multistack.app.dto.IdpOAuthRequest;
import dev.multistack.app.exception.AuthException;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@Epic("IdP OAuth")
@Feature("IdpOAuthService")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("IdpOAuthService")
class IdpOAuthServiceTest extends UnitTestBase {

    private static final String TOKEN_URL = "https://idp.example/token";
    private static final String USERINFO_URL = "https://idp.example/userinfo";
    private static final String REDIRECT = "http://localhost:8081/oauth/idp/callback";
    private static final IdpOAuthRequest REQUEST = new IdpOAuthRequest("idp-code", "csrf", REDIRECT);

    private MockRestServiceServer server;
    private IdpOAuthService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new IdpOAuthService(configuredProperties(), builder);
    }

    @Test
    @DisplayName("exchanges code for preferred_username and never serializes the IdP token")
    void exchangeReturnsLoginWithoutToken() throws Exception {
        expectTokenThenUser(
                "{\"access_token\":\"idp_secret\",\"id_token\":\"eyJhbGciOiJub25lIn0\",\"token_type\":\"bearer\"}",
                "{\"preferred_username\":\"qaguru\",\"sub\":\"1\",\"token\":\"should-ignore\"}");

        String login = service.exchange(REQUEST);

        assertEquals("qaguru", login);
        String json = new ObjectMapper().writeValueAsString(new IdpOAuthLoginResponse(login));
        assertEquals("{\"login\":\"qaguru\"}", json);
        assertFalse(json.contains("idp_secret"));
        assertFalse(json.contains("access_token"));
        assertFalse(json.contains("id_token"));
        assertFalse(json.contains("eyJ"));
        assertFalse(json.contains("test-secret"));
        assertFalse(json.contains("gho_"));
        assertFalse(json.contains("ghp_"));
        server.verify();
    }

    @Test
    @DisplayName("uses username when preferred_username is absent")
    void exchangeFallsBackToUsername() {
        expectTokenThenUser("{\"access_token\":\"idp_secret\"}", "{\"username\":\"qaguru\"}");
        assertEquals("qaguru", service.exchange(REQUEST));
        server.verify();
    }

    @Test
    @DisplayName("is 503 when the IdP client is not configured")
    void exchangeRequiresSecret() {
        RestClient.Builder builder = RestClient.builder();
        IdpOAuthService unconfigured = new IdpOAuthService(
                new IdpOAuthProperties("", "secret", TOKEN_URL, USERINFO_URL),
                builder);

        AuthException ex = assertThrows(AuthException.class, () -> unconfigured.exchange(REQUEST));
        assertEquals(503, ex.getStatus());
        assertEquals("IdP OAuth is not configured", ex.getMessage());
    }

    @Test
    @DisplayName("is 503 when token or userinfo URL is GitHub")
    void exchangeRejectsGithubUrls() {
        RestClient.Builder builder = RestClient.builder();
        IdpOAuthService githubToken = new IdpOAuthService(
                new IdpOAuthProperties(
                        "id", "secret", "https://github.com/login/oauth/access_token", USERINFO_URL),
                builder);
        AuthException token = assertThrows(AuthException.class, () -> githubToken.exchange(REQUEST));
        assertEquals(503, token.getStatus());

        IdpOAuthService githubUser = new IdpOAuthService(
                new IdpOAuthProperties("id", "secret", TOKEN_URL, "https://api.github.com/user"),
                builder);
        AuthException user = assertThrows(AuthException.class, () -> githubUser.exchange(REQUEST));
        assertEquals(503, user.getStatus());
    }

    @Test
    @DisplayName("maps IdP token HTTP errors to oauth exchange failed")
    void tokenHttpError() {
        server.expect(once(), requestTo(TOKEN_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"invalid_grant\"}"));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a down IdP token endpoint to oauth exchange failed")
    void tokenNetworkError() {
        server.expect(once(), requestTo(TOKEN_URL))
                .andRespond(withException(new IOException("down")));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects a token payload without access_token")
    void tokenPayloadMissingAccessToken() {
        server.expect(once(), requestTo(TOKEN_URL))
                .andRespond(withSuccess("{\"id_token\":\"eyJhbGciOiJub25lIn0\"}", MediaType.APPLICATION_JSON));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects a blank access_token")
    void tokenPayloadBlankAccessToken() {
        server.expect(once(), requestTo(TOKEN_URL))
                .andRespond(withSuccess("{\"access_token\":\"   \"}", MediaType.APPLICATION_JSON));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects a null token JSON body")
    void tokenPayloadNullBody() {
        server.expect(once(), requestTo(TOKEN_URL))
                .andRespond(withSuccess("null", MediaType.APPLICATION_JSON));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects a null userinfo body")
    void userPayloadNullBody() {
        expectTokenThenUser("{\"access_token\":\"idp_secret\"}", "null");

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps IdP userinfo HTTP errors to oauth exchange failed")
    void userHttpError() {
        expectToken("{\"access_token\":\"idp_secret\"}");
        server.expect(once(), requestTo(USERINFO_URL))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(UNAUTHORIZED));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a down IdP userinfo endpoint to oauth exchange failed")
    void userNetworkError() {
        expectToken("{\"access_token\":\"idp_secret\"}");
        server.expect(once(), requestTo(USERINFO_URL))
                .andRespond(withException(new IOException("down")));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects missing, unknown, and invented school logins")
    void loginValidation() {
        assertFalse(IdpOAuthService.isSchoolLogin(null));
        assertFalse(IdpOAuthService.isSchoolLogin("unknown"));
        assertFalse(IdpOAuthService.isSchoolLogin("Unknown"));
        assertFalse(IdpOAuthService.isSchoolLogin(""));
        assertFalse(IdpOAuthService.isSchoolLogin("-qaguru"));
        assertTrue(IdpOAuthService.isSchoolLogin("qaguru"));
        assertTrue(IdpOAuthService.isSchoolLogin("a"));
        assertTrue(IdpOAuthProperties.isSchoolIdpUrl("https://idp.example/token"));
        assertTrue(IdpOAuthProperties.isSchoolIdpUrl(
                "http://127.0.0.1:8543/realms/qa-guru/protocol/openid-connect/token"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("https://github.com/login/oauth/access_token"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("https://api.github.com/user"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl("ftp://idp.example/token"));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl(""));
        assertFalse(IdpOAuthProperties.isSchoolIdpUrl(null));
    }

    @Test
    @DisplayName("rejects a userinfo payload without login")
    void userPayloadMissingLogin() {
        expectTokenThenUser("{\"access_token\":\"idp_secret\"}", "{}");
        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects school login unknown")
    void userPayloadUnknownLogin() {
        expectTokenThenUser("{\"access_token\":\"idp_secret\"}", "{\"preferred_username\":\"unknown\"}");
        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects an invented school login")
    void userPayloadInventedLogin() {
        expectTokenThenUser("{\"access_token\":\"idp_secret\"}", "{\"preferred_username\":\"qa_guru\"}");
        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects a blank school login")
    void userPayloadBlankLogin() {
        expectTokenThenUser("{\"access_token\":\"idp_secret\"}", "{\"preferred_username\":\"\"}");
        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    private void expectToken(String tokenJson) {
        server.expect(once(), requestTo(TOKEN_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.USER_AGENT, "autotests-ai-app"))
                .andExpect(header(HttpHeaders.ACCEPT, MediaType.APPLICATION_JSON_VALUE))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_FORM_URLENCODED))
                .andExpect(content().string(allOf(
                        containsString("grant_type=authorization_code"),
                        containsString("client_id=test-id"),
                        containsString("client_secret=test-secret"),
                        containsString("code=idp-code"),
                        containsString("redirect_uri="))))
                .andRespond(withSuccess(tokenJson, MediaType.APPLICATION_JSON));
    }

    private void expectTokenThenUser(String tokenJson, String userJson) {
        expectToken(tokenJson);
        server.expect(once(), requestTo(USERINFO_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer idp_secret"))
                .andRespond(withSuccess(userJson, MediaType.APPLICATION_JSON));
    }

    private static IdpOAuthProperties configuredProperties() {
        return new IdpOAuthProperties("test-id", "test-secret", TOKEN_URL, USERINFO_URL);
    }
}
