package dev.multistack.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.config.CorsConfig;
import dev.multistack.app.config.SecurityConfig;
import dev.multistack.app.dto.GithubOAuthLoginResponse;
import dev.multistack.app.dto.GithubOAuthPushResponse;
import dev.multistack.app.dto.GithubOAuthRepoResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.dto.GithubOAuthSession;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.service.GithubOAuthService;
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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.ArgumentMatchers.nullable;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Epic("GitHub OAuth")
@Feature("GithubOAuthController")
@Severity(SeverityLevel.CRITICAL)
@WebMvcTest(controllers = GithubOAuthController.class)
@Import({AuthExceptionHandler.class, SecurityConfig.class, CorsConfig.class})
@DisplayName("GithubOAuthController")
class GithubOAuthControllerTest extends SliceTestBase {

    private static final String TOKEN = "gho_secret";
    private static final String YAML = """
            destination: zip
            coverageProfile:
              automation:
                e2e: { access: write, stack: python-pytest, module: tests/python }
            """;
    private static final MediaType YAML_TYPE = MediaType.parseMediaType("application/yaml");
    private static final String LOGIN_JSON = "{\"login\":\"octocat\"}";
    private static final String REPO_URL = "https://github.com/octocat/python-pytest";

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GithubOAuthService githubOAuthService;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /api/oauth/github returns login, sets httpOnly cookie, never a token in JSON")
    void exchangeReturnsLoginOnlyAndSetsCookie() throws Exception {
        when(githubOAuthService.exchange(any(GithubOAuthRequest.class)))
                .thenReturn(new GithubOAuthSession("octocat", TOKEN));
        when(githubOAuthService.toCookie(eq(TOKEN), eq(false)))
                .thenReturn(httpOnlyCookie(false));

        String body = mockMvc.perform(post("/api/oauth/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"gh-code\",\"state\":\"csrf\"}"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.login").value("octocat"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.access_token").doesNotExist())
                .andExpect(jsonPath("$.pat").doesNotExist())
                .andExpect(jsonPath("$.created").doesNotExist())
                .andExpect(jsonPath("$.via").doesNotExist())
                .andExpect(content().string(not(containsString("token"))))
                .andExpect(content().string(not(containsString(TOKEN))))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("github_oauth=")))
                .andExpect(header().string(
                        HttpHeaders.SET_COOKIE, containsString("Path=" + GithubOAuthService.COOKIE_PATH)))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals(LOGIN_JSON, body);
        assertEquals(
                LOGIN_JSON,
                new ObjectMapper().writeValueAsString(new GithubOAuthLoginResponse("octocat")));
    }

    @Test
    @DisplayName("POST /api/oauth/github marks the cookie Secure on HTTPS")
    void exchangeSetsSecureCookieOnHttps() throws Exception {
        when(githubOAuthService.exchange(any(GithubOAuthRequest.class)))
                .thenReturn(new GithubOAuthSession("octocat", TOKEN));
        when(githubOAuthService.toCookie(eq(TOKEN), eq(true)))
                .thenReturn(httpOnlyCookie(true));

        mockMvc.perform(post("/api/oauth/github")
                        .secure(true)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"gh-code\",\"state\":\"csrf\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(content().string(LOGIN_JSON));
    }

    @Test
    @DisplayName("POST /api/oauth/github maps GitHub failure to 401 without a token or cookie")
    void exchangeMapsGithubFailure() throws Exception {
        when(githubOAuthService.exchange(any(GithubOAuthRequest.class)))
                .thenThrow(new AuthException(401, "oauth exchange failed"));

        mockMvc.perform(post("/api/oauth/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"gh-code\",\"state\":\"csrf\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth exchange failed"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.login").doesNotExist())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(content().string(not(containsString("access_token"))));
    }

    @Test
    @DisplayName("POST /api/oauth/github is 503 when the OAuth App secret is missing")
    void exchangeMapsMissingSecret() throws Exception {
        when(githubOAuthService.exchange(any(GithubOAuthRequest.class)))
                .thenThrow(new AuthException(503, "GitHub OAuth is not configured"));

        mockMvc.perform(post("/api/oauth/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"gh-code\",\"state\":\"csrf\"}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("GitHub OAuth is not configured"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    @Test
    @DisplayName("POST /api/oauth/github rejects blank code and state with 400")
    void exchangeRejectsBlankFields() throws Exception {
        mockMvc.perform(post("/api/oauth/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"\",\"state\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("code")))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/oauth/github rejects an unreadable body with 400")
    void exchangeRejectsUnreadableBody() throws Exception {
        mockMvc.perform(post("/api/oauth/github")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request body is not valid JSON"))
                .andExpect(jsonPath("$.token").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos returns created true and url, never a token")
    void createRepoReturnsCreatedUrl() throws Exception {
        when(githubOAuthService.createRepo(TOKEN, YAML))
                .thenReturn(new GithubOAuthRepoResponse("octocat", REPO_URL, true));

        String body = mockMvc.perform(post("/api/oauth/github/repos")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(GithubOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value("octocat"))
                .andExpect(jsonPath("$.url").value(REPO_URL))
                .andExpect(jsonPath("$.created").value(true))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.access_token").doesNotExist())
                .andExpect(jsonPath("$.pat").doesNotExist())
                .andExpect(content().string(not(containsString(TOKEN))))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals(
                "{\"login\":\"octocat\",\"url\":\"" + REPO_URL + "\",\"created\":true}",
                body);
        assertFalse(body.contains("autotests-cloud"));
        assertFalse(body.contains("autotests-ai/"));
        assertFalse(body.contains("java-junit5-rest_assured-selenide"));
        verify(githubOAuthService).createRepo(TOKEN, YAML);
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos/contents returns pushed true and url, never a token")
    void pushTreeReturnsPushedUrl() throws Exception {
        when(githubOAuthService.pushTree(eq(TOKEN), eq(YAML)))
                .thenReturn(new GithubOAuthPushResponse("octocat", REPO_URL, true));

        String body = mockMvc.perform(post("/api/oauth/github/repos/contents")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(GithubOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.login").value("octocat"))
                .andExpect(jsonPath("$.url").value(REPO_URL))
                .andExpect(jsonPath("$.pushed").value(true))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.access_token").doesNotExist())
                .andExpect(jsonPath("$.pat").doesNotExist())
                .andExpect(content().string(not(containsString(TOKEN))))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals(
                "{\"login\":\"octocat\",\"url\":\"" + REPO_URL + "\",\"pushed\":true}",
                body);
        assertFalse(body.contains("autotests-cloud"));
        assertFalse(body.contains("autotests-ai/"));
        verify(githubOAuthService).pushTree(TOKEN, YAML);
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos/contents is 401 without the GitHub cookie")
    void pushTreeRequiresCookie() throws Exception {
        when(githubOAuthService.pushTree(isNull(), nullable(String.class)))
                .thenThrow(new AuthException(401, "oauth cookie missing"));

        mockMvc.perform(post("/api/oauth/github/repos/contents"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth cookie missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.pushed").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))));
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos/contents is 400 without YAML and never a classpath stub")
    void pushTreeRequiresYamlBody() throws Exception {
        when(githubOAuthService.pushTree(eq(TOKEN), nullable(String.class)))
                .thenThrow(new AuthException(400, "assemble yaml missing"));

        mockMvc.perform(post("/api/oauth/github/repos/contents")
                        .cookie(new Cookie(GithubOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("assemble yaml missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.pushed").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))))
                .andExpect(content().string(not(containsString("assemble-landing.yaml"))));
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos/contents maps GitHub failure without leaking a token")
    void pushTreeMapsGithubFailure() throws Exception {
        when(githubOAuthService.pushTree(eq(TOKEN), eq(YAML)))
                .thenThrow(new AuthException(401, "oauth push failed"));

        mockMvc.perform(post("/api/oauth/github/repos/contents")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(GithubOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth push failed"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.url").doesNotExist());
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos/contents is 503 without ASSEMBLE_URL")
    void pushTreeMapsMissingAssembleUrl() throws Exception {
        when(githubOAuthService.pushTree(eq(TOKEN), eq(YAML)))
                .thenThrow(new AuthException(503, "assemble url missing"));

        mockMvc.perform(post("/api/oauth/github/repos/contents")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(GithubOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("assemble url missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.pushed").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))));
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos is 401 without the GitHub cookie")
    void createRepoRequiresCookie() throws Exception {
        when(githubOAuthService.createRepo(isNull(), nullable(String.class)))
                .thenThrow(new AuthException(401, "oauth cookie missing"));

        mockMvc.perform(post("/api/oauth/github/repos"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth cookie missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.created").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))));
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos is 400 without YAML and never a frozen stack")
    void createRepoRequiresYamlBody() throws Exception {
        when(githubOAuthService.createRepo(eq(TOKEN), nullable(String.class)))
                .thenThrow(new AuthException(400, "assemble yaml missing"));

        mockMvc.perform(post("/api/oauth/github/repos")
                        .cookie(new Cookie(GithubOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("assemble yaml missing"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.created").doesNotExist())
                .andExpect(content().string(not(containsString("access_token"))))
                .andExpect(content().string(not(containsString("java-junit5-rest_assured-selenide"))));
    }

    @Test
    @DisplayName("POST /api/oauth/github/repos maps GitHub failure without leaking a token")
    void createRepoMapsGithubFailure() throws Exception {
        when(githubOAuthService.createRepo(TOKEN, YAML))
                .thenThrow(new AuthException(401, "oauth create failed"));

        mockMvc.perform(post("/api/oauth/github/repos")
                        .contentType(YAML_TYPE)
                        .content(YAML)
                        .cookie(new Cookie(GithubOAuthService.COOKIE_NAME, TOKEN)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth create failed"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.url").doesNotExist());
    }

    private static ResponseCookie httpOnlyCookie(boolean secure) {
        return ResponseCookie.from(GithubOAuthService.COOKIE_NAME, TOKEN)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path(GithubOAuthService.COOKIE_PATH)
                .maxAge(java.time.Duration.ofDays(1))
                .build();
    }
}
