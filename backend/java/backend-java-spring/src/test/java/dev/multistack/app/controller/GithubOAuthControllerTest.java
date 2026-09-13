package dev.multistack.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.config.CorsConfig;
import dev.multistack.app.config.SecurityConfig;
import dev.multistack.app.dto.GithubOAuthLoginResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.service.GithubOAuthService;
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
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Epic("GitHub OAuth")
@Feature("GithubOAuthController")
@Severity(SeverityLevel.CRITICAL)
@WebMvcTest(controllers = GithubOAuthController.class)
@Import({AuthExceptionHandler.class, SecurityConfig.class, CorsConfig.class})
@DisplayName("GithubOAuthController")
class GithubOAuthControllerTest extends SliceTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private GithubOAuthService githubOAuthService;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /api/oauth/github returns login and never a token")
    void exchangeReturnsLoginOnly() throws Exception {
        when(githubOAuthService.exchange(any(GithubOAuthRequest.class)))
                .thenReturn(new GithubOAuthLoginResponse("octocat"));

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
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals("{\"login\":\"octocat\"}", body);
        assertEquals(
                "{\"login\":\"octocat\"}",
                new ObjectMapper().writeValueAsString(new GithubOAuthLoginResponse("octocat")));
    }

    @Test
    @DisplayName("POST /api/oauth/github maps GitHub failure to 401 without a token")
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
                .andExpect(jsonPath("$.token").doesNotExist());
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
}
