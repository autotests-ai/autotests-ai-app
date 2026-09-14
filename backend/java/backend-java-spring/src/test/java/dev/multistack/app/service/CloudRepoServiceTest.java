package dev.multistack.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.GithubCloudProperties;
import dev.multistack.app.config.IdpOAuthProperties;
import dev.multistack.app.dto.CloudRepoResponse;
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
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.http.HttpStatus.UNPROCESSABLE_ENTITY;
import static org.springframework.test.web.client.ExpectedCount.never;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.ExpectedCount.times;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@Epic("Dest cloud")
@Feature("CloudRepoService")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("CloudRepoService")
class CloudRepoServiceTest extends UnitTestBase {

    private static final String USERINFO_URL = "https://idp.example/userinfo";
    private static final String TOKEN_URL = "https://idp.example/token";
    private static final String REPOS_URL = "https://example.test/orgs/autotests-cloud/repos";
    private static final String REPO_API_BASE = "https://example.test/repos";
    private static final String E2E_STACK = "python-pytest";
    private static final String LOGIN = "qaguru";
    private static final String REPO = LOGIN + "-" + E2E_STACK;
    private static final String YAML = """
            destination: cloud
            coverageProfile:
              automation:
                e2e: { access: write, stack: python-pytest, module: tests/python }
            """;
    private static final String REPO_API_URL = REPO_API_BASE + "/autotests-cloud/" + REPO;
    private static final String HTML_URL = "https://github.com/autotests-cloud/" + REPO;
    private static final String IDP_TOKEN = "idp_secret";
    private static final String CLOUD_TOKEN = "ghs_cloud";

