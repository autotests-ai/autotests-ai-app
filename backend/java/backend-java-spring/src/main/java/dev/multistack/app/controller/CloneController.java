package dev.multistack.app.controller;

import dev.multistack.app.dto.CloneZip;
import dev.multistack.app.service.CloneClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Course preset zip, same-origin. Empty body → {@code ASSEMBLE_URL}/clone.
 * YAML dump is {@code POST /api/assemble}. Not a {@code CLONE_URL}.
 */
@RestController
@RequestMapping("/api")
public class CloneController {

    private static final MediaType ZIP = MediaType.parseMediaType("application/zip");

    private final CloneClient cloneClient;

    public CloneController(CloneClient cloneClient) {
        this.cloneClient = cloneClient;
    }

    @PostMapping("/clone")
    public ResponseEntity<byte[]> cloneCourse(@RequestBody(required = false) String body) {
        CloneZip zip = cloneClient.zip(body);
        return ResponseEntity.ok()
                .contentType(ZIP)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + zip.filename() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(zip.body());
    }
}
