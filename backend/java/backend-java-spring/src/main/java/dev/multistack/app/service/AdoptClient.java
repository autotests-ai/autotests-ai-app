package dev.multistack.app.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.config.AdoptProperties;
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
 * Never {@code POST /api/assemble}. Never a PAT.
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
        return postJson(assertPublicUrl(url), runDry);
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

    static String assertPublicUrl(String url) {
        String text = url == null ? "" : url.strip();
        String lower = text.toLowerCase(Locale.ROOT);
        if (lower.contains("token=") || lower.contains("pat=")) {
            throw new AuthException(400, "PAT not allowed");
        }
        if (text.contains("@") || text.startsWith("git@") || lower.startsWith("ssh://")) {
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

    private Map<String, Object> postJson(String url, boolean dryRun) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("url", url);
        return postStand(MediaType.APPLICATION_JSON, writeJson(body), null, dryRun);
    }

    private Map<String, Object> postZip(byte[] zip, String filename, boolean dryRun) {
        return postStand(ZIP, zip, "attachment; filename=\"" + filename + "\"", dryRun);
    }

    private Map<String, Object> postStand(MediaType type, byte[] body, String disposition, boolean dryRun) {
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
        int mapped = status == 400 || status == 413 || status == 504 ? status : 503;
        throw new AuthException(mapped, message);
    }

    private byte[] writeJson(Map<String, Object> body) {
        try {
            return objectMapper.writeValueAsString(body).getBytes(StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new AuthException(400, "one channel: url or zip");
        }
    }
}
