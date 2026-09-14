package dev.multistack.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * GitHub OAuth App credentials and GitHub HTTP endpoints. The client secret never
 * leaves this process — {@code POST /api/oauth/github} answers with {@code login}
 * only; the user token is an httpOnly cookie.
 */
@ConfigurationProperties(prefix = "github.oauth")
public record GithubOAuthProperties(
        String clientId,
        String clientSecret,
        String tokenUrl,
        String userUrl,
        String reposUrl,
        String repoApiBase
) {
    public boolean configured() {
        return hasText(clientId) && hasText(clientSecret);
    }

    public String repoApiUrl(String login, String name) {
        String base = repoApiBase == null ? "" : repoApiBase.replaceAll("/+$", "");
        return base + "/" + login + "/" + name;
    }

    static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
