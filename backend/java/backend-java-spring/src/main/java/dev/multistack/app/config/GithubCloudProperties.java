package dev.multistack.app.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Server GitHub token for dest cloud org create and Git Data push. Never a student
 * PAT. Empty token → {@code POST /api/cloud/repos} and {@code /repos/contents} are 503.
 * Org is always {@code autotests-cloud}.
 */
@ConfigurationProperties(prefix = "github.cloud")
public record GithubCloudProperties(
        String token,
        String reposUrl,
        String repoApiBase
) {
    public static final String ORG = "autotests-cloud";

    public boolean configured() {
        return hasText(token);
    }

    public String repoApiUrl(String name) {
        String base = repoApiBase == null ? "" : repoApiBase.replaceAll("/+$", "");
        return base + "/" + ORG + "/" + name;
    }

    static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
