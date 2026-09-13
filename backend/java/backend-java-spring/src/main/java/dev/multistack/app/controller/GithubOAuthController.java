package dev.multistack.app.controller;

import dev.multistack.app.dto.GithubOAuthLoginResponse;
import dev.multistack.app.dto.GithubOAuthRepoResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.dto.GithubOAuthSession;
import dev.multistack.app.service.GithubOAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/oauth")
public class GithubOAuthController {

    private final GithubOAuthService githubOAuthService;

    public GithubOAuthController(GithubOAuthService githubOAuthService) {
        this.githubOAuthService = githubOAuthService;
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
            @CookieValue(name = GithubOAuthService.COOKIE_NAME, required = false) String accessToken) {
        return githubOAuthService.createRepo(accessToken);
    }
}
