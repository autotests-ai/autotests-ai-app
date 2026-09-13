package dev.multistack.app.service;

import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.AssembleProperties;
import dev.multistack.app.dto.GithubTreeBlob;
import dev.multistack.app.exception.AuthException;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@Epic("GitHub OAuth")
@Feature("AssembleTree")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("AssembleTree")
class AssembleTreeTest extends UnitTestBase {

    private static final String ASSEMBLE_URL = "http://127.0.0.1:3032/assemble";
    private static final String YAML = "destination: zip\n";

    @Test
    @DisplayName("unzips dest-zip roots and harness, not the three-file classpath stub")
    void fromZipLoadsCellRoots() {
        List<GithubTreeBlob> blobs = AssembleTree.fromZip(AssembleZipFixture.cellZip());
        List<String> paths = blobs.stream().map(GithubTreeBlob::path).toList();
        assertTrue(paths.contains("README.md"));
        assertTrue(paths.contains(".gitignore"));
        assertTrue(paths.contains("backend/java/backend-java-spring/README.md"));
        assertTrue(paths.contains("frontend/typescript/frontend-typescript-react/package.json"));
        assertTrue(paths.contains("tests/java/tests-java-junit5-rest_assured-selenide/README.md"));
        assertTrue(paths.contains("_contract/openapi.yaml"));
        assertTrue(paths.contains("docs/agent-skills/rag/po-fluent.md"));
        assertEquals(7, paths.size());
        assertFalse(paths.stream().anyMatch(path -> path.contains("node_modules")));
        assertFalse(paths.stream().anyMatch(path -> path.contains("/build/")));
        assertFalse(paths.stream().anyMatch(path -> path.contains("hw-check")));
        assertFalse(paths.stream().anyMatch(path -> path.contains("homework-check")));
        assertFalse(paths.contains("frontend/icon.png"));
        assertFalse(paths.contains(".DS_Store"));
        assertEquals(List.of(
                new GithubTreeBlob("README.md", "assemble\n")),
                new AssembleTree(List.of(new GithubTreeBlob("README.md", "assemble\n"))).blobs());
        String blob = blobs.toString().toLowerCase();
        assertTrue(!blob.contains("ghp_"));
        assertTrue(!blob.contains("gho_"));
        assertTrue(new AssembleTree(AssembleZipFixture.cellZip()).blobs().stream()
                .anyMatch(item -> item.path().startsWith("backend/")));
    }

    @Test
    @DisplayName("keeps cell roots when the zip has no dest-folder prefix")
    void fromZipKeepsUnwrappedRoots() {
        List<String> paths = AssembleTree.fromZip(AssembleZipFixture.unwrappedCellZip())
                .stream()
                .map(GithubTreeBlob::path)
                .toList();
        assertTrue(paths.contains("backend/java/README.md"));
        assertTrue(paths.contains("frontend/package.json"));
        assertTrue(paths.contains("tests/java/README.md"));
        assertTrue(paths.contains("_contract/openapi.yaml"));
        assertTrue(paths.contains("README.md"));
    }

    @Test
    @DisplayName("does not invent a prefix when zip roots differ")
    void fromZipMixedPrefix() {
        List<String> paths = AssembleTree.fromZip(AssembleZipFixture.mixedPrefixZip())
                .stream()
                .map(GithubTreeBlob::path)
                .toList();
        assertEquals(List.of("bar/b.md", "foo/a.md").stream().sorted().toList(),
                paths.stream().sorted().toList());
    }

    @Test
    @DisplayName("empty or unreadable zip is an empty tree, not a stub")
    void fromZipEmptyOrGarbage() {
        assertTrue(AssembleTree.fromZip(null).isEmpty());
        assertTrue(AssembleTree.fromZip(new byte[0]).isEmpty());
        assertTrue(AssembleTree.fromZip(AssembleZipFixture.emptyZip()).isEmpty());
        assertTrue(AssembleTree.fromZip("not-a-zip".getBytes(StandardCharsets.UTF_8)).isEmpty());
        assertTrue(AssembleTree.fromZip(new byte[] {0x50, 0x4b, 0x03, 0x04, 0x00}).isEmpty());
        assertTrue(new AssembleTree(new byte[0]).blobs().isEmpty());
        assertTrue(AssembleTree.fromZipStream(new java.io.InputStream() {
            @Override
            public int read() throws IOException {
                throw new IOException("unreadable zip");
            }
        }).isEmpty());
    }

