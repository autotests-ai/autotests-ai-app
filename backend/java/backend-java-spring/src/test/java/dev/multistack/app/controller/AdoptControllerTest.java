package dev.multistack.app.controller;

import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.config.CorsConfig;
import dev.multistack.app.config.SecurityConfig;
import dev.multistack.app.dto.AdoptZip;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.service.AdoptClient;
import dev.multistack.app.service.JwtService;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Epic("Adopt")
@Feature("AdoptController")
@Severity(SeverityLevel.CRITICAL)
@WebMvcTest(controllers = AdoptController.class)
@Import({AuthExceptionHandler.class, SecurityConfig.class, CorsConfig.class})
@DisplayName("AdoptController")
class AdoptControllerTest extends SliceTestBase {

    private static final Map<String, Object> DEST = Map.of(
            "ok", true,
            "mode", "adopt",
            "created", false,
            "dest", "generated-projects/adopt-takeaway-like");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AdoptClient adoptClient;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /api/adopt JSON url returns CLI dest JSON")
    void adoptUrlReturnsDest() throws Exception {
        when(adoptClient.fromUrl(any(), eq(true))).thenReturn(DEST);

        mockMvc.perform(post("/api/adopt")
                        .param("dry_run", "true")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://github.com/org/repo\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.mode").value("adopt"))
                .andExpect(jsonPath("$.dest").value("generated-projects/adopt-takeaway-like"))
                .andExpect(jsonPath("$.created").value(false))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("assemble"))))
                .andExpect(content().string(not(containsString("ghp_"))));

        verify(adoptClient).fromUrl(any(), anyBoolean());
    }

    @Test
    @DisplayName("POST /api/adopt/zip returns adopt dest zip, not /api/assemble")
    void destZipReturnsBytes() throws Exception {
        when(adoptClient.destZip(any())).thenReturn(
                new AdoptZip(new byte[] {0x50, 0x4b, 0x03, 0x04}, "adopt-takeaway-like.zip"));

        mockMvc.perform(post("/api/adopt/zip")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dest\":\"generated-projects/adopt-takeaway-like\"}"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/zip"))
                .andExpect(header().string(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"adopt-takeaway-like.zip\""))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(content().bytes(new byte[] {0x50, 0x4b, 0x03, 0x04}))
                .andExpect(content().string(not(containsString("assemble"))));

        verify(adoptClient).destZip(any());
    }

    @Test
    @DisplayName("POST /api/adopt/zip is 400 on etalon dest")
    void destZipRejectsEtalon() throws Exception {
        when(adoptClient.destZip(any()))
                .thenThrow(new AuthException(400, "dest must be generated-projects/adopt-<id>"));

        mockMvc.perform(post("/api/adopt/zip")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dest\":\"generated-projects/assemble-java-default\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("dest must be generated-projects/adopt-<id>"))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/adopt zip bytes uses Content-Disposition filename")
    void adoptZipRawReturnsDest() throws Exception {
        when(adoptClient.fromZipBytes(any(), any(), anyBoolean())).thenReturn(DEST);

        mockMvc.perform(post("/api/adopt")
                        .contentType("application/zip")
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"takeaway-like.zip\"")
                        .content(new byte[] {0x50, 0x4b, 0x03, 0x04}))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dest").value("generated-projects/adopt-takeaway-like"))
                .andExpect(jsonPath("$.token").doesNotExist());

        mockMvc.perform(post("/api/adopt")
                        .contentType("application/zip")
                        .content(new byte[] {0x50, 0x4b, 0x03, 0x04}))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/adopt")
                        .contentType("application/zip")
                        .header(HttpHeaders.CONTENT_DISPOSITION, "   ")
                        .content(new byte[] {0x50, 0x4b, 0x03, 0x04}))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("POST /api/adopt zip upload is not /api/assemble")
    void adoptZipReturnsDest() throws Exception {
        when(adoptClient.fromZip(any(), anyBoolean())).thenReturn(DEST);
        MockMultipartFile zip = new MockMultipartFile(
                "zip", "takeaway-like.zip", "application/zip", new byte[] {0x50, 0x4b, 0x03, 0x04});

        mockMvc.perform(multipart("/api/adopt").file(zip))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dest").value("generated-projects/adopt-takeaway-like"))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(content().string(not(containsString("application/zip"))))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/adopt is 400 on PAT")
    void adoptRejectsPat() throws Exception {
        when(adoptClient.fromUrl(any(), anyBoolean()))
                .thenThrow(new AuthException(400, "PAT not allowed"));

        mockMvc.perform(post("/api/adopt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://github.com/org/repo\",\"token\":\"ghp_x\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("PAT not allowed"))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/adopt is 503 without ADOPT_URL")
    void adoptRequiresUrl() throws Exception {
        when(adoptClient.fromUrl(any(), anyBoolean()))
                .thenThrow(new AuthException(503, "adopt url missing"));

        mockMvc.perform(post("/api/adopt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://github.com/org/repo\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("adopt url missing"))
                .andExpect(content().string(not(containsString("assemble url missing"))));
    }

    @Test
    @DisplayName("POST /api/adopt/zip is 503 without ADOPT_URL")
    void destZipRequiresUrl() throws Exception {
        when(adoptClient.destZip(any()))
                .thenThrow(new AuthException(503, "adopt url missing"));

        mockMvc.perform(post("/api/adopt/zip")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dest\":\"generated-projects/adopt-takeaway-like\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("adopt url missing"));
    }
}
