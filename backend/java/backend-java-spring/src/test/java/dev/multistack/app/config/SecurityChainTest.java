package dev.multistack.app.config;

import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.controller.AdoptController;
import dev.multistack.app.controller.ApiController;
import dev.multistack.app.controller.AssembleController;
import dev.multistack.app.controller.AuthController;
import dev.multistack.app.controller.CloudRepoController;
import dev.multistack.app.controller.GithubOAuthController;
import dev.multistack.app.controller.OpenApiController;
import dev.multistack.app.dto.AssembleZip;
import dev.multistack.app.dto.CloudRepoPushResponse;
import dev.multistack.app.dto.CloudRepoResponse;
import dev.multistack.app.dto.GithubOAuthPushResponse;
import dev.multistack.app.dto.GithubOAuthRepoResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.dto.GithubOAuthSession;
import dev.multistack.app.dto.UserProfileResponse;
import dev.multistack.app.service.AdoptClient;
import dev.multistack.app.service.AssembleTree;
import dev.multistack.app.service.AuthService;
import dev.multistack.app.service.CloudRepoService;
import dev.multistack.app.service.GithubOAuthService;
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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
@WebMvcTest(controllers = {
        ApiController.class, AssembleController.class, AdoptController.class, AuthController.class, OpenApiController.class,
        GithubOAuthController.class, CloudRepoController.class
})
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

    @MockitoBean
    private GithubOAuthService githubOAuthService;

    @MockitoBean
    private CloudRepoService cloudRepoService;

    @MockitoBean
    private AssembleTree assembleTree;

    @MockitoBean
    private AdoptClient adoptClient;

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
    @DisplayName("POST /api/oauth/github is public and returns login without a token")
    void oauthGithubPermitAllReturnsLogin() throws Exception {
        when(githubOAuthService.exchange(any(GithubOAuthRequest.class)))
                .thenReturn(new GithubOAuthSession("octocat", "gho_secret"));
        when(githubOAuthService.toCookie(any(), anyBoolean()))
                .thenReturn(ResponseCookie.from(GithubOAuthService.COOKIE_NAME, "gho_secret")
                        .httpOnly(true)
                        .path(GithubOAuthService.COOKIE_PATH)
                        .build());

        mockMvc.perform(post("/api/oauth/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"gh-code\",\"state\":\"csrf\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value("octocat"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("token"))))
                .andExpect(content().string(not(containsString("gho_secret"))));
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos is public (cookie, not JWT)")
    void oauthCreateRepoPermitAll() throws Exception {
        when(githubOAuthService.createRepo(nullable(String.class), nullable(String.class)))
                .thenReturn(new GithubOAuthRepoResponse(
                        "octocat",
                        GithubOAuthService.htmlUrl("octocat", "python-pytest"),
                        true));

        mockMvc.perform(post("/api/oauth/github/repos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created").value(true))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("gho_secret"))));
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos/contents is public (cookie, not JWT)")
    void oauthPushTreePermitAll() throws Exception {
        when(githubOAuthService.pushTree(nullable(String.class), nullable(String.class)))
                .thenReturn(new GithubOAuthPushResponse(
                        "octocat",
                        GithubOAuthService.htmlUrl("octocat", "python-pytest"),
                        true));

        mockMvc.perform(post("/api/oauth/github/repos/contents")
                        .contentType(MediaType.parseMediaType("application/yaml"))
                        .content("destination: zip\n"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pushed").value(true))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("gho_secret"))));
    }

    @Test
    @DisplayName("POST /api/cloud/repos is public (IdP cookie, not JWT)")
    void cloudCreateRepoPermitAll() throws Exception {
        when(cloudRepoService.createRepo(nullable(String.class), nullable(String.class)))
                .thenReturn(new CloudRepoResponse(
                        "qaguru",
                        CloudRepoService.htmlUrl("qaguru", "python-pytest"),
                        true));

        mockMvc.perform(post("/api/cloud/repos"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.created").value(true))
                .andExpect(jsonPath("$.url").value(
                        "https://github.com/autotests-cloud/qaguru-python-pytest"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.pushed").doesNotExist())
                .andExpect(content().string(not(containsString("gho_secret"))))
                .andExpect(content().string(not(containsString("idp_secret"))));
    }

    @Test
    @DisplayName("POST /api/cloud/repos/contents is public (IdP cookie, not JWT)")
    void cloudPushTreePermitAll() throws Exception {
        when(cloudRepoService.pushTree(nullable(String.class), nullable(String.class)))
                .thenReturn(new CloudRepoPushResponse(
                        "qaguru",
                        CloudRepoService.htmlUrl("qaguru", "python-pytest"),
                        true));

        mockMvc.perform(post("/api/cloud/repos/contents")
                        .contentType(MediaType.parseMediaType("application/yaml"))
                        .content("destination: zip\n"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pushed").value(true))
                .andExpect(jsonPath("$.url").value(
                        "https://github.com/autotests-cloud/qaguru-python-pytest"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.created").doesNotExist())
                .andExpect(content().string(not(containsString("gho_secret"))))
                .andExpect(content().string(not(containsString("idp_secret"))))
                .andExpect(content().string(not(containsString("octocat"))));
    }

    @Test
    @DisplayName("POST /api/assemble is public and returns zip bytes")
    void assemblePermitAllReturnsZip() throws Exception {
        byte[] zip = new byte[] {0x50, 0x4b, 0x03, 0x04};
        when(assembleTree.zip(nullable(String.class)))
                .thenReturn(new AssembleZip(zip, "assemble-java-default.zip"));

        mockMvc.perform(post("/api/assemble")
                        .contentType(MediaType.parseMediaType("application/yaml"))
                        .content("destination: zip\n"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/zip"))
                .andExpect(header().string(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"assemble-java-default.zip\""))
                .andExpect(content().bytes(zip))
                .andExpect(content().string(not(containsString("gho_secret"))));
    }

    @Test
    @DisplayName("POST /api/adopt is public and returns dest JSON, not zip")
    void adoptPermitAllReturnsJson() throws Exception {
        when(adoptClient.fromUrl(any(), anyBoolean()))
                .thenReturn(Map.of(
                        "ok", true,
                        "mode", "adopt",
                        "created", false,
                        "dest", "generated-projects/adopt-takeaway-like"));

        mockMvc.perform(post("/api/adopt")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"url\":\"https://github.com/org/repo\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mode").value("adopt"))
                .andExpect(jsonPath("$.dest").value("generated-projects/adopt-takeaway-like"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(content().string(not(containsString("gho_secret"))))
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
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
                        HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "http://localhost:5173"))
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_CREDENTIALS, "true"));
    }

    @Test
    @DisplayName("non-API paths are denied")
    void nonApiDenied() throws Exception {
        mockMvc.perform(get("/login")).andExpect(status().isUnauthorized());
    }
}
