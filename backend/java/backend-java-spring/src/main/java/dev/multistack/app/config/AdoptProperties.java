package dev.multistack.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Loopback adopt stand ({@code ADOPT_URL}). Empty means Home import fails closed.
 * Not {@code ASSEMBLE_URL}. Never a PAT.
 */
@ConfigurationProperties(prefix = "adopt")
public record AdoptProperties(String url) {

    public boolean configured() {
        return hasText(url);
    }

    public String adoptEndpoint() {
        String base = url == null ? "" : url.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        if (base.endsWith("/adopt")) {
            return base;
        }
        return base + "/adopt";
    }

    static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
