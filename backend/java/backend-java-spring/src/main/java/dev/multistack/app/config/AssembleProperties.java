package dev.multistack.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Loopback assemble-zip stand ({@code ASSEMBLE_URL}). Empty means dest zip and
 * dest user push fail closed — never a classpath stub tree. YAML body is required.
 */
@ConfigurationProperties(prefix = "assemble")
public record AssembleProperties(String url) {

    public boolean configured() {
        return hasText(url);
    }

    public String assembleEndpoint() {
        String base = stripSlash(url);
        if (base.endsWith("/assemble")) {
            return base;
        }
        return base + "/assemble";
    }

    /** Same {@code ASSEMBLE_URL} host, path {@code /clone}. Not a {@code CLONE_URL} secret. */
    public String cloneEndpoint() {
        String base = stripSlash(url);
        if (base.endsWith("/clone")) {
            return base;
        }
        if (base.endsWith("/assemble")) {
            return base.substring(0, base.length() - "/assemble".length()) + "/clone";
        }
        return base + "/clone";
    }

    private static String stripSlash(String url) {
        String base = url == null ? "" : url.trim();
        while (base.endsWith("/")) {
            base = base.substring(0, base.length() - 1);
        }
        return base;
    }

    static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
