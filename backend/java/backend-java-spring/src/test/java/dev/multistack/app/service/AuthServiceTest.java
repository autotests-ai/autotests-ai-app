package dev.multistack.app.service;

import dev.multistack.app.dto.AuthResponse;
import dev.multistack.app.dto.LoginRequest;
import dev.multistack.app.dto.RegisterRequest;
import dev.multistack.app.dto.UserProfileResponse;
import dev.multistack.app.entity.UserEntity;
import dev.multistack.app.exception.AuthException;
import dev.multistack.app.repository.UserRepository;
import dev.multistack.app.allure.UnitTestBase;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Epic("Authentication")
@Feature("AuthService")
@Severity(SeverityLevel.CRITICAL)
@ExtendWith(MockitoExtension.class)
@DisplayName("AuthService")
class AuthServiceTest extends UnitTestBase {

    private static final String USERNAME = "user1";
    private static final String PASSWORD = "password1";
    private static final String HASH = "encoded-hash";
    private static final String TOKEN = "jwt-token";

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    private AuthService authService;

    @BeforeEach
    void setUp() {
        authService = new AuthService(userRepository, passwordEncoder, jwtService);
    }

    @Test
    @DisplayName("register saves user and returns auth response")
    void registerCreatesUser() {
        var request = new RegisterRequest("newuser", "password123");
        when(userRepository.existsByUsername("newuser")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn(HASH);
        when(jwtService.createToken("newuser")).thenReturn(TOKEN);

        AuthResponse response = authService.register(request);

        assertEquals(TOKEN, response.token());
        assertEquals("newuser", response.username());
        assertEquals("/", response.redirectUrl());

        var userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());
        assertEquals("newuser", userCaptor.getValue().getUsername());
        assertEquals(HASH, userCaptor.getValue().getPasswordHash());
    }

    @Test
    @DisplayName("register rejects duplicate username")
    void registerDuplicateUsername() {
        when(userRepository.existsByUsername(USERNAME)).thenReturn(true);

        AuthException ex = assertThrows(
                AuthException.class,
                () -> authService.register(new RegisterRequest(USERNAME, "password123"))
        );

        assertEquals(409, ex.getStatus());
        assertEquals("Username already taken", ex.getMessage());
    }

    @Test
    @DisplayName("register maps a lost unique-constraint race to 409")
    void registerLosesUniqueConstraintRace() {
        when(userRepository.existsByUsername(USERNAME)).thenReturn(false);
        when(passwordEncoder.encode(PASSWORD)).thenReturn(HASH);
        when(userRepository.saveAndFlush(any(UserEntity.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate key value violates unique constraint"));

        AuthException ex = assertThrows(
                AuthException.class,
                () -> authService.register(new RegisterRequest(USERNAME, PASSWORD))
        );

        assertEquals(409, ex.getStatus());
        assertEquals("Username already taken", ex.getMessage());
    }

    @Test
    @DisplayName("login returns token for valid credentials")
    void loginWithValidCredentials() {
        var user = new UserEntity(USERNAME, HASH);
        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, HASH)).thenReturn(true);
        when(jwtService.createToken(USERNAME)).thenReturn(TOKEN);

        AuthResponse response = authService.login(new LoginRequest(USERNAME, PASSWORD));

        assertEquals(TOKEN, response.token());
        assertEquals(USERNAME, response.username());
        assertEquals("/", response.redirectUrl());
    }

    @Test
    @DisplayName("login rejects unknown username")
    void loginUnknownUser() {
        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.empty());

        AuthException ex = assertThrows(
                AuthException.class,
                () -> authService.login(new LoginRequest(USERNAME, PASSWORD))
        );

        assertEquals(401, ex.getStatus());
        assertEquals("Wrong login or password", ex.getMessage());
    }

    @Test
    @DisplayName("login rejects wrong password")
    void loginWrongPassword() {
        var user = new UserEntity(USERNAME, HASH);
        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(user));
        when(passwordEncoder.matches(PASSWORD, HASH)).thenReturn(false);

        AuthException ex = assertThrows(
                AuthException.class,
                () -> authService.login(new LoginRequest(USERNAME, PASSWORD))
        );

        assertEquals(401, ex.getStatus());
        assertEquals("Wrong login or password", ex.getMessage());
    }

    @Test
    @DisplayName("profile returns username for existing user")
    void profileForExistingUser() {
        var user = new UserEntity(USERNAME, HASH);
        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(user));

        UserProfileResponse response = authService.profile(USERNAME);

        assertEquals(USERNAME, response.username());
    }

    @Test
    @DisplayName("profile rejects unknown username")
    void profileUnknownUser() {
        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.empty());

        AuthException ex = assertThrows(
                AuthException.class,
                () -> authService.profile(USERNAME)
        );

        assertEquals(401, ex.getStatus());
        assertEquals("Unauthorized", ex.getMessage());
    }

    @Test
    @DisplayName("deleteAccount removes the authenticated user")
    void deleteAccountRemovesUser() {
        var user = new UserEntity(USERNAME, HASH);
        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.of(user));

        authService.deleteAccount(USERNAME);

        verify(userRepository).delete(user);
    }

    @Test
    @DisplayName("deleteAccount rejects a user that no longer exists")
    void deleteAccountUnknownUser() {
        when(userRepository.findByUsername(USERNAME)).thenReturn(Optional.empty());

        AuthException ex = assertThrows(
                AuthException.class,
                () -> authService.deleteAccount(USERNAME)
        );

        assertEquals(401, ex.getStatus());
        assertEquals("Unauthorized", ex.getMessage());
    }
}
