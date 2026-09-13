package dev.multistack.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.net.URI;

/**
 * School IdP (OIDC) credentials and endpoints. The client secret never leaves this
 * process — {@code POST /api/oauth/idp} answers with {@code login} only. The IdP
 * access token is an httpOnly cookie on {@code /api/cloud}. GitHub URLs are not an IdP.
 */
@ConfigurationProperties(prefix = "idp.oauth")
public record IdpOAuthProperties(
        String clientId,
        String clientSecret,
        String tokenUrl,
        String userinfoUrl
) {
    public boolean configured() {
        return hasText(clientId)
                && hasText(clientSecret)
                && isSchoolIdpUrl(tokenUrl)
                && isSchoolIdpUrl(userinfoUrl);
    }

    public static boolean isSchoolIdpUrl(String value) {
        if (!hasText(value)) {
            return false;
        }
        try {
            URI url = URI.create(value.trim());
            String scheme = url.getScheme();
            if (scheme == null
                    || (!scheme.equalsIgnoreCase("https") && !scheme.equalsIgnoreCase("http"))) {
                return false;
            }
            String host = url.getHost();
            if (host == null || host.isBlank()) {
                return false;
            }
            String normalized = host.toLowerCase();
            return !normalized.equals("github.com") && !normalized.endsWith(".github.com");
        } catch (IllegalArgumentException ex) {
            return false;
        }
    }

    public static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