    @Test
    @DisplayName("normalizes zip entry names and skips slip / binary / course")
    void helpersNormalizeAndSkip() {
        assertEquals("", AssembleTree.posixName(null));
        assertEquals("backend/a.md", AssembleTree.posixName("./backend/a.md"));
        assertEquals("backend/a.md", AssembleTree.posixName("/backend/a.md"));
        assertEquals("backend/a.md", AssembleTree.posixName("///backend/a.md"));
        assertEquals("backend/a.md", AssembleTree.posixName("backend\\a.md"));
        assertEquals("", AssembleTree.commonPrefix(null));
        assertEquals("", AssembleTree.commonPrefix(List.of()));
        assertEquals("", AssembleTree.commonPrefix(List.of("README.md")));
        assertEquals("", AssembleTree.commonPrefix(List.of("backend/a.md", "frontend/b.md")));
        assertEquals("cell/", AssembleTree.commonPrefix(List.of("cell/backend/a.md", "cell/frontend/b.md")));
        assertEquals("", AssembleTree.commonPrefix(List.of("foo/a.md", "bar/b.md")));
        assertTrue(AssembleTree.skip(null));
        assertTrue(AssembleTree.skip("  "));
        assertTrue(AssembleTree.skip("backend/../secret.md"));
        assertTrue(AssembleTree.skip("docs/"));
        assertTrue(AssembleTree.skip(".DS_Store"));
        assertTrue(AssembleTree.skip("docs/.DS_Store"));
        assertTrue(AssembleTree.skip("docs\\.DS_Store"));
        assertTrue(AssembleTree.skip("node_modules/x.js"));
        assertFalse(AssembleTree.skip("backend/java/README.md"));
        assertFalse(AssembleTree.utf8Text(null));
        assertTrue(AssembleTree.utf8Text(new byte[0]));
        assertFalse(AssembleTree.utf8Text(new byte[] {0}));
        assertFalse(AssembleTree.utf8Text(new byte[] {(byte) 0xff, (byte) 0xff}));
        assertTrue(AssembleTree.utf8Text("assemble".getBytes(StandardCharsets.UTF_8)));
        assertFalse(AssembleTree.zipMagic(null));
        assertFalse(AssembleTree.zipMagic(new byte[] {'P'}));
        assertFalse(AssembleTree.zipMagic(new byte[] {'P', 'X'}));
        assertFalse(AssembleTree.zipMagic(AssembleZipFixture.jsonBytes()));
        assertTrue(AssembleTree.zipMagic(AssembleZipFixture.cellZip()));
        assertTrue(AssembleTree.zipMagic(AssembleZipFixture.emptyZip()));
    }

    @Test
    @DisplayName("classpath landing is dest zip YAML without a PAT")
    void classpathLandingIsDestZip() {
        String yaml = AssembleTree.classpathLanding();
        assertTrue(yaml.contains("destination: zip"));
        assertTrue(yaml.contains("coverageProfile"));
        assertTrue(!yaml.toLowerCase().contains("ghp_"));
        assertTrue(!yaml.toLowerCase().contains("gho_"));
        assertTrue(!yaml.contains("destination: user"));
        assertEquals("", AssembleTree.classpathLanding("missing-never-ship.yaml"));
        assertEquals(yaml, AssembleTree.classpathLanding(AssembleTree.LANDING_RESOURCE));
    }

    @Test
    @DisplayName("missing ASSEMBLE_URL fails closed instead of a classpath stub")
    void missingUrlIsUnavailable() {
        AssembleTree tree = new AssembleTree(
                new AssembleProperties(""), RestClient.builder(), YAML);
        AuthException missing = assertThrows(AuthException.class, tree::blobs);
        assertEquals(503, missing.getStatus());
        assertEquals("assemble url missing", missing.getMessage());
        AuthException blank = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("  "), RestClient.builder(), YAML).blobs());
        assertEquals("assemble url missing", blank.getMessage());
        AuthException spring = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties(null), RestClient.builder()).blobs());
        assertEquals("assemble url missing", spring.getMessage());
    }

    @Test
    @DisplayName("blank landing YAML fails closed instead of a classpath stub")
    void blankLandingIsUnavailable() {
        AuthException blank = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), RestClient.builder(), "  ")
                        .blobs());
        assertEquals(503, blank.getStatus());
        assertEquals("assemble zip missing", blank.getMessage());
        AuthException nil = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), RestClient.builder(), null)
                        .blobs());
        assertEquals("assemble zip missing", nil.getMessage());
    }

    @Test
    @DisplayName("POSTs Home YAML to ASSEMBLE_URL and unzips the dest zip")
    void fetchZipFromAssembleUrl() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("application/yaml")))
                .andExpect(content().string(containsString("destination: zip")))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("ghp_"))))
                .andRespond(withSuccess(AssembleZipFixture.cellZip(), MediaType.parseMediaType("application/zip")));

        List<String> paths = new AssembleTree(
                new AssembleProperties("http://127.0.0.1:3032"), builder, YAML)
                .blobs()
                .stream()
                .map(GithubTreeBlob::path)
                .toList();
        assertTrue(paths.contains("backend/java/backend-java-spring/README.md"));
        assertTrue(paths.contains("_contract/openapi.yaml"));
        server.verify();
    }

    @Test
    @DisplayName("accepts ASSEMBLE_URL that already ends with /assemble")
    void fetchZipWhenUrlIncludesAssemble() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(AssembleZipFixture.cellZip(), MediaType.parseMediaType("application/zip")));
        assertFalse(new AssembleTree(new AssembleProperties("http://127.0.0.1:3032/assemble/"), builder, YAML)
                .blobs()
                .isEmpty());
        server.verify();
    }

    @Test
    @DisplayName("JSON from assemble-zip is an empty tree, not a stub")
    void fetchZipRejectsJson() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(AssembleZipFixture.jsonBytes(), MediaType.APPLICATION_JSON));
        assertTrue(new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder, YAML)
                .blobs()
                .isEmpty());
        server.verify();
    }

    @Test
    @DisplayName("maps a down assemble-zip stand to 503")
    void fetchZipStandDown() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andRespond(withException(new IOException("down")));
        AuthException ex = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder, YAML).blobs());
        assertEquals(503, ex.getStatus());
        assertEquals("assemble zip missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps assemble-zip HTTP errors to 503")
    void fetchZipHttpError() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false}"));
        AuthException ex = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder, YAML).blobs());
        assertEquals(503, ex.getStatus());
        assertEquals("assemble zip missing", ex.getMessage());
        server.verify();
    }
}
