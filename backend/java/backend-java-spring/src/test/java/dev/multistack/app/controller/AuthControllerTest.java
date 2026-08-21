package dev.multistack.app.controller;

import dev.multistack.app.config.CorsConfig;
import dev.multistack.app.config.SecurityConfig;
import dev.multistack.app.dto.AuthResponse;
import dev.multistack.app.dto.LoginRequest;
import dev.multistack.app.dto.RegisterRequest;
import dev.multistack.app.dto.UserProfileResponse;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.service.AuthService;
import dev.multistack.app.service.JwtService;
import dev.multistack.app.allure.SliceTestBase;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@Epic("Authentication")
@Feature("AuthController")
@Severity(SeverityLevel.CRITICAL)
@WebMvcTest(controllers = AuthController.class)
@Import({AuthExceptionHandler.class, SecurityConfig.class, CorsConfig.class})
@DisplayName("AuthController")
class AuthControllerTest extends SliceTestBase {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private JwtService jwtService;

    @Test
    @DisplayName("POST /api/auth/register returns 201")
    void registerReturnsCreated() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenReturn(new AuthResponse("jwt-token", "newuser", "/"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"newuser\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").value("jwt-token"))
                .andExpect(jsonPath("$.username").value("newuser"))
                .andExpect(jsonPath("$.redirectUrl").value("/"));
    }

    @Test
    @DisplayName("POST /api/auth/login returns 200")
    void loginReturnsOk() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenReturn(new AuthResponse("jwt-token", "user1", "/"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"user1\",\"password\":\"password1\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").value("jwt-token"))
                .andExpect(jsonPath("$.username").value("user1"));
    }

    @Test
    @DisplayName("POST /api/auth/logout returns 204")
    void logoutReturnsNoContent() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("GET /api/auth/me returns profile for authenticated user")
    void meReturnsProfile() throws Exception {
        when(authService.profile("user1")).thenReturn(new UserProfileResponse("user1"));

        mockMvc.perform(get("/api/auth/me")
                        .with(authentication(new UsernamePasswordAuthenticationToken("user1", null, List.of()))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("user1"));

        verify(authService).profile("user1");
    }

    @Test
    @DisplayName("POST /api/auth/register maps duplicate username to 409")
    void registerDuplicateUsername() throws Exception {
        when(authService.register(any(RegisterRequest.class)))
                .thenThrow(new AuthException(409, "Username already taken"));

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"user1\",\"password\":\"password123\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Username already taken"));
    }

    @Test
    @DisplayName("POST /api/auth/login maps invalid credentials to 401")
    void loginInvalidCredentials() throws Exception {
        when(authService.login(any(LoginRequest.class)))
                .thenThrow(new AuthException(401, "Wrong login or password"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"user1\",\"password\":\"wrong1\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Wrong login or password"));
    }

    @Test
    @DisplayName("GET /api/auth/me without token returns 401")
    void meRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/auth/register rejects short password with 400 and a field message")
    void registerRejectsShortPassword() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"shortuser\",\"password\":\"abc\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString("password")));
    }

    @Test
    @DisplayName("POST /api/auth/login rejects blank credentials with 400 joining both field errors")
    void loginRejectsBlankCredentials() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"\",\"password\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", allOf(
                        containsString("username"),
                        containsString("password"),
                        containsString("; "))));
    }

    @Test
    @DisplayName("DELETE /api/auth/me removes the authenticated account with 204")
    void deleteAccountReturnsNoContent() throws Exception {
        mockMvc.perform(delete("/api/auth/me")
                        .with(authentication(new UsernamePasswordAuthenticationToken("user1", null, List.of()))))
                .andExpect(status().isNoContent());

        verify(authService).deleteAccount("user1");
    }

    @Test
    @DisplayName("DELETE /api/auth/me without token returns 401")
    void deleteAccountRequiresAuthentication() throws Exception {
        mockMvc.perform(delete("/api/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/auth/register rejects an unreadable body with 400")
    void registerRejectsUnreadableBody() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request body is not valid JSON"));
    }
}
