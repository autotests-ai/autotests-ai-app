package dev.multistack.app.config;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    /**
     * CSRF is disabled on purpose: product auth is Bearer JWT ({@link JwtAuthFilter}) with
     * {@link SessionCreationPolicy#STATELESS}. The GitHub OAuth cookie is httpOnly + SameSite=Lax
     * on {@code /api/oauth} only ({@code /github}, {@code /repos}, {@code /repos/contents},
     * {@code /github/adopt}) — browsers will not send it on cross-site POST.
     * School IdP cookie is httpOnly + SameSite=Lax on {@code /api/cloud} only
     * ({@code POST /api/oauth/idp} sets it; {@code POST /api/cloud/repos} and
     * {@code /repos/contents} read it).
     * Enabling CSRF would break JSON API clients that do not echo an XSRF token.
     *
     * <p>This module is API-only. UI is served by per-frontend nginx containers
     * (host nginx path-routes {@code /{backend}/{frontend}/}).
     */
    @Bean
    @SuppressWarnings("java:S4502")
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/health", "/api/items",
                                "/api/openapi.yaml", "/api/docs").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/register").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/auth/logout").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/assemble", "/api/clone").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/adopt", "/api/adopt/zip").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/oauth/github", "/api/oauth/github/repos",
                                "/api/oauth/github/repos/contents", "/api/oauth/github/adopt",
                                "/api/oauth/idp",
                                "/api/cloud/repos", "/api/cloud/repos/contents")
                                .permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/auth/me").authenticated()
                        .requestMatchers("/api/**").authenticated()
                        .anyRequest().denyAll()
                )
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) ->
                                response.sendError(HttpServletResponse.SC_UNAUTHORIZED)))
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
