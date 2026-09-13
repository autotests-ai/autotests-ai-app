package dev.multistack.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Loopback assemble-zip stand ({@code ASSEMBLE_URL}). Empty means dest user push
 * fails closed — never a classpath stub tree. YAML body is required at push.
 */
@ConfigurationProperties(prefix = "assemble")
public record AssembleProperties(String url) {

    public boolean configured() {
        return hasText(url);
    }

    public String assembleEndpoint() {
        String base = url == null ? "" : url.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (base.endsWith("/assemble")) {
            return base;
        }
        return base + "/assemble";
    }

    static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
