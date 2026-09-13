package dev.multistack.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.GithubOAuthProperties;
import dev.multistack.app.dto.GithubOAuthLoginResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
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
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Epic("GitHub OAuth")
@Feature("GithubOAuthService")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("GithubOAuthService")
class GithubOAuthServiceTest extends UnitTestBase {

    private static final String TOKEN_URL = "https://example.test/login/oauth/access_token";
    private static final String USER_URL = "https://example.test/user";
    private static final GithubOAuthRequest REQUEST = new GithubOAuthRequest("gh-code", "csrf");

    private MockRestServiceServer server;
    private GithubOAuthService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new GithubOAuthService(configuredProperties(), builder);
    }

    @Test
    @DisplayName("exchanges code for login and never serializes the GitHub token")
    void exchangeReturnsLoginWithoutToken() throws Exception {
        expectTokenThenUser(
                "{\"access_token\":\"gho_secret\",\"token_type\":\"bearer\",\"scope\":\"read:user\"}",
                "{\"login\":\"octocat\",\"id\":1,\"token\":\"should-ignore\"}");

        GithubOAuthLoginResponse response = service.exchange(REQUEST);

        assertEquals("octocat", response.login());
        String json = new ObjectMapper().writeValueAsString(response);
        assertEquals("{\"login\":\"octocat\"}", json);
        assertFalse(json.contains("gho_secret"));
        assertFalse(json.contains("access_token"));
        assertFalse(json.contains("test-secret"));
        server.verify();
    }

    @Test
    @DisplayName("is 503 when the OAuth App is not configured")
    void exchangeRequiresSecret() {
        RestClient.Builder builder = RestClient.builder();
        GithubOAuthService unconfigured = new GithubOAuthService(
                new GithubOAuthProperties("", "secret", TOKEN_URL, USER_URL), builder);

        AuthException ex = assertThrows(AuthException.class, () -> unconfigured.exchange(REQUEST));
        assertEquals(503, ex.getStatus());
        assertEquals("GitHub OAuth is not configured", ex.getMessage());
    }

    @Test
    @DisplayName("maps GitHub token HTTP errors to oauth exchange failed")
    void tokenHttpError() {
        server.expect(once(), requestTo(TOKEN_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"error\":\"bad_verification_code\"}"));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a down GitHub token endpoint to oauth exchange failed")
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
                .andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));

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
    @DisplayName("rejects a null GitHub user body")
    void userPayloadNullBody() {
        expectTokenThenUser("{\"access_token\":\"gho_secret\"}", "null");

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps GitHub user HTTP errors to oauth exchange failed")
    void userHttpError() {
        expectToken("{\"access_token\":\"gho_secret\"}");
        server.expect(once(), requestTo(USER_URL))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withStatus(UNAUTHORIZED));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a down GitHub user endpoint to oauth exchange failed")
    void userNetworkError() {
        expectToken("{\"access_token\":\"gho_secret\"}");
        server.expect(once(), requestTo(USER_URL))
                .andRespond(withException(new IOException("down")));

        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth exchange failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects missing, unknown, and invented GitHub logins")
    void loginValidation() {
        assertFalse(GithubOAuthService.isGithubLogin(null));
        assertFalse(GithubOAuthService.isGithubLogin("unknown"));
        assertFalse(GithubOAuthService.isGithubLogin("Unknown"));
        assertFalse(GithubOAuthService.isGithubLogin(""));
        assertFalse(GithubOAuthService.isGithubLogin("-octo"));
        assertTrue(GithubOAuthService.isGithubLogin("octocat"));
        assertTrue(GithubOAuthService.isGithubLogin("a"));
    }

    @Test
    @DisplayName("rejects a user payload without login")
    void userPayloadMissingLogin() {
        expectTokenThenUser("{\"access_token\":\"gho_secret\"}", "{}");
        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects GitHub login unknown")
    void userPayloadUnknownLogin() {
        expectTokenThenUser("{\"access_token\":\"gho_secret\"}", "{\"login\":\"unknown\"}");
        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects an invented GitHub login")
    void userPayloadInventedLogin() {
        expectTokenThenUser("{\"access_token\":\"gho_secret\"}", "{\"login\":\"octo_cat\"}");
        AuthException ex = assertThrows(AuthException.class, () -> service.exchange(REQUEST));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("rejects a blank GitHub login")
    void userPayloadBlankLogin() {
        expectTokenThenUser("{\"access_token\":\"gho_secret\"}", "{\"login\":\"\"}");
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
                        containsString("client_id=test-id"),
                        containsString("client_secret=test-secret"),
                        containsString("code=gh-code"))))
                .andRespond(withSuccess(tokenJson, MediaType.APPLICATION_JSON));
    }

    private void expectTokenThenUser(String tokenJson, String userJson) {
        expectToken(tokenJson);
        server.expect(once(), requestTo(USER_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer gho_secret"))
                .andRespond(withSuccess(userJson, MediaType.APPLICATION_JSON));
    }

    private static GithubOAuthProperties configuredProperties() {
        return new GithubOAuthProperties("test-id", "test-secret", TOKEN_URL, USER_URL);
    }
}
