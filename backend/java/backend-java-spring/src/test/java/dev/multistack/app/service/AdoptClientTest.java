package dev.multistack.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.config.AdoptProperties;
import dev.multistack.app.dto.AdoptZip;
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
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
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
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withException;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
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
    @DisplayName("private URL is 401 without github_oauth cookie")
    void privateUrlRequiresCookie() {
        AdoptClient client = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), RestClient.builder(), new ObjectMapper());
        AuthException missing = assertThrows(
                AuthException.class,
                () -> client.fromPrivateUrl(Map.of("url", "https://github.com/org/repo"), true, null));
        assertEquals(401, missing.getStatus());
        assertEquals("oauth cookie missing", missing.getMessage());
        assertEquals("oauth cookie missing", assertThrows(
                AuthException.class,
                () -> client.fromPrivateUrl(Map.of("url", "https://github.com/org/repo"), true, "  "))
                .getMessage());
        AuthException pat = assertThrows(
                AuthException.class,
                () -> client.fromPrivateUrl(
                        Map.of("url", "https://github.com/org/repo", "token", "ghp_x"),
                        true,
                        "gho_secret"));
        assertEquals(400, pat.getStatus());
        assertEquals("PAT not allowed", pat.getMessage());
    }

    @Test
    @DisplayName("private URL POSTs to ADOPT_URL with Bearer cookie, never token in JSON")
    void privateUrlPostsBearerNotJson() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer gho_secret"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(containsString("https://github.com/org/repo")))
                .andExpect(content().string(not(containsString("token"))))
                .andExpect(content().string(not(containsString("gho_secret"))))
                .andExpect(content().string(not(containsString("GITHUB_CLOUD_TOKEN"))))
                .andExpect(content().string(not(containsString("/assemble"))))
                .andRespond(withSuccess(JSON, MediaType.APPLICATION_JSON));

        Map<String, Object> payload = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper())
                .fromPrivateUrl(Map.of("url", "https://github.com/org/repo"), true, "gho_secret");
        assertEquals("adopt", payload.get("mode"));
        assertEquals("generated-projects/adopt-takeaway-like", payload.get("dest"));
        assertFalse(payload.containsKey("token"));
        server.verify();
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
                .andExpect(content().string(not(containsString("gho_"))))
                .andExpect(content().string(not(containsString("/assemble"))))
                .andExpect(headerDoesNotExist(HttpHeaders.AUTHORIZATION))
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
    @DisplayName("private URL maps stand 401 without leaking the cookie")
    void privateUrlMapsStand401() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andExpect(header(HttpHeaders.AUTHORIZATION, "Bearer gho_secret"))
                .andRespond(withStatus(HttpStatus.UNAUTHORIZED)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false,\"error\":\"oauth clone failed\"}"));
        AuthException mapped = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper())
                        .fromPrivateUrl(Map.of("url", "https://github.com/org/repo"), true, "gho_secret"));
        assertEquals(401, mapped.getStatus());
        assertEquals("oauth clone failed", mapped.getMessage());
        assertFalse(mapped.getMessage().contains("gho_"));
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

    @Test
    @DisplayName("adopt dest is generated-projects/adopt-<id>, not etalon")
    void assertAdoptDest() {
        assertEquals(
                "generated-projects/adopt-takeaway-like",
                AdoptClient.assertAdoptDest("generated-projects/adopt-takeaway-like"));
        AuthException etalon = assertThrows(
                AuthException.class,
                () -> AdoptClient.assertAdoptDest("generated-projects/assemble-java-default"));
        assertEquals(400, etalon.getStatus());
        assertEquals("dest must be generated-projects/adopt-<id>", etalon.getMessage());
        assertEquals("dest must be generated-projects/adopt-<id>", assertThrows(
                AuthException.class,
                () -> AdoptClient.assertAdoptDest(null)).getMessage());
        assertEquals("adopt.zip", AdoptClient.destZipFilename(null));
        assertEquals("adopt.zip", AdoptClient.destZipFilename("attachment; filename=\"../../evil.zip\""));
        assertEquals(
                "adopt-tiny.zip",
                AdoptClient.destZipFilename("attachment; filename=\"adopt-tiny.zip\""));
    }

    @Test
    @DisplayName("dest zip requires ADOPT_URL")
    void destZipMissingUrl() {
        AdoptClient client = new AdoptClient(
                new AdoptProperties(""), RestClient.builder(), new ObjectMapper());
        AuthException missing = assertThrows(
                AuthException.class,
                () -> client.destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(503, missing.getStatus());
        assertEquals("adopt url missing", missing.getMessage());
    }

    @Test
    @DisplayName("dest zip rejects PAT, extra keys, and empty body")
    void destZipRejectsBadBody() {
        AdoptClient client = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), RestClient.builder(), new ObjectMapper());
        assertEquals("PAT not allowed", assertThrows(
                AuthException.class,
                () -> client.destZip(Map.of("dest", "generated-projects/adopt-x", "token", "ghp_x")))
                .getMessage());
        assertEquals("dest must be generated-projects/adopt-<id>", assertThrows(
                AuthException.class,
                () -> client.destZip(Map.of("url", "https://github.com/org/repo")))
                .getMessage());
        assertEquals("dest must be generated-projects/adopt-<id>", assertThrows(
                AuthException.class,
                () -> client.destZip(Map.of()))
                .getMessage());
        assertEquals("dest must be generated-projects/adopt-<id>", assertThrows(
                AuthException.class,
                () -> client.destZip(null))
                .getMessage());
        Map<String, Object> blank = new HashMap<>();
        blank.put("dest", "  ");
        assertEquals("dest must be generated-projects/adopt-<id>", assertThrows(
                AuthException.class,
                () -> client.destZip(blank))
                .getMessage());
        Map<String, Object> nullKey = new HashMap<>();
        nullKey.put(null, "x");
        assertEquals("dest must be generated-projects/adopt-<id>", assertThrows(
                AuthException.class,
                () -> client.destZip(nullKey))
                .getMessage());
        Map<String, Object> number = new HashMap<>();
        number.put("dest", 1);
        assertEquals("dest must be generated-projects/adopt-<id>", assertThrows(
                AuthException.class,
                () -> client.destZip(number))
                .getMessage());
        assertEquals("dest must be generated-projects/adopt-<id>", assertThrows(
                AuthException.class,
                () -> client.destZip(Map.of("dest", "generated-projects/adopt-x", "id", "x")))
                .getMessage());
    }

    @Test
    @DisplayName("POSTs dest JSON to /adopt/zip and returns zip bytes, not /assemble")
    void destZipPostsStand() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(containsString("generated-projects/adopt-takeaway-like")))
                .andExpect(content().string(not(containsString("/assemble"))))
                .andRespond(withSuccess(ZIP, MediaType.parseMediaType("application/zip"))
                        .header(
                                HttpHeaders.CONTENT_DISPOSITION,
                                "attachment; filename=\"adopt-takeaway-like.zip\""));

        AdoptZip zip = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper())
                .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like"));
        assertEquals("adopt-takeaway-like.zip", zip.filename());
        assertEquals(ZIP[0], zip.body()[0]);
        server.verify();
    }

    @Test
    @DisplayName("dest zip maps stand 400 JSON and non-zip 200 to 503")
    void destZipMapsStandErrors() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false,\"error\":\"dest not found: generated-projects/adopt-x\"}"));

        AuthException missing = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper())
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(400, missing.getStatus());
        assertTrue(missing.getMessage().contains("dest not found"));
        server.verify();

        RestClient.Builder jsonBuilder = RestClient.builder();
        MockRestServiceServer jsonServer = MockRestServiceServer.bindTo(jsonBuilder).build();
        jsonServer.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withSuccess("{\"ok\":true}", MediaType.APPLICATION_JSON));
        AuthException notZip = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), jsonBuilder, new ObjectMapper())
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(503, notZip.getStatus());
        assertEquals("adopt zip missing", notZip.getMessage());
        jsonServer.verify();

        RestClient.Builder jsonNull = RestClient.builder();
        MockRestServiceServer nullServer = MockRestServiceServer.bindTo(jsonNull).build();
        nullServer.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withSuccess("null", MediaType.APPLICATION_JSON));
        AuthException parsedNull = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), jsonNull, new ObjectMapper())
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(503, parsedNull.getStatus());
        assertEquals("adopt zip missing", parsedNull.getMessage());
        nullServer.verify();

        RestClient.Builder noName = RestClient.builder();
        MockRestServiceServer noNameServer = MockRestServiceServer.bindTo(noName).build();
        noNameServer.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withSuccess(ZIP, MediaType.parseMediaType("application/zip")));
        AdoptZip unnamed = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), noName, new ObjectMapper())
                .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like"));
        assertEquals("adopt.zip", unnamed.filename());
        noNameServer.verify();

        RestClient.Builder boom = RestClient.builder();
        MockRestServiceServer boomServer = MockRestServiceServer.bindTo(boom).build();
        boomServer.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false,\"error\":\"boom\"}"));
        AuthException mapped = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), boom, new ObjectMapper())
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(503, mapped.getStatus());
        assertEquals("boom", mapped.getMessage());
        boomServer.verify();

        RestClient.Builder badJson = RestClient.builder();
        MockRestServiceServer badServer = MockRestServiceServer.bindTo(badJson).build();
        badServer.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("not-json"));
        AuthException unreadable = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), badJson, new ObjectMapper())
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(503, unreadable.getStatus());
        badServer.verify();
    }

    @Test
    @DisplayName("dest zip stand down is 503, not assemble")
    void destZipStandDown() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withException(new IOException("down")));
        AuthException down = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper())
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(503, down.getStatus());
        assertEquals("adopt zip missing", down.getMessage());
        assertFalse(down.getMessage().contains("assemble"));
    }

    @Test
    @DisplayName("dest zip maps 413/504 and JSON without error")
    void destZipMapsTimeoutAndEmptyError() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withStatus(HttpStatus.GATEWAY_TIMEOUT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false}"));
        AuthException timeout = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper())
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(504, timeout.getStatus());
        assertEquals("adopt zip missing", timeout.getMessage());
        server.verify();

        RestClient.Builder payload = RestClient.builder();
        MockRestServiceServer payloadServer = MockRestServiceServer.bindTo(payload).build();
        payloadServer.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withStatus(HttpStatus.PAYLOAD_TOO_LARGE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false}"));
        AuthException tooLarge = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), payload, new ObjectMapper())
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(413, tooLarge.getStatus());
        payloadServer.verify();
    }

    @Test
    @DisplayName("fromUrl rejects empty body, extra keys, blank url, and PAT query")
    void fromUrlRejectsBadBody() {
        AdoptClient client = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), RestClient.builder(), new ObjectMapper());
        assertEquals("one channel: url or zip", assertThrows(
                AuthException.class, () -> client.fromUrl(null, true)).getMessage());
        assertEquals("one channel: url or zip", assertThrows(
                AuthException.class, () -> client.fromUrl(Map.of(), true)).getMessage());
        assertEquals("one channel: url or zip", assertThrows(
                AuthException.class,
                () -> client.fromUrl(Map.of("url", "https://github.com/org/repo", "dest", "x"), true))
                .getMessage());
        Map<String, Object> blank = new HashMap<>();
        blank.put("url", "  ");
        assertEquals("one channel: url or zip", assertThrows(
                AuthException.class, () -> client.fromUrl(blank, true)).getMessage());
        Map<String, Object> number = new HashMap<>();
        number.put("url", 1);
        assertEquals("one channel: url or zip", assertThrows(
                AuthException.class, () -> client.fromUrl(number, true)).getMessage());
        Map<String, Object> nullKey = new HashMap<>();
        nullKey.put(null, "x");
        assertEquals("one channel: url or zip", assertThrows(
                AuthException.class, () -> client.fromUrl(nullKey, true)).getMessage());
        assertEquals("PAT not allowed", assertThrows(
                AuthException.class,
                () -> AdoptClient.assertPublicUrl("https://github.com/org/repo?pat=secret"))
                .getMessage());
        assertEquals("репо не публичный", assertThrows(
                AuthException.class,
                () -> AdoptClient.assertPublicUrl("ssh://github.com/org/repo.git"))
                .getMessage());
        assertEquals("url must be public https://github.com/org/repo", assertThrows(
                AuthException.class,
                () -> AdoptClient.assertPublicUrl("https://example.com/org/repo"))
                .getMessage());
        assertEquals("url must be public https://github.com/org/repo", assertThrows(
                AuthException.class,
                () -> AdoptClient.assertPublicUrl(null))
                .getMessage());
        assertEquals("url must be public https://github.com/org/repo", assertThrows(
                AuthException.class,
                () -> AdoptClient.assertPublicUrl("   "))
                .getMessage());
        assertEquals(null, AdoptClient.zipFilename(null));
        assertEquals(null, AdoptClient.zipFilename("  "));
        assertEquals(null, AdoptClient.zipFilename("foo\\bar.zip"));
        assertFalse(AdoptClient.zipMagic(null));
        assertFalse(AdoptClient.zipMagic(new byte[] {0x50}));
        assertFalse(AdoptClient.zipMagic(new byte[] {0x50, 0x00}));
    }

    @Test
    @DisplayName("fromUrl honors dry_run in JSON and maps stand errors")
    void fromUrlMapsStand() {
        RestClient.Builder dry = RestClient.builder();
        MockRestServiceServer dryServer = MockRestServiceServer.bindTo(dry).build();
        dryServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withSuccess(JSON, MediaType.APPLICATION_JSON));
        Map<String, Object> planned = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), dry, new ObjectMapper())
                .fromUrl(Map.of("url", "https://github.com/org/repo", "dry_run", true), false);
        assertEquals("adopt", planned.get("mode"));
        dryServer.verify();

        RestClient.Builder hyphen = RestClient.builder();
        MockRestServiceServer hyphenServer = MockRestServiceServer.bindTo(hyphen).build();
        hyphenServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withSuccess(JSON, MediaType.APPLICATION_JSON));
        new AdoptClient(new AdoptProperties("http://127.0.0.1:3033"), hyphen, new ObjectMapper())
                .fromUrl(Map.of("url", "https://github.com/org/repo", "dry-run", true), false);
        hyphenServer.verify();

        RestClient.Builder apply = RestClient.builder();
        MockRestServiceServer applyServer = MockRestServiceServer.bindTo(apply).build();
        applyServer.expect(once(), requestTo(ADOPT_URL))
                .andRespond(withSuccess(JSON, MediaType.APPLICATION_JSON));
        new AdoptClient(new AdoptProperties("http://127.0.0.1:3033"), apply, new ObjectMapper())
                .fromUrl(Map.of("url", "https://github.com/org/repo"), false);
        applyServer.verify();

        RestClient.Builder down = RestClient.builder();
        MockRestServiceServer downServer = MockRestServiceServer.bindTo(down).build();
        downServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withException(new IOException("down")));
        AuthException missing = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), down, new ObjectMapper())
                        .fromUrl(Map.of("url", "https://github.com/org/repo"), true));
        assertEquals(503, missing.getStatus());
        assertEquals("adopt missing", missing.getMessage());

        RestClient.Builder bad = RestClient.builder();
        MockRestServiceServer badServer = MockRestServiceServer.bindTo(bad).build();
        badServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withStatus(HttpStatus.BAD_REQUEST)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false,\"error\":\"репо не публичный\"}"));
        AuthException mapped = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), bad, new ObjectMapper())
                        .fromUrl(Map.of("url", "https://github.com/org/repo"), true));
        assertEquals(400, mapped.getStatus());
        assertEquals("репо не публичный", mapped.getMessage());

        RestClient.Builder emptyErr = RestClient.builder();
        MockRestServiceServer emptyServer = MockRestServiceServer.bindTo(emptyErr).build();
        emptyServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withStatus(HttpStatus.GATEWAY_TIMEOUT)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false}"));
        assertEquals(504, assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), emptyErr, new ObjectMapper())
                        .fromUrl(Map.of("url", "https://github.com/org/repo"), true))
                .getStatus());

        RestClient.Builder tooLarge = RestClient.builder();
        MockRestServiceServer tooLargeServer = MockRestServiceServer.bindTo(tooLarge).build();
        tooLargeServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withStatus(HttpStatus.PAYLOAD_TOO_LARGE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false}"));
        assertEquals(413, assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), tooLarge, new ObjectMapper())
                        .fromUrl(Map.of("url", "https://github.com/org/repo"), true))
                .getStatus());

        RestClient.Builder boom = RestClient.builder();
        MockRestServiceServer boomServer = MockRestServiceServer.bindTo(boom).build();
        boomServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false,\"error\":\"boom\"}"));
        AuthException five = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), boom, new ObjectMapper())
                        .fromUrl(Map.of("url", "https://github.com/org/repo"), true));
        assertEquals(503, five.getStatus());
        assertEquals("boom", five.getMessage());

        RestClient.Builder jsonNull = RestClient.builder();
        MockRestServiceServer nullServer = MockRestServiceServer.bindTo(jsonNull).build();
        nullServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withSuccess("null", MediaType.APPLICATION_JSON));
        assertEquals("adopt missing", assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), jsonNull, new ObjectMapper())
                        .fromUrl(Map.of("url", "https://github.com/org/repo"), true))
                .getMessage());

        RestClient.Builder notJson = RestClient.builder();
        MockRestServiceServer notJsonServer = MockRestServiceServer.bindTo(notJson).build();
        notJsonServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withStatus(HttpStatus.INTERNAL_SERVER_ERROR).body("not-json"));
        assertEquals("adopt missing", assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), notJson, new ObjectMapper())
                        .fromUrl(Map.of("url", "https://github.com/org/repo"), true))
                .getMessage());

        RestClient.Builder early = RestClient.builder();
        MockRestServiceServer earlyServer = MockRestServiceServer.bindTo(early).build();
        earlyServer.expect(once(), requestTo(ADOPT_URL + "?dry_run=1"))
                .andRespond(withStatus(HttpStatus.CONTINUE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false,\"error\":\"early\"}"));
        AuthException tooEarly = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), early, new ObjectMapper())
                        .fromUrl(Map.of("url", "https://github.com/org/repo"), true));
        assertEquals(503, tooEarly.getStatus());
        assertEquals("early", tooEarly.getMessage());
    }

    @Test
    @DisplayName("fromZip rejects missing bytes and maps dest slug from filename")
    void fromZipRejectsBadUpload() throws Exception {
        AdoptClient client = new AdoptClient(
                new AdoptProperties("http://127.0.0.1:3033"), RestClient.builder(), new ObjectMapper());
        assertEquals("zip missing", assertThrows(
                AuthException.class, () -> client.fromZip(null, true)).getMessage());
        assertEquals("zip missing", assertThrows(
                AuthException.class,
                () -> client.fromZip(new MockMultipartFile("zip", "x.zip", "application/zip", new byte[0]), true))
                .getMessage());
        assertEquals("zip filename required", assertThrows(
                AuthException.class,
                () -> client.fromZip(
                        new MockMultipartFile("zip", "../../evil.zip", "application/zip", ZIP), true))
                .getMessage());
        assertEquals("zip filename required", assertThrows(
                AuthException.class,
                () -> client.fromZipBytes(ZIP, null, true)).getMessage());
        assertEquals("zip filename required", assertThrows(
                AuthException.class,
                () -> client.fromZipBytes(ZIP, "config.yaml", true)).getMessage());
        assertEquals("zip missing", assertThrows(
                AuthException.class,
                () -> client.fromZipBytes("not-zip".getBytes(StandardCharsets.UTF_8), "takeaway-like.zip", true))
                .getMessage());

        org.springframework.web.multipart.MultipartFile exploding =
                org.mockito.Mockito.mock(org.springframework.web.multipart.MultipartFile.class);
        org.mockito.Mockito.when(exploding.isEmpty()).thenReturn(false);
        org.mockito.Mockito.when(exploding.getOriginalFilename()).thenReturn("takeaway-like.zip");
        org.mockito.Mockito.when(exploding.getBytes()).thenThrow(new IOException("nope"));
        assertEquals("zip missing", assertThrows(
                AuthException.class, () -> client.fromZip(exploding, true)).getMessage());
    }

    @Test
    @DisplayName("writeJson failure and dest zip status below 200 map closed")
    void destZipWriteJsonAndInformationalStatus() throws Exception {
        ObjectMapper exploding = new ObjectMapper() {
            @Override
            public String writeValueAsString(Object value) throws com.fasterxml.jackson.core.JsonProcessingException {
                throw new com.fasterxml.jackson.databind.JsonMappingException(null, "nope");
            }
        };
        AuthException json = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), RestClient.builder(), exploding)
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(400, json.getStatus());
        assertEquals("one channel: url or zip", json.getMessage());

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(once(), requestTo("http://127.0.0.1:3033/adopt/zip"))
                .andRespond(withStatus(HttpStatus.CONTINUE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body("{\"ok\":false,\"error\":\"early\"}"));
        AuthException early = assertThrows(
                AuthException.class,
                () -> new AdoptClient(
                        new AdoptProperties("http://127.0.0.1:3033"), builder, new ObjectMapper())
                        .destZip(Map.of("dest", "generated-projects/adopt-takeaway-like")));
        assertEquals(503, early.getStatus());
        assertEquals("early", early.getMessage());
        server.verify();
    }
}