    private MockRestServiceServer server;
    private CloudRepoService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        IdpOAuthService idp = new IdpOAuthService(
                new IdpOAuthProperties("test-id", "test-secret", TOKEN_URL, USERINFO_URL),
                builder);
        service = new CloudRepoService(configuredCloud(), idp, builder);
    }

    @Test
    @DisplayName("creates the org repo and returns created true with the cloud URL")
    void createRepoWhenMissing() throws Exception {
        expectUserinfo("{\"preferred_username\":\"qaguru\"}");
        expectRepoLookup(404);
        expectRepoCreate(201);

        CloudRepoResponse response = service.createRepo(IDP_TOKEN, YAML);

        assertEquals(LOGIN, response.login());
        assertEquals(HTML_URL, response.url());
        assertTrue(response.created());
        String json = new ObjectMapper().writeValueAsString(response);
        assertFalse(json.contains(IDP_TOKEN));
        assertFalse(json.contains(CLOUD_TOKEN));
        assertFalse(json.contains("access_token"));
        assertFalse(json.contains("\"token\""));
        assertFalse(json.contains("pat"));
        assertFalse(json.contains("octocat"));
        assertFalse(json.contains("/user/repos"));
        server.verify();
    }

    @Test
    @DisplayName("returns the same URL as created true when the org repo already exists")
    void createRepoWhenAlreadyExists() throws Exception {
        expectUserinfo("{\"preferred_username\":\"qaguru\"}");
        expectRepoLookup(200);

        CloudRepoResponse response = service.createRepo(IDP_TOKEN, YAML);

        assertEquals(HTML_URL, response.url());
        assertTrue(response.created());
        server.verify();
    }

    @Test
    @DisplayName("treats GitHub 422 as already created")
    void createRepoWhenCreateConflicts() throws Exception {
        expectUserinfo("{\"preferred_username\":\"qaguru\"}");
        expectRepoLookup(404);
        expectRepoCreate(422);

        CloudRepoResponse response = service.createRepo(IDP_TOKEN, YAML);

        assertTrue(response.created());
        assertEquals(HTML_URL, response.url());
        server.verify();
    }

    @Test
    @DisplayName("treats GitHub create 200 as created true")
    void createRepoWhenCreateReturnsOk() throws Exception {
        expectUserinfo("{\"preferred_username\":\"qaguru\"}");
        expectRepoLookup(404);
        expectRepoCreate(200);

        assertTrue(service.createRepo(IDP_TOKEN, YAML).created());
        server.verify();
    }

    @Test
    @DisplayName("create is 503 without GitHub cloud env")
    void createRepoRequiresGithubEnv() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        IdpOAuthService idp = new IdpOAuthService(
                new IdpOAuthProperties("test-id", "test-secret", TOKEN_URL, USERINFO_URL),
                builder);
        CloudRepoService unconfigured = new CloudRepoService(
                new GithubCloudProperties("", REPOS_URL, REPO_API_BASE),
                idp,
                builder);
        server.expect(never(), requestTo(USERINFO_URL));
        server.expect(never(), requestTo(REPOS_URL));

        AuthException missing = assertThrows(
                AuthException.class, () -> unconfigured.createRepo(IDP_TOKEN, YAML));
        assertEquals(503, missing.getStatus());
        assertEquals("GitHub cloud is not configured", missing.getMessage());
        AuthException blank = assertThrows(
                AuthException.class, () -> unconfigured.createRepo(null, YAML));
        assertEquals(503, blank.getStatus());
        server.verify();
    }

    @Test
    @DisplayName("create is 401 without an IdP cookie")
    void createRepoRequiresCookie() {
        AuthException missing = assertThrows(AuthException.class, () -> service.createRepo(null, YAML));
        assertEquals(401, missing.getStatus());
        assertEquals("oauth cookie missing", missing.getMessage());
        AuthException blank = assertThrows(AuthException.class, () -> service.createRepo("  ", YAML));
        assertEquals("oauth cookie missing", blank.getMessage());
    }

    @Test
    @DisplayName("create is 400 without Home YAML and never a frozen stack")
    void createRepoRequiresYaml() {
        server.expect(times(3), requestTo(USERINFO_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + IDP_TOKEN))
                .andRespond(withSuccess("{\"preferred_username\":\"qaguru\"}", MediaType.APPLICATION_JSON));
        AuthException missing = assertThrows(AuthException.class, () -> service.createRepo(IDP_TOKEN, null));
        assertEquals(400, missing.getStatus());
        assertEquals("assemble yaml missing", missing.getMessage());
        AuthException blank = assertThrows(AuthException.class, () -> service.createRepo(IDP_TOKEN, "  "));
        assertEquals("assemble yaml missing", blank.getMessage());
        AuthException stack = assertThrows(
                AuthException.class, () -> service.createRepo(IDP_TOKEN, "destination: cloud\n"));
        assertEquals("assemble e2e.stack missing", stack.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("create rejects an unknown school login")
    void createRepoRejectsUnknownLogin() {
        expectUserinfo("{\"preferred_username\":\"unknown\"}");
        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo(IDP_TOKEN, YAML));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a down GitHub repo lookup to oauth create failed")
    void createRepoLookupNetworkError() {
        expectUserinfo("{\"preferred_username\":\"qaguru\"}");
        server.expect(once(), requestTo(REPO_API_URL))
                .andRespond(withException(new IOException("down")));

        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo(IDP_TOKEN, YAML));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth create failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a GitHub repo lookup 500 to oauth create failed")
    void createRepoLookupHttpError() {
        expectUserinfo("{\"preferred_username\":\"qaguru\"}");
        expectRepoLookup(500);

        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo(IDP_TOKEN, YAML));
        assertEquals("oauth create failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a down GitHub create endpoint to oauth create failed")
    void createRepoNetworkError() {
        expectUserinfo("{\"preferred_username\":\"qaguru\"}");
        expectRepoLookup(404);
        server.expect(once(), requestTo(REPOS_URL))
                .andRespond(withException(new IOException("down")));

        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo(IDP_TOKEN, YAML));
        assertEquals("oauth create failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a GitHub create 401 to oauth create failed")
    void createRepoHttpError() {
        expectUserinfo("{\"preferred_username\":\"qaguru\"}");
        expectRepoLookup(404);
        server.expect(once(), requestTo(REPOS_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(UNAUTHORIZED));

        AuthException ex = assertThrows(AuthException.class, () -> service.createRepo(IDP_TOKEN, YAML));
        assertEquals("oauth create failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("names the org repo {idp-login}-{e2e.stack}")
    void repoNameIsLoginDashStack() {
        assertEquals(REPO, CloudRepoService.repoName(LOGIN, E2E_STACK));
        assertEquals(HTML_URL, CloudRepoService.htmlUrl(LOGIN, E2E_STACK));
        assertFalse(CloudRepoService.htmlUrl(LOGIN, E2E_STACK).contains("octocat"));
        assertFalse(CloudRepoService.htmlUrl(LOGIN, E2E_STACK).contains("/user/"));
        assertFalse(CloudRepoService.htmlUrl("qaguru", E2E_STACK)
                .contains("java-junit5-rest_assured-selenide"));
    }

    private void expectUserinfo(String userJson) {
        server.expect(once(), requestTo(USERINFO_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + IDP_TOKEN))
                .andExpect(header(HttpHeaders.AUTHORIZATION, not(containsString(CLOUD_TOKEN))))
                .andRespond(withSuccess(userJson, MediaType.APPLICATION_JSON));
    }

    private void expectRepoLookup(int status) {
        var expect = server.expect(once(), requestTo(REPO_API_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + CLOUD_TOKEN))
                .andExpect(header(HttpHeaders.AUTHORIZATION, not(containsString(IDP_TOKEN))));
        if (status == 200) {
            expect.andRespond(withSuccess("{\"name\":\"" + REPO + "\"}", MediaType.APPLICATION_JSON));
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
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + CLOUD_TOKEN))
                .andExpect(header(HttpHeaders.AUTHORIZATION, not(containsString(IDP_TOKEN))))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(allOf(
                        containsString("\"" + REPO + "\""),
                        containsString("\"private\":false"),
                        containsString("\"auto_init\":false"))))
                .andExpect(content().string(not(containsString("\"python-pytest\""))))
                .andExpect(content().string(not(containsString(IDP_TOKEN))))
                .andExpect(content().string(not(containsString("pat"))));
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

    private static GithubCloudProperties configuredCloud() {
        return new GithubCloudProperties(CLOUD_TOKEN, REPOS_URL, REPO_API_BASE);
    }
}
