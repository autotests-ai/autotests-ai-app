package dev.multistack.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.AdoptProperties;
import dev.multistack.app.exception.AuthException;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.client.ExpectedCount.once;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

@Epic("Adopt")
@Feature("AdoptClient")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("AdoptClient")
class AdoptClientTest extends UnitTestBase {

    private static final String ADOPT_URL = "http://127.0.0.1:3033/adopt";
    private static final String JSON = """
            {"ok":true,"mode":"adopt","created":false,"dest":"generated-projects/adopt-takeaway-like"}
            """;
    private static final byte[] ZIP = new byte[] {0x50, 0x4b, 0x03, 0x04};

    @Test
    @DisplayName("public GitHub URL only; PAT and ssh stop")
    void assertPublicUrl() {
        assertEquals(
                "https://github.com/org/repo",
                AdoptClient.assertPublicUrl("https://github.com/org/repo"));
        AuthException pat = assertThrows(
                AuthException.class,
                () -> AdoptClient.assertPublicUrl("https://github.com/org/repo?token=ghp_secret"));
        assertEquals(400, pat.getStatus());
        assertEquals("PAT not allowed", pat.getMessage());
        assertEquals("репо не публичный", assertThrows(
                AuthException.class,
                () -> AdoptClient.assertPublicUrl("git@github.com:org/repo.git")).getMessage());
        assertEquals("репо не публичный", assertThrows(
                AuthException.class,
                () -> AdoptClient.assertPublicUrl("https://user:ghp_x@github.com/org/repo")).getMessage());
        assertFalse(AdoptClient.assertPublicUrl("https://github.com/org/repo.git").contains("3032"));
    }

    @Test
    @DisplayName("zip filename is the dest slug source, not a path")
    void zipFilename() {
        assertEquals("takeaway-like.zip", AdoptClient.zipFilename("takeaway-like.zip"));
        assertEquals(
                "takeaway-like.zip",
                AdoptClient.zipFilename("attachment; filename=\"takeaway-like.zip\""));
        assertEquals(null, AdoptClient.zipFilename("../../evil.zip"));
        assertEquals(null, AdoptClient.zipFilename("config.yaml"));
        assertTrue(AdoptClient.zipMagic(ZIP));
        assertFalse(AdoptClient.zipMagic("not-a-zip".getBytes(StandardCharsets.UTF_8)));
    }

    @Test
    @DisplayName("missing ADOPT_URL is 503, not assemble")
    void missingUrlIsUnavailable() {
        AdoptClient client = new AdoptClient(
                new AdoptProperties(""), RestClient.builder(), new ObjectMapper());
        AuthException missing = assertThrows(
                AuthException.class,
                () -> client.fromUrl(Map.of("url", "https://github.com/org/repo"), true));
        assertEquals(503, missing.getStatus());
        assertEquals("adopt url missing", missing.getMessage());
        assertFalse(missing.getMessage().contains("assemble"));
    }

    @Test
    @DisplayName("JSON PAT key is 400 before the stand")
    void rejectsPatKey() {
        AdoptClient client = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), RestClient.builder(), new ObjectMapper());
        AuthException pat = assertThrows(
                AuthException.class,
                () -> client.fromUrl(Map.of("url", "https://github.com/org/repo", "token", "ghp_x"), true));
        assertEquals(400, pat.getStatus());
        assertEquals("PAT not allowed", pat.getMessage());
    }

    @Test
    @DisplayName("POSTs public URL JSON to ADOPT_URL, not /api/assemble")
    void postsUrlJson() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(containsString("https://github.com/org/repo")))
                .andExpect(content().string(not(containsString("token"))))
                .andExpect(content().string(not(containsString("/assemble"))))
                .andRespond(withSuccess(JSON, MediaType.APPLICATION_JSON));

        Map<String, Object> payload = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper())
                .fromUrl(Map.of("url", "https://github.com/org/repo"), true);
        assertEquals("adopt", payload.get("mode"));
        assertEquals("generated-projects/adopt-takeaway-like", payload.get("dest"));
        assertEquals(false, payload.get("created"));
        server.verify();
    }

    @Test
    @DisplayName("POSTs zip bytes with original filename so dest matches CLI")
    void postsZipBytes() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.parseMediaType("application/zip")))
                .andExpect(header("Content-Disposition", "attachment; filename=\"takeaway-like.zip\""))
                .andRespond(withSuccess(JSON, MediaType.APPLICATION_JSON));

        Map<String, Object> payload = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper())
                .fromZip(
                        new MockMultipartFile("zip", "takeaway-like.zip", "application/zip", ZIP),
                        true);
        assertEquals("generated-projects/adopt-takeaway-like", payload.get("dest"));
        server.verify();
    }
}
