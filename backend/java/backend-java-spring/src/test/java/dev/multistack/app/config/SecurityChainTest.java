package dev.multistack.app.config;

import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.controller.ApiController;
import dev.multistack.app.controller.AuthController;
import dev.multistack.app.controller.OpenApiController;
import dev.multistack.app.dto.UserProfileResponse;
import dev.multistack.app.service.AuthService;
import dev.multistack.app.service.ItemService;
import dev.multistack.app.service.JwtService;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The one slice where {@link JwtAuthFilter} runs with a <em>real</em> {@link JwtService}:
 * requests carry actual {@code Authorization: Bearer} headers and pass (or fail) through the
 * full security chain — no {@code SecurityMockMvcRequestPostProcessors} shortcuts here.
 */
@Epic("Security")
@Feature("Security chain")
@Severity(SeverityLevel.CRITICAL)
@WebMvcTest(controllers = {ApiController.class, AuthController.class, OpenApiController.class})
@Import({SecurityChainTest.RealJwtConfig.class, SecurityConfig.class, CorsConfig.class})
@DisplayName("Security chain with real JWT filter")
class SecurityChainTest extends SliceTestBase {

    private static final String SECRET = "security-chain-test-secret-at-least-32-chars";
    private static final long ONE_HOUR_MS = 3_600_000;

    @TestConfiguration
    static class RealJwtConfig {
        @Bean
        JwtService jwtService() {
            return new JwtService(SECRET, ONE_HOUR_MS);
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtService jwtService;

    @MockitoBean
    private ItemService itemService;

    @MockitoBean
    private AuthService authService;

    @Test
    @DisplayName("GET /api/auth/me with a real bearer token passes the filter chain")
    void meWithRealBearerToken() throws Exception {
        when(authService.profile("user1")).thenReturn(new UserProfileResponse("user1"));
        String token = jwtService.createToken("user1");

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("user1"));
    }

    @Test
    @DisplayName("GET /api/auth/me with a tampered token returns 401")
    void meWithTamperedToken() throws Exception {
        String tampered = jwtService.createToken("user1") + "xx";

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tampered))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/auth/me with an expired token returns 401")
    void meWithExpiredToken() throws Exception {
        String expired = new JwtService(SECRET, -ONE_HOUR_MS).createToken("user1");

        mockMvc.perform(get("/api/auth/me")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + expired))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/openapi.yaml is public")
    void openapiYamlPermitAll() throws Exception {
        mockMvc.perform(get("/api/openapi.yaml")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/docs is public")
    void openapiDocsPermitAll() throws Exception {
        mockMvc.perform(get("/api/docs")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("unmapped /api/** path requires authentication (catch-all)")
    void unmappedApiPathRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/nope"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("unmapped /api/** path with a valid token is 404, not 401")
    void unmappedApiPathWithTokenIsNotFound() throws Exception {
        String token = jwtService.createToken("user1");

        mockMvc.perform(get("/api/nope")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("CORS preflight for /api/items answers the configured dev origin")
    void corsPreflightAllowsConfiguredOrigin() throws Exception {
        mockMvc.perform(options("/api/items")
                        .header(HttpHeaders.ORIGIN, "http://localhost:5173")
                        .header(HttpHeaders.ACCESS_CONTROL_REQUEST_METHOD, "GET"))
                .andExpect(status().isOk())
                .andExpect(header().string(
                        HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"));
    }

    @Test
    @DisplayName("non-API paths are denied")
    void nonApiDenied() throws Exception {
        mockMvc.perform(get("/login")).andExpect(status().isUnauthorized());
    }
}
