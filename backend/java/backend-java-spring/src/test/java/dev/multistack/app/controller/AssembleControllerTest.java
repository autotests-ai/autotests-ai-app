package dev.multistack.app.controller;

import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.config.CorsConfig;
import dev.multistack.app.config.SecurityConfig;
import dev.multistack.app.dto.AssembleZip;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.service.AssembleTree;
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

@Epic("Assemble")
@Feature("AssembleController")
@Severity(SeverityLevel.CRITICAL)
@WebMvcTest(controllers = AssembleController.class)
@Import({AuthExceptionHandler.class, SecurityConfig.class, CorsConfig.class})
@DisplayName("AssembleController")
class AssembleControllerTest extends SliceTestBase {

    private static final String YAML = """
            destination: zip
            coverageProfile:
              automation:
                e2e: { access: write, stack: python-pytest, module: tests/python }
            """;
    private static final MediaType YAML_TYPE = MediaType.parseMediaType("application/yaml");
    private static final byte[] ZIP_BYTES = new byte[] {0x50, 0x4b, 0x03, 0x04};

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AssembleTree assembleTree;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /api/assemble returns zip bytes via ASSEMBLE_URL")
    void assembleReturnsZipBytes() throws Exception {
        when(assembleTree.zip(YAML))
                .thenReturn(new AssembleZip(ZIP_BYTES, "assemble-java-default.zip"));

        mockMvc.perform(post("/api/assemble")
                        .contentType(YAML_TYPE)
                        .content(YAML))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/zip"))
                .andExpect(header().string(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"assemble-java-default.zip\""))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(content().bytes(ZIP_BYTES))
                .andExpect(content().string(not(containsString("token"))))
                .andExpect(content().string(not(containsString("assemble-landing.yaml"))));

        verify(assembleTree).zip(YAML);
    }

    @Test
    @DisplayName("POST /api/assemble is 400 without YAML")
    void assembleRequiresYaml() throws Exception {
        when(assembleTree.zip(nullable(String.class)))
                .thenThrow(new AuthException(400, "assemble yaml missing"));

        mockMvc.perform(post("/api/assemble"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("assemble yaml missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("assemble-landing.yaml"))));
    }

    @Test
    @DisplayName("POST /api/assemble is 503 without ASSEMBLE_URL")
    void assembleRequiresUrl() throws Exception {
        when(assembleTree.zip(eq(YAML)))
                .thenThrow(new AuthException(503, "assemble url missing"));

        mockMvc.perform(post("/api/assemble")
                        .contentType(YAML_TYPE)
                        .content(YAML))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("assemble url missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))));
    }

    @Test
    @DisplayName("POST /api/assemble is 503 when assemble-zip does not return a zip")
    void assembleMapsMissingZip() throws Exception {
        when(assembleTree.zip(eq(YAML)))
                .thenThrow(new AuthException(503, "assemble zip missing"));

        mockMvc.perform(post("/api/assemble")
                        .contentType(YAML_TYPE)
                        .content(YAML))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("assemble zip missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))));
    }
}
