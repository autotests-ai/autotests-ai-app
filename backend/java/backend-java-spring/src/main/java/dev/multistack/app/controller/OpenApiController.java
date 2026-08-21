package dev.multistack.app.controller;

import java.io.IOException;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Serves the shared contract ({@code _contract/openapi.yaml} copied into the classpath)
 * and a Swagger UI that points at that file. Not springdoc — the yaml is SSOT.
 */
@RestController
@RequestMapping("/api")
public class OpenApiController {

    static final MediaType YAML = MediaType.parseMediaType("application/yaml");

    @GetMapping("/openapi.yaml")
    public ResponseEntity<byte[]> spec() throws IOException {
        return ResponseEntity.ok().contentType(YAML).body(read("openapi.yaml"));
    }

    @GetMapping(value = "/docs", produces = MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<byte[]> docs() throws IOException {
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(read("openapi-docs.html"));
    }

    private static byte[] read(String name) throws IOException {
        return new ClassPathResource(name).getContentAsByteArray();
    }
}
