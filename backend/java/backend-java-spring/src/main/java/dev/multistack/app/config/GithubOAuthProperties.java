package dev.multistack.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * GitHub OAuth App credentials. The client secret never leaves this process —
 * {@code POST /api/oauth/github} answers with {@code login} only.
 */
@ConfigurationProperties(prefix = "github.oauth")
public record GithubOAuthProperties(
        String clientId,
        String clientSecret,
        String tokenUrl,
        String userUrl
) {
    public boolean configured() {
        return hasText(clientId) && hasText(clientSecret);
    }

    static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
