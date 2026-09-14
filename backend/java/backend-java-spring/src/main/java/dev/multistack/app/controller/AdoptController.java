package dev.multistack.app.controller;

import dev.multistack.app.dto.AdoptZip;
import dev.multistack.app.service.AdoptClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * Home import URL/zip. Same dest as CLI adopt-fill. Not {@code POST /api/assemble}.
 */
@RestController
@RequestMapping("/api")
public class AdoptController {

    private static final MediaType ZIP = MediaType.parseMediaType("application/zip");

    private final AdoptClient adoptClient;

    public AdoptController(AdoptClient adoptClient) {
        this.adoptClient = adoptClient;
    }

    @PostMapping(value = "/adopt", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Map<String, Object>> adoptUrl(
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(name = "dry_run", required = false, defaultValue = "false") boolean dryRun) {
        return json(adoptClient.fromUrl(body, dryRun));
    }

    @PostMapping(value = "/adopt", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> adoptZip(
            @RequestParam("zip") MultipartFile zip,
            @RequestParam(name = "dry_run", required = false, defaultValue = "false") boolean dryRun) {
        return json(adoptClient.fromZip(zip, dryRun));
    }

    @PostMapping(value = "/adopt", consumes = "application/zip")
    public ResponseEntity<Map<String, Object>> adoptZipRaw(
            @RequestBody byte[] zip,
            @RequestHeader(value = HttpHeaders.CONTENT_DISPOSITION, required = false) String disposition,
            @RequestParam(name = "dry_run", required = false, defaultValue = "false") boolean dryRun) {
        String filename = disposition == null || disposition.isBlank()
                ? ""
                : disposition;
        return json(adoptClient.fromZipBytes(zip, filename, dryRun));
    }

    @PostMapping(value = "/adopt/zip", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<byte[]> destZip(@RequestBody(required = false) Map<String, Object> body) {
        AdoptZip zip = adoptClient.destZip(body);
        return ResponseEntity.ok()
                .contentType(ZIP)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + zip.filename() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(zip.body());
    }

    private static ResponseEntity<Map<String, Object>> json(Map<String, Object> body) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(body);
    }
}
