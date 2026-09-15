package dev.multistack.app.controller;

import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.config.CorsConfig;
import dev.multistack.app.config.SecurityConfig;
import dev.multistack.app.dto.CloneZip;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.service.CloneClient;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Epic("Clone")
@Feature("CloneController")
@Severity(SeverityLevel.CRITICAL)
@WebMvcTest(controllers = CloneController.class)
@Import({AuthExceptionHandler.class, SecurityConfig.class, CorsConfig.class})
@DisplayName("CloneController")
class CloneControllerTest extends SliceTestBase {

    private static final String YAML = """
            destination: zip
            coverageProfile:
              harness:
                mill: { access: write }
            """;
    private static final MediaType YAML_TYPE = MediaType.parseMediaType("application/yaml");
    private static final byte[] ZIP_BYTES = new byte[] {0x50, 0x4b, 0x03, 0x04};

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CloneClient cloneClient;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /api/clone empty body returns zip via ASSEMBLE_URL/clone")
    void cloneReturnsZipBytes() throws Exception {
        when(cloneClient.zip(nullable(String.class)))
                .thenReturn(new CloneZip(ZIP_BYTES, "clone-as-student.zip"));

        mockMvc.perform(post("/api/clone"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/zip"))
                .andExpect(header().string(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"clone-as-student.zip\""))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(content().bytes(ZIP_BYTES))
                .andExpect(content().string(not(containsString("token"))))
                .andExpect(content().string(not(containsString("mill"))))
                .andExpect(content().string(not(containsString("/assemble"))));

        verify(cloneClient).zip(nullable(String.class));
    }

    @Test
    @DisplayName("POST /api/clone YAML dump is 400, not /api/assemble")
    void cloneRejectsYamlBody() throws Exception {
        when(cloneClient.zip(eq(YAML)))
                .thenThrow(new AuthException(400, CloneClient.BODY_ERROR));

        mockMvc.perform(post("/api/clone")
                        .contentType(YAML_TYPE)
                        .content(YAML))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(CloneClient.BODY_ERROR))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("assemble zip"))))
                .andExpect(content().string(not(containsString("CLONE_URL"))));
    }

    @Test
    @DisplayName("POST /api/clone JSON PAT dump is 400")
    void cloneRejectsPatJson() throws Exception {
        String json = "{\"token\":\"ghp_x\",\"destination\":\"zip\"}";
        when(cloneClient.zip(eq(json)))
                .thenThrow(new AuthException(400, CloneClient.BODY_ERROR));

        mockMvc.perform(post("/api/clone")
                        .contentType(MediaType.TEXT_PLAIN)
                        .content(json))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(CloneClient.BODY_ERROR))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("ghp_"))));
    }

    @Test
    @DisplayName("POST /api/clone is 503 without ASSEMBLE_URL")
    void cloneRequiresUrl() throws Exception {
        when(cloneClient.zip(nullable(String.class)))
                .thenThrow(new AuthException(503, "assemble url missing"));

        mockMvc.perform(post("/api/clone"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("assemble url missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("CLONE_URL"))));
    }

    @Test
    @DisplayName("POST /api/clone is 503 when assemble-zip does not return a zip")
    void cloneMapsMissingZip() throws Exception {
        when(cloneClient.zip(nullable(String.class)))
                .thenThrow(new AuthException(503, "clone zip missing"));

        mockMvc.perform(post("/api/clone"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("clone zip missing"))
                .andExpect(content().string(not(containsString("access_token"))));
    }
}
