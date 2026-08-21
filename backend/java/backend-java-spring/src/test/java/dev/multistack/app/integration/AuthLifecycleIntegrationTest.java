package dev.multistack.app.integration;

import dev.multistack.app.allure.IntegrationTestBase;
import dev.multistack.app.dto.AuthResponse;
import dev.multistack.app.dto.LoginRequest;
import dev.multistack.app.dto.RegisterRequest;
import dev.multistack.app.dto.UserProfileResponse;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@Epic("Authentication")
@Feature("Account lifecycle")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("Auth account lifecycle in-process")
class AuthLifecycleIntegrationTest extends IntegrationTestBase {

    /**
     * Full account lifecycle through the running Spring context — proves DB and JWT are wired
     * together, and documents that logout is stateless: the JWT keeps working until the account
     * itself is gone.
     */
    @Test
    @DisplayName("register → login → me → logout (stateless: token survives) → delete → me is 401")
    void accountLifecycleRoundTrip() {
        String username = "int_" + UUID.randomUUID().toString().substring(0, 8);
        String password = "password123";

        ResponseEntity<AuthResponse> register = postJson(
                "/api/auth/register",
                new RegisterRequest(username, password),
                AuthResponse.class);
        assertEquals(HttpStatus.CREATED, register.getStatusCode());
        assertNotNull(register.getBody());
        assertEquals(username, register.getBody().username());

        ResponseEntity<AuthResponse> login = postJson(
                "/api/auth/login",
                new LoginRequest(username, password),
                AuthResponse.class);
        assertEquals(HttpStatus.OK, login.getStatusCode());
        assertNotNull(login.getBody());
        String token = login.getBody().token();

        ResponseEntity<UserProfileResponse> profile = exchangeJson(
                "/api/auth/me",
                HttpMethod.GET,
                bearerEntity(token),
                UserProfileResponse.class);
        assertEquals(HttpStatus.OK, profile.getStatusCode());
        assertNotNull(profile.getBody());
        assertEquals(username, profile.getBody().username());

        ResponseEntity<Void> logout = exchangeJson(
                "/api/auth/logout",
                HttpMethod.POST,
                bearerEntity(token),
                Void.class);
        assertEquals(HttpStatus.NO_CONTENT, logout.getStatusCode());

        // Stateless JWT: logout does not invalidate the token server-side — by design.
        ResponseEntity<UserProfileResponse> afterLogout = exchangeJson(
                "/api/auth/me",
                HttpMethod.GET,
                bearerEntity(token),
                UserProfileResponse.class);
        assertEquals(HttpStatus.OK, afterLogout.getStatusCode());
        assertNotNull(afterLogout.getBody());
        assertEquals(username, afterLogout.getBody().username());

        ResponseEntity<Void> delete = exchangeJson(
                "/api/auth/me",
                HttpMethod.DELETE,
                bearerEntity(token),
                Void.class);
        assertEquals(HttpStatus.NO_CONTENT, delete.getStatusCode());

        // The token still verifies cryptographically, but the account is gone → 401.
        ResponseEntity<String> afterDelete = exchangeJson(
                "/api/auth/me",
                HttpMethod.GET,
                bearerEntity(token),
                String.class);
        assertEquals(HttpStatus.UNAUTHORIZED, afterDelete.getStatusCode());
    }
}
