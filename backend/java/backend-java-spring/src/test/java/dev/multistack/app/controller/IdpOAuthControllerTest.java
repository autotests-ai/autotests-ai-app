package dev.multistack.app.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import dev.multistack.app.allure.SliceTestBase;
import dev.multistack.app.config.CorsConfig;
import dev.multistack.app.config.SecurityConfig;
import dev.multistack.app.dto.IdpOAuthLoginResponse;
import dev.multistack.app.dto.IdpOAuthRequest;
import dev.multistack.app.dto.IdpOAuthSession;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.service.IdpOAuthService;
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
import org.springframework.http.ResponseCookie;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Epic("IdP OAuth")
@Feature("IdpOAuthController")
@Severity(SeverityLevel.CRITICAL)
@WebMvcTest(controllers = IdpOAuthController.class)
@Import({AuthExceptionHandler.class, SecurityConfig.class, CorsConfig.class})
@DisplayName("IdpOAuthController")
class IdpOAuthControllerTest extends SliceTestBase {

    private static final String TOKEN = "idp_secret_token";
    private static final String LOGIN_JSON = "{\"login\":\"qaguru\"}";
    private static final String BODY = """
            {"code":"idp-code","state":"csrf","redirectUri":"http://localhost:8081/oauth/idp/callback"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IdpOAuthService idpOAuthService;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /api/oauth/idp returns login, sets httpOnly cookie, never a token in JSON")
    void exchangeReturnsLoginOnlyAndSetsCookie() throws Exception {
        when(idpOAuthService.exchange(any(IdpOAuthRequest.class)))
                .thenReturn(new IdpOAuthSession("qaguru", TOKEN));
        when(idpOAuthService.toCookie(eq(TOKEN), eq(false)))
                .thenReturn(httpOnlyCookie(false));

        String body = mockMvc.perform(post("/api/oauth/idp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.login").value("qaguru"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.access_token").doesNotExist())
                .andExpect(jsonPath("$.id_token").doesNotExist())
                .andExpect(jsonPath("$.pat").doesNotExist())
                .andExpect(jsonPath("$.created").doesNotExist())
                .andExpect(jsonPath("$.via").doesNotExist())
                .andExpect(content().string(not(containsString("token"))))
                .andExpect(content().string(not(containsString(TOKEN))))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("HttpOnly")))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("idp_oauth=")))
                .andExpect(header().string(
                        HttpHeaders.SET_COOKIE, containsString("Path=" + IdpOAuthService.COOKIE_PATH)))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, not(containsString("github_oauth"))))
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertEquals(LOGIN_JSON, body);
        assertEquals(
                LOGIN_JSON,
                new ObjectMapper().writeValueAsString(new IdpOAuthLoginResponse("qaguru")));
        assertFalse(body.contains("gho_"));
        assertFalse(body.contains("ghp_"));
    }

    @Test
    @DisplayName("POST /api/oauth/idp marks the cookie Secure on HTTPS")
    void exchangeSetsSecureCookieOnHttps() throws Exception {
        when(idpOAuthService.exchange(any(IdpOAuthRequest.class)))
                .thenReturn(new IdpOAuthSession("qaguru", TOKEN));
        when(idpOAuthService.toCookie(eq(TOKEN), eq(true)))
                .thenReturn(httpOnlyCookie(true));

        mockMvc.perform(post("/api/oauth/idp")
                        .secure(true)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, containsString("Secure")))
                .andExpect(content().string(LOGIN_JSON));
    }

    @Test
    @DisplayName("POST /api/oauth/idp maps IdP failure to 401 without a token or cookie")
    void exchangeMapsIdpFailure() throws Exception {
        when(idpOAuthService.exchange(any(IdpOAuthRequest.class)))
                .thenThrow(new AuthException(401, "oauth exchange failed"));

        mockMvc.perform(post("/api/oauth/idp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("oauth exchange failed"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.login").doesNotExist())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(content().string(not(containsString("access_token"))))
                .andExpect(content().string(not(containsString(TOKEN))));
    }

    @Test
    @DisplayName("POST /api/oauth/idp is 503 when the IdP secret is missing")
    void exchangeMapsMissingSecret() throws Exception {
        when(idpOAuthService.exchange(any(IdpOAuthRequest.class)))
                .thenThrow(new AuthException(503, "IdP OAuth is not configured"));

        mockMvc.perform(post("/api/oauth/idp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(BODY))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.message").value("IdP OAuth is not configured"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(jsonPath("$.login").doesNotExist())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    @Test
    @DisplayName("POST /api/oauth/idp rejects blank code, state, and redirectUri with 400")
    void exchangeRejectsBlankFields() throws Exception {
        mockMvc.perform(post("/api/oauth/idp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"\",\"state\":\"\",\"redirectUri\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("code")))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    @Test
    @DisplayName("POST /api/oauth/idp rejects an unreadable body with 400")
    void exchangeRejectsUnreadableBody() throws Exception {
        mockMvc.perform(post("/api/oauth/idp")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request body is not valid JSON"))
                .andExpect(jsonPath("$.token").doesNotExist())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    private static ResponseCookie httpOnlyCookie(boolean secure) {
        return ResponseCookie.from(IdpOAuthService.COOKIE_NAME, TOKEN)
                .httpOnly(true)
                .secure(secure)
                .sameSite("Lax")
                .path(IdpOAuthService.COOKIE_PATH)
                .maxAge(java.time.Duration.ofDays(1))
                .build();
    }
}
