package dev.multistack.app.config;

import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

/**
 * Allow browser frontends on another origin (Vite / ng serve / …) to call {@code /api/**}.
 * Auth is Bearer JWT in headers — credential cookies are not required.
 *
 * <p>Matrix deployments serve UI and API from one public host (different paths, same origin).
 * Browsers still send an {@code Origin} header on POST, so Spring validates it against this
 * policy. Configured patterns cover local dev servers; the request host is admitted when it
 * matches {@code Origin}, so production nginx routing does not need a per-host env override.
 */
@Configuration
public class CorsConfig {

    private final List<String> allowedOriginPatterns;

    public CorsConfig(
            @Value("${app.cors.allowed-origin-patterns}") List<String> allowedOriginPatterns
    ) {
        this.allowedOriginPatterns = List.copyOf(allowedOriginPatterns);
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration template = baseConfiguration();
        return request -> corsForRequest(request, template);
    }

    CorsConfiguration corsForRequest(HttpServletRequest request, CorsConfiguration template) {
        if (request == null || !request.getRequestURI().startsWith("/api/")) {
            return null;
        }
        CorsConfiguration config = new CorsConfiguration(template);
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        if (origin != null && sameHost(origin, request)) {
            config.addAllowedOriginPattern(origin);
        }
        return config;
    }

    private CorsConfiguration baseConfiguration() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(allowedOriginPatterns);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("Authorization"));
        config.setAllowCredentials(false);
        return config;
    }

    static boolean sameHost(String origin, HttpServletRequest request) {
        try {
            String originHost = URI.create(origin).getHost();
            if (originHost == null) {
                return false;
            }
            String hostHeader = request.getHeader(HttpHeaders.HOST);
            if (hostHeader != null && !hostHeader.isBlank()) {
                String host = hostHeader.contains(":")
                        ? hostHeader.substring(0, hostHeader.indexOf(':'))
                        : hostHeader;
                if (originHost.equalsIgnoreCase(host)) {
                    return true;
                }
            }
            return originHost.equalsIgnoreCase(request.getServerName());
        } catch (IllegalArgumentException invalidOrigin) {
            return false;
        }
    }
}
