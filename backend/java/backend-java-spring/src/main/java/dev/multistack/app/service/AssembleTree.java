package dev.multistack.app.service;

import dev.multistack.app.config.AssembleProperties;
import dev.multistack.app.dto.AssembleZip;
import dev.multistack.app.dto.GithubTreeBlob;
import dev.multistack.app.exception.AuthException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
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
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

/**
 * Dest user and dest cloud push YAML = Home dump; classpath is not canon.
 * Tree = unzip of the dest zip (POST YAML to {@code ASSEMBLE_URL}, destination forced zip).
 * Dest zip download = the same POST, zip bytes on {@code POST /api/assemble}.
 * Dest cloud push uses this same zip. Never a PAT, never {@code assemble-landing.yaml}.
 */
@Component
@EnableConfigurationProperties(AssembleProperties.class)
public class AssembleTree {

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
    private static final Pattern DESTINATION_CHANNEL = Pattern.compile(
            "(?m)^destination:\\s*(?:user|catalog|cloud)\\s*$");
    private static final Pattern ZIP_FILENAME = Pattern.compile(
            "filename=\"([^\"]+\\.zip)\"", Pattern.CASE_INSENSITIVE);
    private static final Pattern GITHUB_NAME = Pattern.compile("^[A-Za-z0-9][A-Za-z0-9._-]*$");
    private static final Pattern E2E_LINE = Pattern.compile("^([ \\t]*)e2e:\\s*(.*)$");
    private static final Pattern FLOW_STACK = Pattern.compile(
            "\\bstack:\\s*([A-Za-z0-9][A-Za-z0-9._-]*)");
    private static final Pattern STACK_LINE = Pattern.compile("^[ \\t]*stack:\\s*(\\S+)\\s*$");

    private final List<GithubTreeBlob> injected;
    private final AssembleProperties properties;
    private final RestClient restClient;

    @Autowired
    public AssembleTree(AssembleProperties properties, RestClient.Builder restClientBuilder) {
        this.injected = null;
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    AssembleTree(List<GithubTreeBlob> blobs) {
        this.injected = List.copyOf(blobs);
        this.properties = null;
        this.restClient = null;
    }

    AssembleTree(byte[] zip) {
        this(fromZip(zip));
    }

    public List<GithubTreeBlob> blobs() {
        return blobs(null);
    }

    public List<GithubTreeBlob> blobs(String yaml) {
        if (injected != null) {
            return injected;
        }
        return fromZip(postStand(yaml).body());
    }

    /** Dest zip bytes for {@code POST /api/assemble}. JSON or an empty body is 503, not a stub. */
    public AssembleZip zip(String yaml) {
        if (injected != null) {
            throw new AuthException(503, "assemble zip missing");
        }
        AssembleZip fetched = postStand(yaml);
        if (!zipMagic(fetched.body())) {
            throw new AuthException(503, "assemble zip missing");
        }
        return fetched;
    }

    static String zipFilename(String header) {
        if (header == null || header.isBlank()) {
            return AssembleZip.DEFAULT_FILENAME;
        }
        Matcher match = ZIP_FILENAME.matcher(header);
        if (!match.find()) {
            return AssembleZip.DEFAULT_FILENAME;
        }
        String name = match.group(1).strip();
        if (name.contains("/") || name.contains("\\")) {
            return AssembleZip.DEFAULT_FILENAME;
        }
        return name;
    }

    /** Stand assemble-zip accepts destination zip only. Channel user/catalog/cloud is not this POST. */
    static String standYaml(String yaml) {
        if (yaml == null) {
            return "";
        }
        return DESTINATION_CHANNEL.matcher(yaml.strip()).replaceAll("destination: zip");
    }

    /** Dest user repo name = coverageProfile.automation.e2e.stack from YAML Home. Never a frozen stack. */
    static String e2eStack(String yaml) {
        if (yaml == null || yaml.isBlank()) {
            throw new AuthException(400, "assemble yaml missing");
        }
        String found = null;
        int e2eIndent = -1;
        for (String line : yaml.split("\\R", -1)) {
            Matcher e2e = E2E_LINE.matcher(line);
            if (e2e.matches()) {
                String rest = e2e.group(2).strip();
                e2eIndent = e2e.group(1).length();
                if (rest.startsWith("{")) {
                    Matcher flow = FLOW_STACK.matcher(rest);
                    if (flow.find()) {
                        found = flow.group(1);
                        break;
                    }
                    throw stackMissing();
                }
                continue;
            }
            if (e2eIndent < 0) {
                continue;
            }
            int indent = leadingIndent(line);
            if (indent == line.length()) {
                continue;
            }
            if (indent <= e2eIndent) {
                break;
            }
            Matcher stack = STACK_LINE.matcher(line);
            if (stack.matches()) {
                found = stack.group(1);
                break;
            }
        }
        if (found == null || !GITHUB_NAME.matcher(found).matches()) {
            throw stackMissing();
        }
        return found;
    }

    private static int leadingIndent(String line) {
        int n = 0;
        while (n < line.length() && (line.charAt(n) == ' ' || line.charAt(n) == '\t')) {
            n++;
        }
        return n;
    }

    private static AuthException stackMissing() {
        return new AuthException(400, "assemble e2e.stack missing");
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

    private AssembleZip postStand(String yaml) {
        if (!properties.configured()) {
            throw new AuthException(503, "assemble url missing");
        }
        String stand = standYaml(yaml);
        if (stand.isBlank()) {
            throw new AuthException(400, "assemble yaml missing");
        }
        try {
            return restClient.post()
                    .uri(properties.assembleEndpoint())
                    .contentType(YAML)
                    .accept(MediaType.parseMediaType("application/zip"))
                    .body(stand)
                    .exchange((request, response) -> {
                        if (response.getStatusCode().value() != 200) {
                            throw new AuthException(503, "assemble zip missing");
                        }
                        byte[] body = response.getBody().readAllBytes();
                        if (!zipMagic(body)) {
                            return new AssembleZip(new byte[0], AssembleZip.DEFAULT_FILENAME);
                        }
                        return new AssembleZip(
                                body,
                                zipFilename(response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)));
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
