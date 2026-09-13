package dev.multistack.app.service;

import dev.multistack.app.config.AssembleProperties;
import dev.multistack.app.dto.GithubTreeBlob;
import dev.multistack.app.exception.AuthException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Dest user push tree = unzip of the dest zip (POST YAML to {@code ASSEMBLE_URL}).
 * Never a PAT, never the three-file classpath stub.
 */
@Component
@EnableConfigurationProperties(AssembleProperties.class)
public class AssembleTree {

    static final String LANDING_RESOURCE = "assemble-landing.yaml";
    static final Set<String> KEEP_ROOTS = Set.of(
            "backend",
            "frontend",
            "tests",
            "_contract",
            "docs",
            ".clinerules",
            ".cursor",
            ".github");
    static final Set<String> SKIP_SEGMENTS = Set.of(
            "node_modules",
            "build",
            ".gradle",
            "dist",
            "coverage",
            "allure-results",
            "bin",
            "__pycache__",
            ".vite");
    static final List<String> SKIP_SUBSTRINGS = List.of(
            "hw-check",
            "qa-homework-check",
            "05-homework-check");

    private static final MediaType YAML = MediaType.parseMediaType("application/yaml");

    private final List<GithubTreeBlob> injected;
    private final AssembleProperties properties;
    private final RestClient restClient;
    private final String landingYaml;

    @Autowired
    public AssembleTree(AssembleProperties properties, RestClient.Builder restClientBuilder) {
        this(properties, restClientBuilder, classpathLanding());
    }

    AssembleTree(AssembleProperties properties, RestClient.Builder restClientBuilder, String landingYaml) {
        this.injected = null;
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.landingYaml = landingYaml == null ? "" : landingYaml;
    }

    AssembleTree(List<GithubTreeBlob> blobs) {
        this.injected = List.copyOf(blobs);
        this.properties = null;
        this.restClient = null;
        this.landingYaml = "";
    }

    AssembleTree(byte[] zip) {
        this(fromZip(zip));
    }

    public List<GithubTreeBlob> blobs() {
        if (injected != null) {
            return injected;
        }
        if (!properties.configured()) {
            throw new AuthException(503, "assemble url missing");
        }
        if (landingYaml.isBlank()) {
            throw new AuthException(503, "assemble zip missing");
        }
        return fromZip(fetchZip());
    }

    static String classpathLanding() {
        return classpathLanding(LANDING_RESOURCE);
    }

    static String classpathLanding(String name) {
        try {
            return new ClassPathResource(name).getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException ex) {
            return "";
        }
    }

    static List<GithubTreeBlob> fromZip(byte[] zip) {
        if (zip == null || zip.length == 0) {
            return List.of();
        }
        return fromZipStream(new ByteArrayInputStream(zip));
    }

    static List<GithubTreeBlob> fromZipStream(InputStream in) {
        List<Raw> raws = new ArrayList<>();
        try (ZipInputStream zipStream = new ZipInputStream(in)) {
            ZipEntry entry;
            while ((entry = zipStream.getNextEntry()) != null) {
                if (entry.isDirectory()) {
                    continue;
                }
                raws.add(new Raw(posixName(entry.getName()), zipStream.readAllBytes()));
            }
        } catch (IOException ex) {
            return List.of();
        }
        String prefix = commonPrefix(raws.stream().map(Raw::name).toList());
        List<GithubTreeBlob> blobs = new ArrayList<>();
        for (Raw raw : raws) {
            String path = prefix.isEmpty() ? raw.name() : raw.name().substring(prefix.length());
            if (skip(path) || !utf8Text(raw.data())) {
                continue;
            }
            blobs.add(new GithubTreeBlob(path, new String(raw.data(), StandardCharsets.UTF_8)));
        }
        return List.copyOf(blobs);
    }

    static String posixName(String name) {
        String posix = name == null ? "" : name.replace('\\', '/');
        if (posix.startsWith("./")) {
            posix = posix.substring(2);
        }
        while (posix.startsWith("/")) {
            posix = posix.substring(1);
        }
        return posix;
    }

    static String commonPrefix(List<String> names) {
        if (names == null || names.isEmpty()) {
            return "";
        }
        String first = names.getFirst();
        int slash = first.indexOf('/');
        if (slash <= 0) {
            return "";
        }
        String candidate = first.substring(0, slash);
        if (KEEP_ROOTS.contains(candidate)) {
            return "";
        }
        String prefix = candidate + "/";
        for (String name : names) {
            if (!name.startsWith(prefix)) {
                return "";
            }
        }
        return prefix;
    }

    static boolean skip(String path) {
        if (path == null || path.isBlank() || path.contains("..")) {
            return true;
        }
        String posix = path.replace('\\', '/');
        if (posix.endsWith("/") || posix.equals(".DS_Store") || posix.endsWith("/.DS_Store")) {
            return true;
        }
        String lower = posix.toLowerCase(Locale.ROOT);
        for (String token : SKIP_SUBSTRINGS) {
            if (lower.contains(token)) {
                return true;
            }
        }
        for (String part : posix.split("/")) {
            if (SKIP_SEGMENTS.contains(part)) {
                return true;
            }
        }
        return false;
    }

    static boolean utf8Text(byte[] data) {
        if (data == null) {
            return false;
        }
        for (byte value : data) {
            if (value == 0) {
                return false;
            }
        }
        try {
            StandardCharsets.UTF_8.newDecoder()
                    .onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT)
                    .decode(ByteBuffer.wrap(data));
            return true;
        } catch (CharacterCodingException ex) {
            return false;
        }
    }

    static boolean zipMagic(byte[] data) {
        if (data == null || data.length < 2) {
            return false;
        }
        return data[0] == 'P' && data[1] == 'K';
    }

    private byte[] fetchZip() {
        try {
            return restClient.post()
                    .uri(properties.assembleEndpoint())
                    .contentType(YAML)
                    .accept(MediaType.parseMediaType("application/zip"))
                    .body(landingYaml)
                    .exchange((request, response) -> {
                        if (response.getStatusCode().value() != 200) {
                            throw new AuthException(503, "assemble zip missing");
                        }
                        byte[] body = response.getBody().readAllBytes();
                        if (!zipMagic(body)) {
                            return new byte[0];
                        }
                        return body;
                    });
        } catch (AuthException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AuthException(503, "assemble zip missing");
        }
    }

    private record Raw(String name, byte[] data) {
    }
}
