package dev.multistack.app.controller;

import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.config.CorsConfig;
import dev.multistack.app.config.SecurityConfig;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Epic("Contract")
@Feature("OpenAPI")
@Severity(SeverityLevel.NORMAL)
@WebMvcTest(controllers = OpenApiController.class)
@Import({SecurityConfig.class, CorsConfig.class})
@DisplayName("OpenApiController")
class OpenApiControllerTest extends SliceTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("GET /api/openapi.yaml is the classpath copy of _contract/openapi.yaml")
    void specMatchesContractCopy() throws Exception {
        byte[] expected = Files.readAllBytes(Path.of("src/main/resources/openapi.yaml"));
        byte[] ssot = Files.readAllBytes(Path.of("../../../_contract/openapi.yaml"));
        assertArrayEquals(ssot, expected);

        byte[] body = mockMvc.perform(get("/api/openapi.yaml"))
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/yaml"))
                .andReturn()
                .getResponse()
                .getContentAsByteArray();
        assertArrayEquals(expected, body);
    }

    @Test
    @DisplayName("GET /api/docs is Swagger UI pointed at ./openapi.yaml")
    void docsServesSwaggerUi() throws Exception {
        mockMvc.perform(get("/api/docs"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/html"))
                .andExpect(content().string(containsString("SwaggerUIBundle")))
                .andExpect(content().string(containsString("./openapi.yaml")));
    }
}
