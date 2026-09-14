package dev.multistack.app.controller;

import dev.multistack.app.dto.AssembleZip;
import dev.multistack.app.service.AssembleTree;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Dest zip bytes, same-origin. YAML is posted to {@code ASSEMBLE_URL}; the browser
 * does not CORS to assemble-zip as the happy path.
 */
@RestController
@RequestMapping("/api")
public class AssembleController {

    private static final MediaType ZIP = MediaType.parseMediaType("application/zip");

    private final AssembleTree assembleTree;

    public AssembleController(AssembleTree assembleTree) {
        this.assembleTree = assembleTree;
    }

    @PostMapping("/assemble")
    public ResponseEntity<byte[]> assemble(@RequestBody(required = false) String yaml) {
        AssembleZip zip = assembleTree.zip(yaml);
        return ResponseEntity.ok()
                .contentType(ZIP)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + zip.filename() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(zip.body());
    }
}
