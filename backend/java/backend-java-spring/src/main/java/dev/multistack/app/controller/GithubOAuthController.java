package dev.multistack.app.controller;

import dev.multistack.app.dto.GithubOAuthLoginResponse;
import dev.multistack.app.dto.GithubOAuthPushResponse;
import dev.multistack.app.dto.GithubOAuthRepoResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.dto.GithubOAuthSession;
import dev.multistack.app.service.AdoptClient;
import dev.multistack.app.service.GithubOAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/oauth")
public class GithubOAuthController {

    private final GithubOAuthService githubOAuthService;
    private final AdoptClient adoptClient;

    public GithubOAuthController(GithubOAuthService githubOAuthService, AdoptClient adoptClient) {
        this.githubOAuthService = githubOAuthService;
        this.adoptClient = adoptClient;
    }

    @PostMapping("/github")
    public GithubOAuthLoginResponse github(
            @Valid @RequestBody GithubOAuthRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse response) {
        GithubOAuthSession session = githubOAuthService.exchange(request);
        response.addHeader(
                HttpHeaders.SET_COOKIE,
                githubOAuthService.toCookie(session.accessToken(), httpRequest.isSecure()).toString());
        return new GithubOAuthLoginResponse(session.login());
    }

    @PostMapping("/github/repos")
    public GithubOAuthRepoResponse createRepo(
            @CookieValue(name = GithubOAuthService.COOKIE_NAME, required = false) String accessToken,
            @RequestBody(required = false) String yaml) {
        return githubOAuthService.createRepo(accessToken, yaml);
    }

    @PostMapping("/github/repos/contents")
    public GithubOAuthPushResponse pushTree(
            @CookieValue(name = GithubOAuthService.COOKIE_NAME, required = false) String accessToken,
            @RequestBody(required = false) String yaml) {
        return githubOAuthService.pushTree(accessToken, yaml);
    }

    /**
     * Private Home import. Cookie {@code github_oauth} required. Clone on {@code ADOPT_URL}
     * without a token in JSON. Never PAT. Never {@code GITHUB_CLOUD_TOKEN}. Never push.
     */
    @PostMapping("/github/adopt")
    public ResponseEntity<Map<String, Object>> adopt(
            @CookieValue(name = GithubOAuthService.COOKIE_NAME, required = false) String accessToken,
            @RequestBody(required = false) Map<String, Object> body,
            @RequestParam(name = "dry_run", required = false, defaultValue = "false") boolean dryRun) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "no-store")
                .body(adoptClient.fromPrivateUrl(body, dryRun, accessToken));
    }
}
