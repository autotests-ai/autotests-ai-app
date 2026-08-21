package dev.multistack.app.config;

import dev.multistack.app.allure.UnitTestBase;

import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import jakarta.servlet.http.HttpServletRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

@Epic("Security")
@Feature("CORS")
@Severity(SeverityLevel.NORMAL)
@DisplayName("CorsConfig")
class CorsConfigTest extends UnitTestBase {

    private static final List<String> DEV_ORIGINS =
            List.of("http://localhost:[*]", "http://127.0.0.1:[*]");

    @Test
    @DisplayName("applies the configured origin patterns on /api/**")
    void apiCorsAllowsOriginPatterns() {
        CorsConfiguration cors = new CorsConfig(DEV_ORIGINS)
                .corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest("GET", "/api/health"));

        assertNotNull(cors);
        assertEquals(DEV_ORIGINS, cors.getAllowedOriginPatterns());
        assertFalse(Boolean.TRUE.equals(cors.getAllowCredentials()));
    }

    @Test
    @DisplayName("admits a configured dev server origin and rejects an unknown one")
    void apiCorsChecksOrigin() {
        CorsConfiguration cors = new CorsConfig(DEV_ORIGINS)
                .corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest("GET", "/api/health"));

        assertNotNull(cors);
        assertEquals("http://localhost:5173", cors.checkOrigin("http://localhost:5173"));
        assertNull(cors.checkOrigin("https://evil.example.com"));
    }

    @Test
    @DisplayName("admits the deployment host when Origin matches the request Host")
    void apiCorsAllowsSameHostOrigin() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.addHeader(HttpHeaders.HOST, "autotests.ai");
        request.addHeader(HttpHeaders.ORIGIN, "https://autotests.ai");

        CorsConfiguration cors = new CorsConfig(DEV_ORIGINS)
                .corsConfigurationSource()
                .getCorsConfiguration(request);

        assertNotNull(cors);
        assertEquals(
                "https://autotests.ai",
                cors.checkOrigin("https://autotests.ai"));
    }

    @Test
    @DisplayName("sameHost matches Origin host to the Host header")
    void sameHostUsesHostHeader() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.addHeader(HttpHeaders.HOST, "autotests.ai:443");

        assertTrue(CorsConfig.sameHost("https://autotests.ai", request));
        assertFalse(CorsConfig.sameHost("https://evil.example.com", request));
    }

    @Test
    @DisplayName("sameHost falls back to server name when Host header is absent")
    void sameHostUsesServerName() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.setServerName("autotests.ai");

        assertTrue(CorsConfig.sameHost("https://autotests.ai", request));
    }

    @Test
    @DisplayName("sameHost rejects malformed and host-less origins")
    void sameHostRejectsInvalidOrigin() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.addHeader(HttpHeaders.HOST, "autotests.ai");

        assertFalse(CorsConfig.sameHost("not-a-uri", request));
        assertFalse(CorsConfig.sameHost("file:///tmp/page.html", request));
        assertFalse(CorsConfig.sameHost("http://bad uri", request));
    }

    @Test
    @DisplayName("corsForRequest ignores non-API paths and null requests")
    void corsForRequestSkipsNonApiPaths() {
        CorsConfig corsConfig = new CorsConfig(DEV_ORIGINS);
        CorsConfiguration template = corsConfig.corsConfigurationSource()
                .getCorsConfiguration(new MockHttpServletRequest("GET", "/api/health"));

        assertNull(corsConfig.corsForRequest(null, template));
        assertNull(corsConfig.corsForRequest(new MockHttpServletRequest("GET", "/"), template));
    }

    @Test
    @DisplayName("corsForRequest does not admit a foreign origin from another host")
    void corsForRequestIgnoresForeignOrigin() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        request.addHeader(HttpHeaders.HOST, "autotests.ai");
        request.addHeader(HttpHeaders.ORIGIN, "https://evil.example.com");

        CorsConfiguration cors = new CorsConfig(DEV_ORIGINS)
                .corsConfigurationSource()
                .getCorsConfiguration(request);

        assertNotNull(cors);
        assertEquals(DEV_ORIGINS, cors.getAllowedOriginPatterns());
        assertNull(cors.checkOrigin("https://evil.example.com"));
    }

    @Test
    @DisplayName("sameHost falls back to server name when Host header is blank")
    void sameHostFallsBackWhenHostHeaderBlank() {
        // MockHttpServletRequest derives getServerName() from the Host header, so a blank
        // header needs a hand-rolled stub to keep the two values independent.
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getHeader(HttpHeaders.HOST)).thenReturn("   ");
        when(request.getServerName()).thenReturn("autotests.ai");

        assertTrue(CorsConfig.sameHost("https://autotests.ai", request));
    }
}
