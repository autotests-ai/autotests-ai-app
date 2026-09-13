package dev.multistack.app.controller;

import dev.multistack.app.dto.GithubOAuthLoginResponse;
import dev.multistack.app.dto.GithubOAuthRequest;
import dev.multistack.app.service.GithubOAuthService;
import jakarta.validation.Valid;
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
    public GithubOAuthLoginResponse github(@Valid @RequestBody GithubOAuthRequest request) {
        return githubOAuthService.exchange(request);
    }
}
