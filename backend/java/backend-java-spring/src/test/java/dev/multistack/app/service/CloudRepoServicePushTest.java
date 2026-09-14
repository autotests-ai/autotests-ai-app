package dev.multistack.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.AssembleProperties;
import dev.multistack.app.config.GithubCloudProperties;
import dev.multistack.app.config.IdpOAuthProperties;
import dev.multistack.app.dto.CloudRepoPushResponse;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.util.List;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR;
import static org.springframework.http.HttpStatus.UNAUTHORIZED;
import static org.springframework.test.web.client.ExpectedCount.never;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@Epic("Dest cloud")
@Feature("CloudRepoService.pushTree")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("CloudRepoService.pushTree")
class CloudRepoServicePushTest extends UnitTestBase {

    private static final String USERINFO_URL = "https://idp.example/userinfo";
    private static final String TOKEN_URL = "https://idp.example/token";
    private static final String REPOS_URL = "https://example.test/orgs/autotests-cloud/repos";
    private static final String REPO_API_BASE = "https://example.test/repos";
    private static final String E2E_STACK = "python-pytest";
    private static final String LOGIN = "qaguru";
    private static final String REPO = LOGIN + "-" + E2E_STACK;
    private static final String YAML = """
            destination: zip
            coverageProfile:
              automation:
                e2e: { access: write, stack: python-pytest, module: tests/python }
            """;
    private static final String ADOPT_YAML = """
            destination: zip
            adoptDest: generated-projects/adopt-intern-flat
            coverageProfile:
              automation:
                e2e: { access: write, stack: python-pytest, module: tests/python }
            """;
    private static final String REPO_API_URL = REPO_API_BASE + "/autotests-cloud/" + REPO;
    private static final String HTML_URL = "https://github.com/autotests-cloud/" + REPO;
    private static final String TREE_URL = REPO_API_URL + "/git/trees";
    private static final String COMMITS_URL = REPO_API_URL + "/git/commits";
    private static final String REF_URL = REPO_API_URL + "/git/ref/heads/main";
    private static final String REFS_URL = REPO_API_URL + "/git/refs";
    private static final String HEADS_URL = REPO_API_URL + "/git/refs/heads/main";
    private static final String PARENT_SHA = "abc111";
    private static final String PARENT_COMMIT_URL = COMMITS_URL + "/" + PARENT_SHA;
    private static final String TREE_SHA = "def222";
    private static final String OTHER_TREE_SHA = "ghi333";
    private static final String COMMIT_SHA = "jkl444";
    private static final String IDP_TOKEN = "idp_secret";
    private static final String CLOUD_TOKEN = "ghs_cloud";
    private static final AssembleTree TREE = new AssembleTree(AssembleZipFixture.cellZip());

