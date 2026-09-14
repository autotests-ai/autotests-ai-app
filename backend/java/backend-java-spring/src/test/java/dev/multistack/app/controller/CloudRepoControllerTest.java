package dev.multistack.app.controller;

import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.config.CorsConfig;
import dev.multistack.app.config.SecurityConfig;
import dev.multistack.app.dto.CloudRepoPushResponse;
import dev.multistack.app.dto.CloudRepoResponse;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.service.CloudRepoService;
import dev.multistack.app.service.IdpOAuthService;
import dev.multistack.app.service.JwtService;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Epic("Dest cloud")
@Feature("CloudRepoController")
@Severity(SeverityLevel.CRITICAL)
@WebMvcTest(controllers = CloudRepoController.class)
@Import({AuthExceptionHandler.class, SecurityConfig.class, CorsConfig.class})
@DisplayName("CloudRepoController")
class CloudRepoControllerTest extends SliceTestBase {

    private static final String TOKEN = "idp_secret";
    private static final String YAML = """
            destination: cloud
            coverageProfile:
              automation:
                e2e: { access: write, stack: python-pytest, module: tests/python }
            """;
    private static final MediaType YAML_TYPE = MediaType.parseMediaType("application/yaml");
    private static final String REPO_URL = "https://github.com/autotests-cloud/qaguru-python-pytest";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private CloudRepoService cloudRepoService;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /api/cloud/repos returns created true and the org URL, never a token")
    void createRepoReturnsCreatedUrl() throws Exception {
        when(cloudRepoService.createRepo(TOKEN, YAML))
                .thenReturn(new CloudRepoResponse("qaguru", REPO_URL, true));

        String body = mockMvc.perform(post("/api/cloud/repos")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(IdpOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value("qaguru"))
                .andExpect(jsonPath("$.url").value(REPO_URL))
                .andExpect(jsonPath("$.created").value(true))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.access_token").doesNotExist())
                .andExpect(jsonPath("$.pat").doesNotExist())
                .andExpect(jsonPath("$.pushed").doesNotExist())
                .andExpect(content().string(not(containsString(TOKEN))))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals(
                "{\"login\":\"qaguru\",\"url\":\"" + REPO_URL + "\",\"created\":true}",
                body);
        assertFalse(body.contains("octocat"));
        assertFalse(body.contains("/user/"));
        assertFalse(body.contains("autotests-ai/"));
        assertFalse(body.contains("java-junit5-rest_assured-selenide"));
        verify(cloudRepoService).createRepo(TOKEN, YAML);
    }

    @Test
    @DisplayName("POST /api/cloud/repos is 503 without GitHub env")
    void createRepoMapsMissingGithubEnv() throws Exception {
        when(cloudRepoService.createRepo(isNull(), nullable(String.class)))
                .thenThrow(new AuthException(503, "GitHub cloud is not configured"));

        mockMvc.perform(post("/api/cloud/repos"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("GitHub cloud is not configured"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.created").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))))
                .andExpect(content().string(not(containsString("ghs_"))));
    }

    @Test
    @DisplayName("POST /api/cloud/repos is 401 without the IdP cookie")
    void createRepoRequiresCookie() throws Exception {
        when(cloudRepoService.createRepo(isNull(), nullable(String.class)))
                .thenThrow(new AuthException(401, "oauth cookie missing"));

        mockMvc.perform(post("/api/cloud/repos"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth cookie missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.created").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))));
    }

    @Test
    @DisplayName("POST /api/cloud/repos is 400 without YAML and never a frozen stack")
    void createRepoRequiresYamlBody() throws Exception {
        when(cloudRepoService.createRepo(eq(TOKEN), nullable(String.class)))
                .thenThrow(new AuthException(400, "assemble yaml missing"));

        mockMvc.perform(post("/api/cloud/repos")
                        .cookie(new Cookie(IdpOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("assemble yaml missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.created").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))))
                .andExpect(content().string(not(containsString("java-junit5-rest_assured-selenide"))));
    }

    @Test
    @DisplayName("POST /api/cloud/repos maps GitHub failure without leaking a token")
    void createRepoMapsGithubFailure() throws Exception {
        when(cloudRepoService.createRepo(TOKEN, YAML))
                .thenThrow(new AuthException(401, "oauth create failed"));

        mockMvc.perform(post("/api/cloud/repos")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(IdpOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth create failed"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.url").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/cloud/repos/contents returns pushed true and the org URL, never a token")
    void pushTreeReturnsPushedUrl() throws Exception {
        when(cloudRepoService.pushTree(TOKEN, YAML))
                .thenReturn(new CloudRepoPushResponse("qaguru", REPO_URL, true));

        String body = mockMvc.perform(post("/api/cloud/repos/contents")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(IdpOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value("qaguru"))
                .andExpect(jsonPath("$.url").value(REPO_URL))
                .andExpect(jsonPath("$.pushed").value(true))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.access_token").doesNotExist())
                .andExpect(jsonPath("$.pat").doesNotExist())
                .andExpect(jsonPath("$.created").doesNotExist())
                .andExpect(content().string(not(containsString(TOKEN))))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals(
                "{\"login\":\"qaguru\",\"url\":\"" + REPO_URL + "\",\"pushed\":true}",
                body);
        assertFalse(body.contains("octocat"));
        assertFalse(body.contains("/user/"));
        assertFalse(body.contains("autotests-ai/"));
        assertFalse(body.contains("java-junit5-rest_assured-selenide"));
        verify(cloudRepoService).pushTree(TOKEN, YAML);
    }

    @Test
    @DisplayName("POST /api/cloud/repos/contents is 503 without GitHub env")
    void pushTreeMapsMissingGithubEnv() throws Exception {
        when(cloudRepoService.pushTree(isNull(), nullable(String.class)))
                .thenThrow(new AuthException(503, "GitHub cloud is not configured"));

        mockMvc.perform(post("/api/cloud/repos/contents"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("GitHub cloud is not configured"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.pushed").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))))
                .andExpect(content().string(not(containsString("ghs_"))));
    }

    @Test
    @DisplayName("POST /api/cloud/repos/contents is 401 without the IdP cookie")
    void pushTreeRequiresCookie() throws Exception {
        when(cloudRepoService.pushTree(isNull(), nullable(String.class)))
                .thenThrow(new AuthException(401, "oauth cookie missing"));

        mockMvc.perform(post("/api/cloud/repos/contents"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth cookie missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.pushed").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))));
    }

    @Test
    @DisplayName("POST /api/cloud/repos/contents is 400 without YAML and never a classpath stub")
    void pushTreeRequiresYamlBody() throws Exception {
        when(cloudRepoService.pushTree(eq(TOKEN), nullable(String.class)))
                .thenThrow(new AuthException(400, "assemble yaml missing"));

        mockMvc.perform(post("/api/cloud/repos/contents")
                        .cookie(new Cookie(IdpOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("assemble yaml missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.pushed").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))))
                .andExpect(content().string(not(containsString("assemble-landing.yaml"))));
    }

    @Test
    @DisplayName("POST /api/cloud/repos/contents maps GitHub failure without leaking a token")
    void pushTreeMapsGithubFailure() throws Exception {
        when(cloudRepoService.pushTree(TOKEN, YAML))
                .thenThrow(new AuthException(401, "oauth push failed"));

        mockMvc.perform(post("/api/cloud/repos/contents")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(IdpOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth push failed"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.url").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/cloud/repos/contents is 503 without ASSEMBLE_URL")
    void pushTreeMapsMissingAssembleUrl() throws Exception {
        when(cloudRepoService.pushTree(eq(TOKEN), eq(YAML)))
                .thenThrow(new AuthException(503, "assemble url missing"));

        mockMvc.perform(post("/api/cloud/repos/contents")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(IdpOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("assemble url missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.pushed").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))));
    }
}
