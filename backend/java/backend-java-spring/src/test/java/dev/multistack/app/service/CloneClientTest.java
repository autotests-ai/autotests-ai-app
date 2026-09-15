package dev.multistack.app.service;

import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.AssembleProperties;
import dev.multistack.app.dto.CloneZip;
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

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.never;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@Epic("Clone")
@Feature("CloneClient")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("CloneClient")
class CloneClientTest extends UnitTestBase {

    private static final String STAND_CLONE = "http://127.0.0.1:3032/clone";
    private static final String STAND_ASSEMBLE = "http://127.0.0.1:3032/assemble";
    private static final String YAML = """
            destination: zip
            coverageProfile:
              harness:
                mill: { access: write, pack: pack-v1 }
            """;
    private static final byte[] ZIP = new byte[] {0x50, 0x4b, 0x03, 0x04};

    @Test
    @DisplayName("empty body only; YAML dump and PAT JSON stop before the stand")
    void assertEmpty() {
        CloneClient.assertEmpty(null);
        CloneClient.assertEmpty("");
        CloneClient.assertEmpty("  \n");
        AuthException yaml = assertThrows(AuthException.class, () -> CloneClient.assertEmpty(YAML));
        assertEquals(400, yaml.getStatus());
        assertEquals(CloneClient.BODY_ERROR, yaml.getMessage());
        assertTrue(yaml.getMessage().contains("/assemble"));
        assertEquals(CloneClient.BODY_ERROR, assertThrows(
                AuthException.class,
                () -> CloneClient.assertEmpty("{\"token\":\"ghp_x\"}")).getMessage());
        assertEquals("clone-as-student.zip", CloneClient.zipFilename(null));
        assertEquals(
                "clone-as-student.zip",
                CloneClient.zipFilename("attachment; filename=\"../../evil.zip\""));
        assertEquals(
                "course.zip",
                CloneClient.zipFilename("attachment; filename=\"course.zip\""));
        assertTrue(CloneClient.zipMagic(ZIP));
        assertFalse(CloneClient.zipMagic("not-a-zip".getBytes()));
    }

    @Test
    @DisplayName("missing ASSEMBLE_URL is 503, not a CLONE_URL secret")
    void missingUrlIsUnavailable() {
        CloneClient client = new CloneClient(
                new AssembleProperties(""), RestClient.builder());
        AuthException missing = assertThrows(AuthException.class, () -> client.zip(null));
        assertEquals(503, missing.getStatus());
        assertEquals("assemble url missing", missing.getMessage());
        assertFalse(missing.getMessage().contains("CLONE_URL"));
    }

    @Test
    @DisplayName("YAML dump is 400 and does not POST /assemble")
    void rejectsYamlBeforeStand() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(never(), requestTo(STAND_CLONE));
        server.expect(never(), requestTo(STAND_ASSEMBLE));

        AuthException dump = assertThrows(
                AuthException.class,
                () -> new CloneClient(new AssembleProperties("http://127.0.0.1:3032"), builder)
                        .zip(YAML));
        assertEquals(400, dump.getStatus());
        assertEquals(CloneClient.BODY_ERROR, dump.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("POSTs empty body to ASSEMBLE_URL/clone and returns zip bytes, not /assemble")
    void postsEmptyBodyToClone() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(STAND_CLONE))
                .andExpect(method(HttpMethod.POST))
                .andExpect(headerDoesNotExist(HttpHeaders.AUTHORIZATION))
                .andExpect(content().string(not(containsString("destination"))))
                .andExpect(content().string(not(containsString("coverageProfile"))))
                .andExpect(content().string(not(containsString("mill"))))
                .andExpect(content().string(not(containsString("token"))))
                .andRespond(withSuccess(ZIP, MediaType.parseMediaType("application/zip"))
                        .header(
                                HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"clone-as-student.zip\""));
        server.expect(never(), requestTo(STAND_ASSEMBLE));

        CloneZip zip = new CloneClient(
                new AssembleProperties("http://127.0.0.1:3032"), builder)
                .zip(null);
        assertEquals("clone-as-student.zip", zip.filename());
        assertEquals(ZIP[0], zip.body()[0]);
        server.verify();
    }

    @Test
    @DisplayName("ASSEMBLE_URL ending with /assemble still POSTs /clone")
    void assembleUrlJoinsClonePath() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(STAND_CLONE))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess(ZIP, MediaType.parseMediaType("application/zip"))
                        .header(
                                HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"clone-as-student.zip\""));
        server.expect(never(), requestTo(STAND_ASSEMBLE));

        CloneZip zip = new CloneClient(
                new AssembleProperties("http://127.0.0.1:3032/assemble"), builder)
                .zip("  ");
        assertEquals("clone-as-student.zip", zip.filename());
        server.verify();
    }

    @Test
    @DisplayName("maps a down assemble-zip stand to 503")
    void mapsStandDown() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(STAND_CLONE))
                .andRespond(withException(new IOException("down")));
        AuthException ex = assertThrows(
                AuthException.class,
                () -> new CloneClient(new AssembleProperties("http://127.0.0.1:3032"), builder)
                        .zip(null));
        assertEquals(503, ex.getStatus());
        assertEquals("clone zip missing", ex.getMessage());
        server.verify();
    }

    @Test
    @DisplayName("maps stand 400 JSON to 400 empty-body error, not assemble zip")
    void mapsStandYamlDump() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(STAND_CLONE))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false,\"error\":\"" + CloneClient.BODY_ERROR + "\"}"));
        AuthException ex = assertThrows(
                AuthException.class,
                () -> new CloneClient(new AssembleProperties("http://127.0.0.1:3032"), builder)
                        .zip(null));
        assertEquals(400, ex.getStatus());
        assertEquals(CloneClient.BODY_ERROR, ex.getMessage());
        assertFalse(ex.getMessage().contains("assemble zip missing"));
        server.verify();
    }

    @Test
    @DisplayName("JSON 200 from /clone is 503, not a stub zip")
    void mapsNonZip() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(STAND_CLONE))
                .andRespond(withSuccess("{\"ok\":true,\"mode\":\"clone\"}", MediaType.APPLICATION_JSON));
        AuthException ex = assertThrows(
                AuthException.class,
                () -> new CloneClient(new AssembleProperties("http://127.0.0.1:3032"), builder)
                        .zip(null));
        assertEquals(503, ex.getStatus());
        assertEquals("clone zip missing", ex.getMessage());
        server.verify();
    }
}
