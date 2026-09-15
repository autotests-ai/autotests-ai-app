package dev.multistack.app.service;

import dev.multistack.app.config.AssembleProperties;
import dev.multistack.app.dto.CloneZip;
import dev.multistack.app.exception.AuthException;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Home «как на курсе» zip via {@code ASSEMBLE_URL}/clone. Empty body is the
 * course preset. Never {@code AssembleTree.zip(yaml)}. Never a {@code CLONE_URL}.
 * Never mill. Never a PAT.
 */
@Component
@EnableConfigurationProperties(AssembleProperties.class)
public class CloneClient {

    public static final String BODY_ERROR =
            "clone preset takes an empty body (YAML dump is assemble /assemble)";
    private static final Pattern ZIP_FILENAME = Pattern.compile(
            "filename=\"([^\"]+\\.zip)\"", Pattern.CASE_INSENSITIVE);

    private final AssembleProperties properties;
    private final RestClient restClient;

    public CloneClient(AssembleProperties properties, RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
    }

    public CloneZip zip(String body) {
        assertEmpty(body);
        if (!properties.configured()) {
            throw new AuthException(503, "assemble url missing");
        }
        try {
            return restClient.post()
                    .uri(properties.cloneEndpoint())
                    .accept(MediaType.parseMediaType("application/zip"))
                    .exchange((request, response) -> readZip(
                            response.getStatusCode().value(),
                            response.getBody().readAllBytes(),
                            response.getHeaders().getFirst(HttpHeaders.CONTENT_DISPOSITION)));
        } catch (AuthException ex) {
            throw ex;
        } catch (RestClientException ex) {
            throw new AuthException(503, "clone zip missing");
        }
    }

    static void assertEmpty(String body) {
        if (body != null && !body.isBlank()) {
            throw new AuthException(400, BODY_ERROR);
        }
    }

    static String zipFilename(String header) {
        if (header == null || header.isBlank()) {
            return CloneZip.DEFAULT_FILENAME;
        }
        Matcher match = ZIP_FILENAME.matcher(header);
        if (!match.find()) {
            return CloneZip.DEFAULT_FILENAME;
        }
        String name = match.group(1).strip();
        if (name.contains("/") || name.contains("\\")) {
            return CloneZip.DEFAULT_FILENAME;
        }
        return name;
    }

    static boolean zipMagic(byte[] data) {
        return data != null && data.length >= 2 && data[0] == 'P' && data[1] == 'K';
    }

    private static CloneZip readZip(int status, byte[] body, String disposition) {
        if (status == 400) {
            throw new AuthException(400, BODY_ERROR);
        }
        if (status != 200 || !zipMagic(body)) {
            throw new AuthException(503, "clone zip missing");
        }
        return new CloneZip(body, zipFilename(disposition));
    }
}
