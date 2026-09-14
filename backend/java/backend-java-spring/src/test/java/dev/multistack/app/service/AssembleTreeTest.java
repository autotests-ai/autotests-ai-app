package dev.multistack.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.AdoptProperties;
import dev.multistack.app.config.AssembleProperties;
import dev.multistack.app.dto.AssembleZip;
import dev.multistack.app.dto.GithubTreeBlob;
import dev.multistack.app.exception.AuthException;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.never;
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
    private static final String ADOPT_ZIP_URL = "http://127.0.0.1:3033/adopt/zip";
    private static final String YAML = "destination: zip\ncoverageProfile:\n  product: {}\n";
    private static final String ADOPT_YAML = """
            destination: zip
            adoptDest: generated-projects/adopt-intern-flat
            coverageProfile:
              automation:
                e2e: { access: write, stack: java-junit5-rest_assured-selenide, module: tests/java }
            """;
    private static final String HOME_USER_YAML = """
            destination: user
            coverageProfile:
              harness:
                agents:
                  cursor: { access: write, module: .cursor/rules }
            """;

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
        assertEquals(AssembleZip.DEFAULT_FILENAME, AssembleTree.zipFilename(null));
        assertEquals(AssembleZip.DEFAULT_FILENAME, AssembleTree.zipFilename(""));
        assertEquals(AssembleZip.DEFAULT_FILENAME, AssembleTree.zipFilename("  "));
        assertEquals(
                "assemble-java-default.zip",
                AssembleTree.zipFilename("attachment; filename=\"assemble-java-default.zip\""));
        assertEquals(
                AssembleZip.DEFAULT_FILENAME,
                AssembleTree.zipFilename("attachment; filename=\"../../evil.zip\""));
        assertEquals(
                AssembleZip.DEFAULT_FILENAME,
                AssembleTree.zipFilename("attachment; filename=\"foo\\bar.zip\""));
        assertEquals(
                AssembleZip.DEFAULT_FILENAME,
                AssembleTree.zipFilename("attachment; filename=\"config.yaml\""));
    }

    @Test
    @DisplayName("e2e.stack is coverageProfile.automation.e2e.stack from YAML Home, never frozen")
    void e2eStackFromHomeYaml() {
        assertEquals("python-pytest", AssembleTree.e2eStack("""
                destination: user
                coverageProfile:
                  automation:
                    e2e: { access: write, stack: python-pytest, module: tests/python }
                """));
        assertEquals("python-pytest", AssembleTree.e2eStack("""
                coverageProfile:
                  automation:
                    e2e:
                      access: write
                      stack: python-pytest
                      module: tests/python
                """));
        assertEquals("python-pytest", AssembleTree.e2eStack("e2e:\n\tstack: python-pytest\n"));
        assertEquals("python-pytest", AssembleTree.e2eStack("""
                coverageProfile:
                  automation:
                    e2e:

                      stack: python-pytest
                """));
        assertEquals("python-pytest", AssembleTree.e2eStack("e2e:\n    \n      stack: python-pytest\n"));
        AuthException missing = assertThrows(AuthException.class, () -> AssembleTree.e2eStack(null));
        assertEquals(400, missing.getStatus());
        assertEquals("assemble yaml missing", missing.getMessage());
        assertEquals("assemble yaml missing", assertThrows(
                AuthException.class, () -> AssembleTree.e2eStack("  ")).getMessage());
        assertEquals("assemble e2e.stack missing", assertThrows(
                AuthException.class, () -> AssembleTree.e2eStack("destination: zip\n")).getMessage());
        assertEquals("assemble e2e.stack missing", assertThrows(
                AuthException.class, () -> AssembleTree.e2eStack("""
                        coverageProfile:
                          automation:
                            e2e: { access: write, module: tests/python }
                        """)).getMessage());
        assertEquals("assemble e2e.stack missing", assertThrows(
                AuthException.class, () -> AssembleTree.e2eStack("""
                        coverageProfile:
                          automation:
                            e2e:
                              access: write
                            ui:
                              stack: python-pytest
                        """)).getMessage());
        assertEquals("assemble e2e.stack missing", assertThrows(
                AuthException.class, () -> AssembleTree.e2eStack("""
                        coverageProfile:
                          automation:
                            e2e:
                              stack: -nope
                        """)).getMessage());
        assertEquals("assemble e2e.stack missing", assertThrows(
                AuthException.class, () -> AssembleTree.e2eStack("""
                        coverageProfile:
                          automation:
                            e2e:
                              stack: foo/bar
                        """)).getMessage());
        assertFalse("python-pytest".equals("java-junit5-rest_assured-selenide"));
    }

    @Test
    @DisplayName("stand YAML forces destination zip and never a classpath dump")
    void standYamlForcesDestinationZip() {
        assertEquals("", AssembleTree.standYaml(null));
        assertEquals("", AssembleTree.standYaml("  "));
        assertEquals("destination: zip", AssembleTree.standYaml("destination: user"));
        assertEquals("destination: zip", AssembleTree.standYaml("destination: catalog"));
        assertEquals("destination: zip", AssembleTree.standYaml("destination: cloud"));
        assertEquals("destination: zip", AssembleTree.standYaml("destination: zip"));
        String forced = AssembleTree.standYaml(HOME_USER_YAML);
        assertTrue(forced.contains("destination: zip"));
        assertTrue(forced.contains("coverageProfile"));
        assertTrue(forced.contains("cursor:"));
        assertFalse(forced.contains("destination: user"));
        assertFalse(forced.toLowerCase().contains("ghp_"));
        assertFalse(forced.toLowerCase().contains("gho_"));
        assertFalse(forced.contains("assemble-landing.yaml"));
    }

    @Test
    @DisplayName("missing ASSEMBLE_URL fails closed instead of a classpath stub")
    void missingUrlIsUnavailable() {
        AssembleTree tree = new AssembleTree(new AssembleProperties(""), RestClient.builder());
        AuthException missing = assertThrows(AuthException.class, () -> tree.blobs(YAML));
        assertEquals(503, missing.getStatus());
        assertEquals("assemble url missing", missing.getMessage());
        AuthException blank = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("  "), RestClient.builder()).blobs(YAML));
        assertEquals("assemble url missing", blank.getMessage());
        AuthException spring = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties(null), RestClient.builder()).blobs());
        assertEquals("assemble url missing", spring.getMessage());
    }

    @Test
    @DisplayName("blank Home YAML fails closed instead of a classpath stub")
    void blankLandingIsUnavailable() {
        AuthException blank = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), RestClient.builder())
                        .blobs("  "));
        assertEquals(400, blank.getStatus());
        assertEquals("assemble yaml missing", blank.getMessage());
        AuthException nil = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), RestClient.builder())
                        .blobs(null));
        assertEquals("assemble yaml missing", nil.getMessage());
        AuthException omitted = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), RestClient.builder())
                        .blobs());
        assertEquals("assemble yaml missing", omitted.getMessage());
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
                .andExpect(content().string(containsString("coverageProfile")))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("ghp_"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("assemble-landing.yaml"))))
                .andRespond(withSuccess(AssembleZipFixture.cellZip(), MediaType.parseMediaType("application/zip")));

        List<String> paths = new AssembleTree(
                new AssembleProperties("http://127.0.0.1:3032"), builder)
                .blobs(YAML)
                .stream()
                .map(GithubTreeBlob::path)
                .toList();
        assertTrue(paths.contains("backend/java/backend-java-spring/README.md"));
        assertTrue(paths.contains("_contract/openapi.yaml"));
        server.verify();
    }

    @Test
    @DisplayName("POSTs Home dump with destination forced zip, not destination user")
    void fetchZipForcesDestinationZipFromHomeDump() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("application/yaml")))
                .andExpect(content().string(containsString("destination: zip")))
                .andExpect(content().string(containsString("coverageProfile")))
                .andExpect(content().string(containsString("cursor:")))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("destination: user"))))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("3032"))))
                .andRespond(withSuccess(AssembleZipFixture.cellZip(), MediaType.parseMediaType("application/zip")));

        assertFalse(new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder)
                .blobs(HOME_USER_YAML)
                .isEmpty());
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
        assertFalse(new AssembleTree(new AssembleProperties("http://127.0.0.1:3032/assemble/"), builder)
                .blobs(YAML)
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
        assertTrue(new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder)
                .blobs(YAML)
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
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder).blobs(YAML));
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
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder).blobs(YAML));
        assertEquals(503, ex.getStatus());
        assertEquals("assemble zip missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("zip POSTs Home YAML to ASSEMBLE_URL and returns dest zip bytes")
    void zipFromAssembleUrl() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        byte[] zipBytes = AssembleZipFixture.cellZip();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("application/yaml")))
                .andExpect(content().string(containsString("destination: zip")))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("assemble-landing.yaml"))))
                .andRespond(withSuccess(zipBytes, MediaType.parseMediaType("application/zip"))
                        .header(HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"assemble-java-default.zip\""));

        AssembleZip zip = new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder)
                .zip(YAML);
        assertArrayEquals(zipBytes, zip.body());
        assertEquals("assemble-java-default.zip", zip.filename());
        assertEquals(zip, new AssembleZip(zip.body(), zip.filename()));
        assertEquals(zip.hashCode(), new AssembleZip(zip.body(), zip.filename()).hashCode());
        assertTrue(zip.toString().contains("assemble-java-default.zip"));
        assertNotEquals(zip, new AssembleZip(zip.body(), AssembleZip.DEFAULT_FILENAME));
        server.verify();
    }

    @Test
    @DisplayName("zip uses assemble.zip when Content-Disposition is missing")
    void zipDefaultFilename() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andRespond(withSuccess(AssembleZipFixture.cellZip(), MediaType.parseMediaType("application/zip")));

        AssembleZip zip = new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder)
                .zip(YAML);
        assertEquals(AssembleZip.DEFAULT_FILENAME, zip.filename());
        assertTrue(AssembleTree.zipMagic(zip.body()));
        server.verify();
    }

    @Test
    @DisplayName("zip maps JSON from assemble-zip to 503, not a stub")
    void zipRejectsJson() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(AssembleZipFixture.jsonBytes(), MediaType.APPLICATION_JSON));
        AuthException ex = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), builder).zip(YAML));
        assertEquals(503, ex.getStatus());
        assertEquals("assemble zip missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("zip on an injected tree is 503, never a classpath stub")
    void zipInjectedIsUnavailable() {
        AuthException injected = assertThrows(
                AuthException.class,
                () -> new AssembleTree(List.of(new GithubTreeBlob("README.md", "assemble\n"))).zip(YAML));
        assertEquals(503, injected.getStatus());
        assertEquals("assemble zip missing", injected.getMessage());
        AuthException fromBytes = assertThrows(
                AuthException.class,
                () -> new AssembleTree(AssembleZipFixture.cellZip()).zip(YAML));
        assertEquals("assemble zip missing", fromBytes.getMessage());
    }

    @Test
    @DisplayName("adoptDest absent is assemble; intern zip is intern tree")
    void adoptDestParsesAndInternZipUnzips() {
        assertEquals(null, AssembleTree.adoptDest(null));
        assertEquals(null, AssembleTree.adoptDest("  "));
        assertEquals(null, AssembleTree.adoptDest(YAML));
        assertEquals(
                "generated-projects/adopt-intern-flat",
                AssembleTree.adoptDest(ADOPT_YAML));
        assertEquals(
                "generated-projects/adopt-intern-flat",
                AssembleTree.adoptDest("adoptDest: \"generated-projects/adopt-intern-flat\"\n"));
        AuthException etalon = assertThrows(
                AuthException.class,
                () -> AssembleTree.adoptDest("adoptDest: generated-projects/assemble-java-default\n"));
        assertEquals(400, etalon.getStatus());
        assertEquals("dest must be generated-projects/adopt-<id>", etalon.getMessage());
        assertEquals(
                "dest must be generated-projects/adopt-<id>",
                assertThrows(AuthException.class, () -> AssembleTree.adoptDest("adoptDest:\n"))
                        .getMessage());
        List<String> intern = AssembleTree.fromZip(AssembleZipFixture.internZip()).stream()
                .map(GithubTreeBlob::path)
                .toList();
        assertTrue(intern.contains("backend/java/backend-java-spring/src/main/java/App.java"));
        assertTrue(intern.contains("tests/java/tests-java-junit5-rest_assured-selenide/src/test/java/LoginTest.java"));
        assertTrue(intern.contains("docs/coverage-profile.md"));
        assertTrue(intern.contains("docs/agent-skills/PACK.md"));
        assertFalse(intern.stream().anyMatch(path -> path.contains("frontend")));
        assertFalse(intern.contains("README.md"));
        assertFalse(intern.stream().anyMatch(path -> path.contains("node_modules")));
    }

    @Test
    @DisplayName("adoptDest POSTs /adopt/zip and never ASSEMBLE_URL")
    void adoptDestFetchesInternZip() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ADOPT_ZIP_URL))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(containsString("generated-projects/adopt-intern-flat")))
                .andExpect(content().string(org.hamcrest.Matchers.not(containsString("/assemble"))))
                .andRespond(withSuccess(
                        AssembleZipFixture.internZip(), MediaType.parseMediaType("application/zip")));
        server.expect(never(), requestTo(ASSEMBLE_URL));

        List<String> paths = tree(builder)
                .blobs(ADOPT_YAML)
                .stream()
                .map(GithubTreeBlob::path)
                .toList();
        assertTrue(paths.contains("backend/java/backend-java-spring/src/main/java/App.java"));
        assertTrue(paths.contains("docs/agent-skills/PACK.md"));
        assertFalse(paths.stream().anyMatch(path -> path.contains("frontend")));
        server.verify();
    }

    @Test
    @DisplayName("adoptDest without AdoptClient is 503 like dest")
    void adoptDestMissingClientIsUnavailable() {
        AuthException missing = assertThrows(
                AuthException.class,
                () -> new AssembleTree(new AssembleProperties("http://127.0.0.1:3032"), RestClient.builder())
                        .blobs(ADOPT_YAML));
        assertEquals(503, missing.getStatus());
        assertEquals("adopt url missing", missing.getMessage());
        assertFalse(missing.getMessage().contains("assemble"));
    }

    @Test
    @DisplayName("adoptDest missing ADOPT_URL is 503 like dest")
    void adoptDestMissingUrlIsUnavailable() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(never(), requestTo(ASSEMBLE_URL));
        AssembleTree tree = new AssembleTree(
                new AssembleProperties("http://127.0.0.1:3032"),
                builder,
                new AdoptClient(new AdoptProperties(""), builder, new ObjectMapper()));
        AuthException missing = assertThrows(AuthException.class, () -> tree.blobs(ADOPT_YAML));
        assertEquals(503, missing.getStatus());
        assertEquals("adopt url missing", missing.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("zip ignores adoptDest and still POSTs ASSEMBLE_URL")
    void zipIgnoresAdoptDest() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ASSEMBLE_URL))
                .andRespond(withSuccess(AssembleZipFixture.cellZip(), MediaType.parseMediaType("application/zip")));
        server.expect(never(), requestTo(ADOPT_ZIP_URL));
        AssembleZip zip = tree(builder).zip(ADOPT_YAML);
        assertTrue(AssembleTree.zipMagic(zip.body()));
        server.verify();
    }

    private static AssembleTree tree(RestClient.Builder builder) {
        return new AssembleTree(
                new AssembleProperties("http://127.0.0.1:3032"),
                builder,
                new AdoptClient(new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper()));
    }
}
