package dev.multistack.app.service;

import dev.multistack.app.config.GithubCloudProperties;
import dev.multistack.app.dto.CloudRepoResponse;
import dev.multistack.app.exception.AuthException;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Map;

@Service
@EnableConfigurationProperties(GithubCloudProperties.class)
public class CloudRepoService {

    private static final String USER_AGENT = "autotests-ai-app";

    private final GithubCloudProperties properties;
    private final IdpOAuthService idpOAuthService;
    private final RestClient restClient;

    public CloudRepoService(
            GithubCloudProperties properties,
            IdpOAuthService idpOAuthService,
            RestClient.Builder restClientBuilder) {
        this.properties = properties;
        this.idpOAuthService = idpOAuthService;
        this.restClient = restClientBuilder.build();
    }

    public CloudRepoResponse createRepo(String accessToken, String yaml) {
        if (!properties.configured()) {
            throw new AuthException(503, "GitHub cloud is not configured");
        }
        if (accessToken == null || accessToken.isBlank()) {
            throw new AuthException(401, "oauth cookie missing");
        }
        String login = idpOAuthService.login(accessToken);
        String stack = AssembleTree.e2eStack(yaml);
        String repo = repoName(login, stack);
        if (!repoExists(repo)) {
            createOrgRepo(repo);
        }
        return new CloudRepoResponse(login, htmlUrl(login, stack), true);
    }

    public static String repoName(String login, String stack) {
        return login + "-" + stack;
    }

    public static String htmlUrl(String login, String stack) {
        return "https://github.com/" + GithubCloudProperties.ORG + "/" + repoName(login, stack);
    }

    private boolean repoExists(String repo) {
        final int status;
        try {
            status = restClient.get()
                    .uri(properties.repoApiUrl(repo))
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.token())
                    .accept(MediaType.APPLICATION_JSON)
                    .exchange((request, response) -> response.getStatusCode().value());
        } catch (RestClientException ex) {
            throw createFailed();
        }
        if (status == 200) {
            return true;
        }
        if (status == 404) {
            return false;
        }
        throw createFailed();
    }

    private void createOrgRepo(String repo) {
        final int status;
        try {
            status = restClient.post()
                    .uri(properties.reposUrl())
                    .header(HttpHeaders.USER_AGENT, USER_AGENT)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + properties.token())
                    .accept(MediaType.APPLICATION_JSON)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of(
                            "name", repo,
                            "private", Boolean.FALSE,
                            "auto_init", Boolean.FALSE))
                    .exchange((request, response) -> response.getStatusCode().value());
        } catch (RestClientException ex) {
            throw createFailed();
        }
        if (status == 201 || status == 200 || status == 422) {
            return;
        }
        throw createFailed();
    }

    private static AuthException createFailed() {
        return new AuthException(401, "oauth create failed");
    }
}
