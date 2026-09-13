package dev.multistack.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.GithubOAuthProperties;
import dev.multistack.app.dto.GithubOAuthLoginResponse;
import dev.multistack.app.dto.GithubOAuthRepoResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.dto.GithubOAuthSession;
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
import org.springframework.http.ResponseCookie;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.ExpectedCount.times;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@Epic("GitHub OAuth")
@Feature("GithubOAuthService")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("GithubOAuthService")
class GithubOAuthServiceTest extends UnitTestBase {

    private static final String TOKEN_URL = "https://example.test/login/oauth/access_token";
    private static final String USER_URL = "https://example.test/user";
    private static final String REPOS_URL = "https://example.test/user/repos";
    private static final String REPO_API_BASE = "https://example.test/repos";
    private static final String E2E_STACK = "python-pytest";
    private static final String YAML = """
            destination: zip
            coverageProfile:
              automation:
                e2e: { access: write, stack: python-pytest, module: tests/python }
            """;
    private static final String REPO_API_URL = REPO_API_BASE + "/octocat/" + E2E_STACK;
    private static final String HTML_URL = "https://github.com/octocat/" + E2E_STACK;
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
                "{\"access_token\":\"gho_secret\",\"token_type\":\"bearer\",\"scope\":\"public_repo\"}",
                "{\"login\":\"octocat\",\"id\":1,\"token\":\"should-ignore\"}");

        GithubOAuthSession session = service.exchange(REQUEST);

        assertEquals("octocat", session.login());
        assertEquals("gho_secret", session.accessToken());
        String json = new ObjectMapper().writeValueAsString(new GithubOAuthLoginResponse(session.login()));
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
                new GithubOAuthProperties("", "secret", TOKEN_URL, USER_URL, REPOS_URL, REPO_API_BASE),
                builder);

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
        assertEquals(HTML_URL, GithubOAuthService.htmlUrl("octocat", E2E_STACK));
        assertFalse(GithubOAuthService.htmlUrl("octocat", E2E_STACK).contains("unknown"));
        assertFalse(GithubOAuthService.htmlUrl("octocat", E2E_STACK).contains("autotests-cloud"));
        assertFalse(GithubOAuthService.htmlUrl("octocat", E2E_STACK)
                .contains("java-junit5-rest_assured-selenide"));
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

    @Test
    @DisplayName("creates a public repo and returns created true with the user URL")
    void createRepoWhenMissing() throws Exception {
        expectUser("{\"login\":\"octocat\"}");
        expectRepoLookup(404);
        expectRepoCreate(201);

        GithubOAuthRepoResponse response = service.createRepo("gho_secret", YAML);

        assertEquals("octocat", response.login());
        assertEquals(HTML_URL, response.url());
        assertTrue(response.created());
        String json = new ObjectMapper().writeValueAsString(response);
        assertFalse(json.contains("gho_secret"));
        assertFalse(json.contains("access_token"));
        assertFalse(json.contains("\"token\""));
        assertFalse(json.contains("pat"));
        assertFalse(json.contains("autotests-cloud"));
        server.verify();
    }

    @Test
    @DisplayName("returns the same URL as created true when the repo already exists")
    void createRepoWhenAlreadyExists() throws Exception {
        expectUser("{\"login\":\"octocat\"}");
        expectRepoLookup(200);

        GithubOAuthRepoResponse response = service.createRepo("gho_secret", YAML);

        assertEquals(HTML_URL, response.url());
        assertTrue(response.created());
        server.verify();
    }

    @Test
    @DisplayName("treats GitHub 422 as already created")
    void createRepoWhenCreateConflicts() throws Exception {
        expectUser("{\"login\":\"octocat\"}");
        expectRepoLookup(404);
        expectRepoCreate(422);

        GithubOAuthRepoResponse response = service.createRepo("gho_secret", YAML);

        assertTrue(response.created());
        assertEquals(HTML_URL, response.url());
        server.verify();
    }

    @Test
    @DisplayName("treats GitHub create 200 as created true")
    void createRepoWhenCreateReturnsOk() throws Exception {
        expectUser("{\"login\":\"octocat\"}");
        expectRepoLookup(404);
        expectRepoCreate(200);

        assertTrue(service.createRepo("gho_secret", YAML).created());
        server.verify();
    }

    @Test
    @DisplayName("create is 401 without a cookie token")
    void createRepoRequiresToken() {
        AuthException missing = assertThrows(AuthException.class, () -> service.createRepo(null, YAML));
        assertEquals(401, missing.getStatus());
        assertEquals("oauth cookie missing", missing.getMessage());
        AuthException blank = assertThrows(AuthException.class, () -> service.createRepo("  ", YAML));
        assertEquals("oauth cookie missing", blank.getMessage());
    }

    @Test
    @DisplayName("create is 400 without Home YAML and never a frozen stack")
    void createRepoRequiresYaml() {
        server.expect(times(3), requestTo(USER_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer gho_secret"))
                .andRespond(withSuccess("{\"login\":\"octocat\"}", MediaType.APPLICATION_JSON));
        AuthException missing = assertThrows(AuthException.class, () -> service.createRepo("gho_secret", null));
        assertEquals(400, missing.getStatus());
        assertEquals("assemble yaml missing", missing.getMessage());
        AuthException blank = assertThrows(AuthException.class, () -> service.createRepo("gho_secret", "  "));
        assertEquals("assemble yaml missing", blank.getMessage());
        AuthException stack = assertThrows(
                AuthException.class, () -> service.createRepo("gho_secret", "destination: zip\n"));
        assertEquals("assemble e2e.stack missing", stack.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("create rejects an unknown GitHub login")
    void createRepoRejectsUnknownLogin() {
        expectUser("{\"login\":\"unknown\"}");
        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo("gho_secret", YAML));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a down GitHub repo lookup to oauth create failed")
    void createRepoLookupNetworkError() {
        expectUser("{\"login\":\"octocat\"}");
        server.expect(once(), requestTo(REPO_API_URL))
                .andRespond(withException(new IOException("down")));

        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo("gho_secret", YAML));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth create failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a GitHub repo lookup 500 to oauth create failed")
    void createRepoLookupHttpError() {
        expectUser("{\"login\":\"octocat\"}");
        expectRepoLookup(500);

        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo("gho_secret", YAML));
        assertEquals("oauth create failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a down GitHub create endpoint to oauth create failed")
    void createRepoNetworkError() {
        expectUser("{\"login\":\"octocat\"}");
        expectRepoLookup(404);
        server.expect(once(), requestTo(REPOS_URL))
                .andRespond(withException(new IOException("down")));

        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo("gho_secret", YAML));
        assertEquals("oauth create failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a GitHub create 401 to oauth create failed")
    void createRepoHttpError() {
        expectUser("{\"login\":\"octocat\"}");
        expectRepoLookup(404);
        server.expect(once(), requestTo(REPOS_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(UNAUTHORIZED));

        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo("gho_secret", YAML));
        assertEquals("oauth create failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("builds an httpOnly Lax cookie and optional Secure flag")
    void toCookieIsHttpOnly() {
        ResponseCookie http = service.toCookie("gho_secret", false);
        assertEquals(GithubOAuthService.COOKIE_NAME, http.getName());
        assertEquals("gho_secret", http.getValue());
        assertTrue(http.isHttpOnly());
        assertFalse(http.isSecure());
        assertEquals("Lax", http.getSameSite());
        assertEquals(GithubOAuthService.COOKIE_PATH, http.getPath());
        assertFalse(http.toString().contains("access_token"));

        ResponseCookie https = service.toCookie("gho_secret", true);
        assertTrue(https.isSecure());
        assertTrue(https.isHttpOnly());
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

    private void expectUser(String userJson) {
        server.expect(once(), requestTo(USER_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer gho_secret"))
                .andRespond(withSuccess(userJson, MediaType.APPLICATION_JSON));
    }

    private void expectRepoLookup(int status) {
        var expect = server.expect(once(), requestTo(REPO_API_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer gho_secret"));
        if (status == 200) {
            expect.andRespond(withSuccess("{\"name\":\"" + E2E_STACK + "\"}",
                    MediaType.APPLICATION_JSON));
            return;
        }
        if (status == 404) {
            expect.andRespond(withStatus(org.springframework.http.HttpStatus.NOT_FOUND));
            return;
        }
        expect.andRespond(withStatus(INTERNAL_SERVER_ERROR));
    }

    private void expectRepoCreate(int status) {
        var expect = server.expect(once(), requestTo(REPOS_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer gho_secret"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(allOf(
                        containsString("\"" + E2E_STACK + "\""),
                        containsString("\"private\":false"),
                        containsString("\"auto_init\":false"))));
        if (status == 201) {
            expect.andRespond(withStatus(org.springframework.http.HttpStatus.CREATED)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"html_url\":\"" + HTML_URL + "\"}"));
            return;
        }
        if (status == 200) {
            expect.andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
            return;
        }
        if (status == 422) {
            expect.andRespond(withStatus(UNPROCESSABLE_ENTITY)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{\"message\":\"Validation Failed\"}"));
            return;
        }
        expect.andRespond(withStatus(UNAUTHORIZED));
    }

    private static GithubOAuthProperties configuredProperties() {
        return new GithubOAuthProperties(
                "test-id", "test-secret", TOKEN_URL, USER_URL, REPOS_URL, REPO_API_BASE);
    }
}
