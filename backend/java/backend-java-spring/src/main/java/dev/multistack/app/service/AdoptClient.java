package dev.multistack.app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.config.AdoptProperties;
import dev.multistack.app.dto.AdoptZip;
import dev.multistack.app.exception.AuthException;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Home import URL/zip via {@code ADOPT_URL}. Same dest as CLI {@code adopt-fill.py}.
 * Never {@code POST /api/assemble}. Never a PAT. Never {@code GITHUB_CLOUD_TOKEN}.
 * Private GitHub URL uses the {@code github_oauth} cookie as {@code Authorization}
 * to the stand; the JSON body is {@code {url}} only.
 */
@Component
@EnableConfigurationProperties(AdoptProperties.class)
public class AdoptClient {

    static final Set<String> PAT_KEYS = Set.of(
            "pat",
            "token",
            "access_token",
            "access-token",
            "github_token",
            "github-token",
            "password",
            "secret",
            "authorization");
    static final Set<String> JSON_KEYS = Set.of("url", "dry_run", "dry-run");
    static final Set<String> ZIP_JSON_KEYS = Set.of("dest");
    private static final Pattern ADOPT_DEST = Pattern.compile(
            "^generated-projects/adopt-[A-Za-z0-9][A-Za-z0-9._-]*$");
    private static final Pattern GITHUB_HTTPS = Pattern.compile(
            "^https://github\\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+?(?:\\.git)?/?$",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern ZIP_NAME = Pattern.compile(
            "^[A-Za-z0-9][A-Za-z0-9._-]*\\.zip$", Pattern.CASE_INSENSITIVE);
    private static final Pattern ZIP_FILENAME = Pattern.compile(
            "filename=\"([^\"]+\\.zip)\"", Pattern.CASE_INSENSITIVE);
    private static final TypeReference<Map<String, Object>> MAP = new TypeReference<>() {
    };
    private static final MediaType ZIP = MediaType.parseMediaType("application/zip");

    private final AdoptProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public AdoptClient(
            AdoptProperties properties,
            RestClient.Builder restClientBuilder,
            ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    public Map<String, Object> fromUrl(Map<String, Object> body, boolean dryRun) {
        return fromUrl(body, dryRun, null);
    }

    public Map<String, Object> fromPrivateUrl(Map<String, Object> body, boolean dryRun, String accessToken) {
        if (accessToken == null || accessToken.isBlank()) {
            throw new AuthException(401, "oauth cookie missing");
        }
        return fromUrl(body, dryRun, accessToken);
    }

    public Map<String, Object> fromZip(MultipartFile zip, boolean dryRun) {
        if (zip == null || zip.isEmpty()) {
            throw new AuthException(400, "zip missing");
        }
        String filename = zipFilename(zip.getOriginalFilename());
        if (filename == null) {
            throw new AuthException(400, "zip filename required");
        }
        byte[] bytes;
        try {
            bytes = zip.getBytes();
        } catch (IOException ex) {
            throw new AuthException(400, "zip missing");
        }
        return fromZipBytes(bytes, filename, dryRun);
    }

    public Map<String, Object> fromZipBytes(byte[] zip, String filename, boolean dryRun) {
        String name = zipFilename(filename);
        if (filename == null || name == null) {
            throw new AuthException(400, "zip filename required");
        }
        if (!zipMagic(zip)) {
            throw new AuthException(400, "zip missing");
        }
        return postZip(zip, name, dryRun);
    }

    public AdoptZip destZip(Map<String, Object> body) {
        String dest = assertDestBody(body);
        if (!properties.configured()) {
            throw new AuthException(503, "adopt url missing");
        }
        byte[] json = writeJson(Map.of("dest", dest));
        try {
            return restClient.post()
                    .uri(properties.adoptZipEndpoint())
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(json)
                    .exchange((request, response) -> readDestZip(
                            response.getStatusCode().value(),
                            response.getBody().readAllBytes(),
                            response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)));
        } catch (AuthException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AuthException(503, "adopt zip missing");
        }
    }

    static String assertAdoptDest(String dest) {
        String text = dest == null ? "" : dest.strip();
        if (!ADOPT_DEST.matcher(text).matches()) {
            throw new AuthException(400, "dest must be generated-projects/adopt-<id>");
        }
        return text;
    }

    static String destZipFilename(String header) {
        String name = zipFilename(header);
        return name == null ? AdoptZip.DEFAULT_FILENAME : name;
    }

    static String assertPublicUrl(String url) {
        String text = url == null ? "" : url.strip();
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("token=") || lower.contains("pat=")) {
            throw new AuthException(400, "PAT not allowed");
        }
        if (text.startsWith("git@") || lower.startsWith("ssh://") || text.contains("@")) {
            throw new AuthException(400, "репо не публичный");
        }
        if (!GITHUB_HTTPS.matcher(text).matches()) {
            throw new AuthException(400, "url must be public https://github.com/org/repo");
        }
        return text;
    }