    private MockRestServiceServer server;
    private CloudRepoService service;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        service = new CloudRepoService(configuredCloud(), idp(builder), TREE, builder);
    }

    @Test
    @DisplayName("pushes the assemble tree onto an empty org repo and never serializes the token")
    void pushTreeOnEmptyRepo() throws Exception {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, false);
        expectCreateRef(201, COMMIT_SHA);

        CloudRepoPushResponse response = service.pushTree(IDP_TOKEN, YAML);

        assertEquals(LOGIN, response.login());
        assertEquals(HTML_URL, response.url());
        assertTrue(response.pushed());
        String json = new ObjectMapper().writeValueAsString(response);
        assertEquals("{\"login\":\"qaguru\",\"url\":\"" + HTML_URL + "\",\"pushed\":true}", json);
        assertFalse(json.contains(IDP_TOKEN));
        assertFalse(json.contains(CLOUD_TOKEN));
        assertFalse(json.contains("access_token"));
        assertFalse(json.contains("\"token\""));
        assertFalse(json.contains("pat"));
        assertFalse(json.contains("octocat"));
        assertFalse(json.contains("/user/"));
        server.verify();
    }

    @Test
    @DisplayName("treats GitHub tree 200 and ref 200 as pushed true")
    void pushTreeWhenCreateReturnsOk() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTree(200, TREE_SHA);
        expectCreateCommit(200, COMMIT_SHA, TREE_SHA, false);
        expectCreateRef(200, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("overwrites main when the existing tree differs")
    void pushTreeOverwritesDifferentTree() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(200, "{\"tree\":{\"sha\":\"" + OTHER_TREE_SHA + "\"}}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, true);
        expectPatchRef(200, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("treats GitHub patch 201 as pushed true")
    void pushTreeWhenPatchReturnsCreated() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(200, "{\"tree\":{\"sha\":\"" + OTHER_TREE_SHA + "\"}}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, true);
        expectPatchRef(201, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("skips a new commit when GitHub already has the same tree")
    void pushTreeIdempotentSameTree() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(200, "{\"tree\":{\"sha\":\"" + TREE_SHA + "\"}}");
        expectCreateTree(201, TREE_SHA);

        CloudRepoPushResponse response = service.pushTree(IDP_TOKEN, YAML);
        assertTrue(response.pushed());
        assertEquals(HTML_URL, response.url());
        server.verify();
    }

    @Test
    @DisplayName("creates main when the ref payload has no commit sha")
    void pushTreeWhenRefHasNoSha() {
        expectUserinfo();
        expectGitRefBody("{\"object\":{}}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, false);
        expectCreateRef(201, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("creates main when the ref object is missing")
    void pushTreeWhenRefObjectMissing() {
        expectUserinfo();
        expectGitRefBody("{}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, false);
        expectCreateRef(201, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("creates main when the ref body is null JSON")
    void pushTreeWhenRefBodyNull() {
        expectUserinfo();
        expectGitRefBody("null");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, false);
        expectCreateRef(201, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("creates main when the ref sha is blank")
    void pushTreeWhenRefShaBlank() {
        expectUserinfo();
        expectGitRefBody("{\"object\":{\"sha\":\"  \"}}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, false);
        expectCreateRef(201, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("still commits when the existing commit has no tree sha")
    void pushTreeWhenCommitTreeMissing() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(200, "{}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, true);
        expectPatchRef(200, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("still commits when the existing commit body is null JSON")
    void pushTreeWhenCommitBodyNull() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(200, "null");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, true);
        expectPatchRef(200, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("still commits when the existing tree object has no sha")
    void pushTreeWhenCommitTreeShaMissing() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(200, "{\"tree\":{}}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, true);
        expectPatchRef(200, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("still commits when the existing tree sha is blank")
    void pushTreeWhenCommitTreeShaBlank() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(200, "{\"tree\":{\"sha\":\"  \"}}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, true);
        expectPatchRef(200, COMMIT_SHA);

        assertTrue(service.pushTree(IDP_TOKEN, YAML).pushed());
        server.verify();
    }

    @Test
    @DisplayName("push is 503 without GitHub cloud env")
    void pushTreeRequiresGithubEnv() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        CloudRepoService unconfigured = new CloudRepoService(
                new GithubCloudProperties("", REPOS_URL, REPO_API_BASE),
                idp(builder),
                TREE,
                builder);
        server.expect(never(), requestTo(USERINFO_URL));
        server.expect(never(), requestTo(TREE_URL));

        AuthException missing = assertThrows(
                AuthException.class, () -> unconfigured.pushTree(IDP_TOKEN, YAML));
        assertEquals(503, missing.getStatus());
        assertEquals("GitHub cloud is not configured", missing.getMessage());
        AuthException blank = assertThrows(
                AuthException.class, () -> unconfigured.pushTree(null, YAML));
        assertEquals(503, blank.getStatus());
        server.verify();
    }

    @Test
    @DisplayName("push is 401 without an IdP cookie")
    void pushTreeRequiresToken() {
        AuthException missing = assertThrows(AuthException.class, () -> service.pushTree(null, YAML));
        assertEquals(401, missing.getStatus());
        assertEquals("oauth cookie missing", missing.getMessage());
        AuthException blank = assertThrows(AuthException.class, () -> service.pushTree("  ", YAML));
        assertEquals("oauth cookie missing", blank.getMessage());
    }

    @Test
    @DisplayName("push rejects an unknown school login")
    void pushTreeRejectsUnknownLogin() {
        expectUserinfoJson("{\"preferred_username\":\"unknown\"}");
        AuthException ex = assertThrows(AuthException.class, () -> service.pushTree(IDP_TOKEN, YAML));
        assertEquals("oauth login missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("push is 503 without ASSEMBLE_URL and never a classpath stub")
    void pushTreeRequiresAssembleUrl() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        CloudRepoService missing = new CloudRepoService(
                configuredCloud(),
                idp(builder),
                new AssembleTree(new AssembleProperties(""), builder),
                builder);
        expectUserinfoJson("{\"preferred_username\":\"qaguru\"}");
        AuthException ex = assertThrows(
                AuthException.class, () -> missing.pushTree(IDP_TOKEN, YAML));
        assertEquals(503, ex.getStatus());
        assertEquals("assemble url missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("push with adoptDest is 401 without an IdP cookie")
    void pushTreeAdoptDestRequiresToken() {
        AuthException missing = assertThrows(AuthException.class, () -> service.pushTree(null, ADOPT_YAML));
        assertEquals(401, missing.getStatus());
        assertEquals("oauth cookie missing", missing.getMessage());
    }

    @Test
    @DisplayName("push with adoptDest is 503 without ADOPT_URL, not assemble")
    void pushTreeAdoptDestRequiresAdoptUrl() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        CloudRepoService missing = new CloudRepoService(
                configuredCloud(),
                idp(builder),
                new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder),
                builder);
        expectUserinfoJson("{\"preferred_username\":\"qaguru\"}");
        AuthException ex = assertThrows(
                AuthException.class, () -> missing.pushTree(IDP_TOKEN, ADOPT_YAML));
        assertEquals(503, ex.getStatus());
        assertEquals("adopt url missing", ex.getMessage());
        assertFalse(ex.getMessage().contains("assemble"));
        server.verify();
    }

    @Test
    @DisplayName("push is 400 without Home YAML and never a classpath stub")
    void pushTreeRequiresYaml() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        CloudRepoService live = new CloudRepoService(
                configuredCloud(),
                idp(builder),
                new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder),
                builder);
        expectUserinfoJson("{\"preferred_username\":\"qaguru\"}");
        AuthException ex = assertThrows(AuthException.class, () -> live.pushTree(IDP_TOKEN, "  "));
        assertEquals(400, ex.getStatus());
        assertEquals("assemble yaml missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("push fails closed when the assemble tree is empty")
    void pushTreeRequiresBlobs() {
        RestClient.Builder builder = RestClient.builder();
        server = MockRestServiceServer.bindTo(builder).build();
        CloudRepoService empty = new CloudRepoService(
                configuredCloud(), idp(builder), new AssembleTree(List.of()), builder);
        expectUserinfoJson("{\"preferred_username\":\"qaguru\"}");
        AuthException ex = assertThrows(AuthException.class, () -> empty.pushTree(IDP_TOKEN, YAML));
        assertEquals("oauth push failed", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps a down GitHub ref lookup to oauth push failed")
    void pushTreeRefNetworkError() {
        expectUserinfo();
        server.expect(once(), requestTo(REF_URL))
                .andRespond(withException(new IOException("down")));
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a GitHub ref lookup 500 to oauth push failed")
    void pushTreeRefHttpError() {
        expectUserinfo();
        expectGitRef(500, null);
        assertPushFailed();
    }

    @Test
    @DisplayName("maps an unreadable GitHub ref body to oauth push failed")
    void pushTreeRefNotJson() {
        expectUserinfo();
        expectGitRefBody("not-json");
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a down GitHub commit lookup to oauth push failed")
    void pushTreeCommitNetworkError() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        server.expect(once(), requestTo(PARENT_COMMIT_URL))
                .andRespond(withException(new IOException("down")));
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a GitHub commit lookup 500 to oauth push failed")
    void pushTreeCommitHttpError() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(500, "{}");
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a down GitHub tree endpoint to oauth push failed")
    void pushTreeCreateTreeNetworkError() {
        expectUserinfo();
        expectGitRef(404, null);
        server.expect(once(), requestTo(TREE_URL))
                .andRespond(withException(new IOException("down")));
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a GitHub tree 401 to oauth push failed")
    void pushTreeCreateTreeHttpError() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTree(401, TREE_SHA);
        assertPushFailed();
    }

    @Test
    @DisplayName("rejects a tree payload without sha")
    void pushTreeCreateTreeMissingSha() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTreeBody(201, "{}");
        assertPushFailed();
    }

    @Test
    @DisplayName("rejects a null tree JSON body")
    void pushTreeCreateTreeNullBody() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTreeBody(201, "null");
        assertPushFailed();
    }

    @Test
    @DisplayName("rejects a blank tree sha")
    void pushTreeCreateTreeBlankSha() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTreeBody(200, "{\"sha\":\"  \"}");
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a down GitHub commit create to oauth push failed")
    void pushTreeCreateCommitNetworkError() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTree(201, TREE_SHA);
        server.expect(once(), requestTo(COMMITS_URL))
                .andRespond(withException(new IOException("down")));
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a GitHub commit create 401 to oauth push failed")
    void pushTreeCreateCommitHttpError() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTree(201, TREE_SHA);
        server.expect(once(), requestTo(COMMITS_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(UNAUTHORIZED));
        assertPushFailed();
    }

    @Test
    @DisplayName("rejects a commit payload without sha")
    void pushTreeCreateCommitMissingSha() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTree(201, TREE_SHA);
        server.expect(once(), requestTo(COMMITS_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(HttpStatus.CREATED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{}"));
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a down GitHub create-ref to oauth push failed")
    void pushTreeCreateRefNetworkError() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, false);
        server.expect(once(), requestTo(REFS_URL))
                .andRespond(withException(new IOException("down")));
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a GitHub create-ref 401 to oauth push failed")
    void pushTreeCreateRefHttpError() {
        expectUserinfo();
        expectGitRef(404, null);
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, false);
        server.expect(once(), requestTo(REFS_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withStatus(UNAUTHORIZED));
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a down GitHub patch-ref to oauth push failed")
    void pushTreePatchRefNetworkError() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(200, "{\"tree\":{\"sha\":\"" + OTHER_TREE_SHA + "\"}}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, true);
        server.expect(once(), requestTo(HEADS_URL))
                .andRespond(withException(new IOException("down")));
        assertPushFailed();
    }

    @Test
    @DisplayName("maps a GitHub patch-ref 401 to oauth push failed")
    void pushTreePatchRefHttpError() {
        expectUserinfo();
        expectGitRef(200, PARENT_SHA);
        expectGitCommit(200, "{\"tree\":{\"sha\":\"" + OTHER_TREE_SHA + "\"}}");
        expectCreateTree(201, TREE_SHA);
        expectCreateCommit(201, COMMIT_SHA, TREE_SHA, true);
        server.expect(once(), requestTo(HEADS_URL))
                .andExpect(method(HttpMethod.PATCH))
                .andRespond(withStatus(UNAUTHORIZED));
        assertPushFailed();
    }

    private void assertPushFailed() {
        AuthException ex = assertThrows(AuthException.class, () -> service.pushTree(IDP_TOKEN, YAML));
        assertEquals(401, ex.getStatus());
        assertEquals("oauth push failed", ex.getMessage());
        server.verify();
    }

    private void expectUserinfo() {
        expectUserinfoJson("{\"preferred_username\":\"qaguru\"}");
    }

    private void expectUserinfoJson(String userJson) {
        server.expect(once(), requestTo(USERINFO_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + IDP_TOKEN))
                .andExpect(header(HttpHeaders.AUTHORIZATION, not(containsString(CLOUD_TOKEN))))
                .andRespond(withSuccess(userJson, MediaType.APPLICATION_JSON));
    }

    private void expectGitRef(int status, String sha) {
        var expect = server.expect(once(), requestTo(REF_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + CLOUD_TOKEN))
                .andExpect(header(HttpHeaders.AUTHORIZATION, not(containsString(IDP_TOKEN))));
        if (status == 200) {
            expect.andRespond(withSuccess(
                    "{\"object\":{\"sha\":\"" + sha + "\",\"type\":\"commit\"}}",
                    MediaType.APPLICATION_JSON));
            return;
        }
        if (status == 404) {
            expect.andRespond(withStatus(HttpStatus.NOT_FOUND));
            return;
        }
        expect.andRespond(withStatus(INTERNAL_SERVER_ERROR));
    }

    private void expectGitRefBody(String body) {
        server.expect(once(), requestTo(REF_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + CLOUD_TOKEN))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    private void expectGitCommit(int status, String body) {
        var expect = server.expect(once(), requestTo(PARENT_COMMIT_URL))
                .andExpect(method(HttpMethod.GET))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + CLOUD_TOKEN));
        if (status == 200) {
            expect.andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
            return;
        }
        expect.andRespond(withStatus(INTERNAL_SERVER_ERROR));
    }

    private void expectCreateTree(int status, String sha) {
        expectCreateTreeBody(status, "{\"sha\":\"" + sha + "\"}");
    }

    private void expectCreateTreeBody(int status, String body) {
        var expect = server.expect(once(), requestTo(TREE_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + CLOUD_TOKEN))
                .andExpect(header(HttpHeaders.AUTHORIZATION, not(containsString(IDP_TOKEN))))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(allOf(
                        containsString("README.md"),
                        containsString("assemble"),
                        containsString("backend/"),
                        containsString("frontend/"),
                        containsString("tests/"),
                        containsString("_contract/"),
                        containsString("\"type\":\"blob\""),
                        containsString("\"mode\":\"100644\""),
                        not(containsString(IDP_TOKEN)),
                        not(containsString("octocat")),
                        not(containsString("node_modules")),
                        not(containsString("qa-homework-check")))));
        if (status == 201) {
            expect.andRespond(withStatus(HttpStatus.CREATED)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body));
            return;
        }
        if (status == 200) {
            expect.andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
            return;
        }
        expect.andRespond(withStatus(UNAUTHORIZED));
    }

    private void expectCreateCommit(int status, String commitSha, String treeSha, boolean hasParent) {
        var expect = server.expect(once(), requestTo(COMMITS_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + CLOUD_TOKEN))
                .andExpect(content().string(allOf(
                        containsString("Assemble " + REPO),
                        containsString(treeSha),
                        hasParent ? containsString(PARENT_SHA) : not(containsString("parents")))));
        String body = "{\"sha\":\"" + commitSha + "\"}";
        if (status == 201) {
            expect.andRespond(withStatus(HttpStatus.CREATED)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body));
            return;
        }
        expect.andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    private void expectCreateRef(int status, String commitSha) {
        var expect = server.expect(once(), requestTo(REFS_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + CLOUD_TOKEN))
                .andExpect(content().string(allOf(
                        containsString("refs/heads/main"),
                        containsString(commitSha))));
        if (status == 201) {
            expect.andRespond(withStatus(HttpStatus.CREATED)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{}"));
            return;
        }
        expect.andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
    }

    private void expectPatchRef(int status, String commitSha) {
        var expect = server.expect(once(), requestTo(HEADS_URL))
                .andExpect(method(HttpMethod.PATCH))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer " + CLOUD_TOKEN))
                .andExpect(content().string(containsString(commitSha)));
        if (status == 201) {
            expect.andRespond(withStatus(HttpStatus.CREATED)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body("{}"));
            return;
        }
        expect.andRespond(withSuccess("{}", MediaType.APPLICATION_JSON));
    }

    private static IdpOAuthService idp(RestClient.Builder builder) {
        return new IdpOAuthService(
                new IdpOAuthProperties("test-id", "test-secret", TOKEN_URL, USERINFO_URL),
                builder);
    }

    private static GithubCloudProperties configuredCloud() {
        return new GithubCloudProperties(CLOUD_TOKEN, REPOS_URL, REPO_API_BASE);
    }
}
