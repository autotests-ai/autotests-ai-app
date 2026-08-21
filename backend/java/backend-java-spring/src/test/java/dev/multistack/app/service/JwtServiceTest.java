package dev.multistack.app.service;

import dev.multistack.app.allure.UnitTestBase;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Epic("Authentication")
@Feature("JWT")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("JwtService")
class JwtServiceTest extends UnitTestBase {

    private static final String SECRET = "multistack-dev-secret-change-in-production-min-32-chars";

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService(SECRET, 3_600_000L);
    }

    @Test
    @DisplayName("createToken and extractUsername roundtrip")
    void tokenRoundtrip() {
        String token = jwtService.createToken("user1");

        assertEquals("user1", jwtService.extractUsername(token));
        assertTrue(jwtService.isValid(token));
    }

    @Test
    @DisplayName("isValid rejects tampered token")
    void isValidRejectsTamperedToken() {
        String token = jwtService.createToken("user1");

        assertFalse(jwtService.isValid(token + "tampered"));
    }

    @Test
    @DisplayName("isValid rejects malformed token")
    void isValidRejectsMalformedToken() {
        assertFalse(jwtService.isValid("not-a-jwt"));
    }

    @Test
    @DisplayName("isValid rejects expired token")
    void isValidRejectsExpiredToken() {
        Instant past = Instant.now().minusSeconds(60);
        String expiredToken = Jwts.builder()
                .subject("user1")
                .issuedAt(Date.from(past.minusSeconds(60)))
                .expiration(Date.from(past))
                .signWith(Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();

        assertFalse(jwtService.isValid(expiredToken));
    }
}