    static String zipFilename(String headerOrName) {
        if (headerOrName == null || headerOrName.isBlank()) {
            return null;
        }
        Matcher match = ZIP_FILENAME.matcher(headerOrName);
        String name = match.find() ? match.group(1).strip() : headerOrName.strip();
        if (name.contains("/") || name.contains("\\")) {
            return null;
        }
        if (!ZIP_NAME.matcher(name).matches()) {
            return null;
        }
        return name;
    }

    static boolean zipMagic(byte[] data) {
        return data != null && data.length >= 2 && data[0] == 'P' && data[1] == 'K';
    }

    private Map<String, Object> fromUrl(Map<String, Object> body, boolean dryRun, String accessToken) {
        if (body == null || body.isEmpty()) {
            throw new AuthException(400, "one channel: url or zip");
        }
        for (String key : body.keySet()) {
            String lower = key == null ? "" : key.toLowerCase(Locale.ROOT).strip();
            if (PAT_KEYS.contains(lower)) {
                throw new AuthException(400, "PAT not allowed");
            }
            if (!JSON_KEYS.contains(lower)) {
                throw new AuthException(400, "one channel: url or zip");
            }
        }
        Object rawUrl = body.get("url");
        if (!(rawUrl instanceof String url) || url.isBlank()) {
            throw new AuthException(400, "one channel: url or zip");
        }
        boolean runDry = dryRun
                || Boolean.TRUE.equals(body.get("dry_run"))
                || Boolean.TRUE.equals(body.get("dry-run"));
        return postJson(assertPublicUrl(url), runDry, accessToken);
    }

    private Map<String, Object> postJson(String url, boolean dryRun, String accessToken) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("url", url);
        return postStand(MediaType.APPLICATION_JSON, writeJson(body), null, dryRun, accessToken);
    }

    private Map<String, Object> postZip(byte[] zip, String filename, boolean dryRun) {
        return postStand(ZIP, zip, "attachment; filename=\"" + filename + "\"", dryRun, null);
    }

    private Map<String, Object> postStand(
            MediaType type,
            byte[] body,
            String disposition,
            boolean dryRun,
            String accessToken) {
        if (!properties.configured()) {
            throw new AuthException(503, "adopt url missing");
        }
        String uri = properties.adoptEndpoint();
        if (dryRun) {
            uri = uri + "?dry_run=1";
        }
        try {
            return restClient.post()
                    .uri(uri)
                    .contentType(type)
                    .headers(headers -> {
                        if (disposition != null) {
                            headers.set(HttpHeaders.CONTENT_DISPOSITION, disposition);
                        }
                        if (accessToken != null && !accessToken.isBlank()) {
                            headers.setBearerAuth(accessToken);
                        }
                    })
                    .body(body)
                    .exchange((request, response) -> readPayload(
                            response.getStatusCode().value(),
                            response.getBody().readAllBytes()));
        } catch (AuthException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AuthException(503, "adopt missing");
        }
    }

    private Map<String, Object> readPayload(int status, byte[] body) {
        Map<String, Object> parsed;
        try {
            parsed = objectMapper.readValue(body, MAP);
        } catch (IOException ex) {
            throw new AuthException(503, "adopt missing");
        }
        if (parsed == null) {
            throw new AuthException(503, "adopt missing");
        }
        if (status >= 200 && status < 300) {
            return parsed;
        }
        Object error = parsed.get("error");
        String message = error == null ? "adopt missing" : String.valueOf(error);
        int mapped = status == 400 || status == 401 || status == 413 || status == 504 ? status : 503;
        throw new AuthException(mapped, message);
    }

    private AdoptZip readDestZip(int status, byte[] body, String disposition) {
        if (status >= 200 && status < 300 && zipMagic(body)) {
            return new AdoptZip(body, destZipFilename(disposition));
        }
        Map<String, Object> parsed;
        try {
            parsed = objectMapper.readValue(body, MAP);
        } catch (IOException ex) {
            throw new AuthException(503, "adopt zip missing");
        }
        if (parsed == null) {
            throw new AuthException(503, "adopt zip missing");
        }
        Object error = parsed.get("error");
        String message = error == null ? "adopt zip missing" : String.valueOf(error);
        if (status == 400 || status == 413 || status == 504) {
            throw new AuthException(status, message);
        }
        throw new AuthException(503, message);
    }

    private String assertDestBody(Map<String, Object> body) {
        if (body == null || body.isEmpty()) {
            throw new AuthException(400, "dest must be generated-projects/adopt-<id>");
        }
        for (String key : body.keySet()) {
            String lower = key == null ? "" : key.toLowerCase(Locale.ROOT).strip();
            if (PAT_KEYS.contains(lower)) {
                throw new AuthException(400, "PAT not allowed");
            }
            if (!ZIP_JSON_KEYS.contains(lower)) {
                throw new AuthException(400, "dest must be generated-projects/adopt-<id>");
            }
        }
        Object raw = body.get("dest");
        if (!(raw instanceof String dest) || dest.isBlank()) {
            throw new AuthException(400, "dest must be generated-projects/adopt-<id>");
        }
        return assertAdoptDest(dest);
    }

    private byte[] writeJson(Map<String, Object> body) {
        try {
            return objectMapper.writeValueAsString(body).getBytes(StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new AuthException(400, "one channel: url or zip");
        }
    }
}
