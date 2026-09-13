package dev.multistack.app.controller;

import dev.multistack.app.dto.CloudRepoPushResponse;
import dev.multistack.app.dto.CloudRepoResponse;
import dev.multistack.app.service.CloudRepoService;
import dev.multistack.app.service.IdpOAuthService;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/cloud")
public class CloudRepoController {

    private final CloudRepoService cloudRepoService;

    public CloudRepoController(CloudRepoService cloudRepoService) {
        this.cloudRepoService = cloudRepoService;
    }

    @PostMapping("/repos")
    public CloudRepoResponse createRepo(
            @CookieValue(name = IdpOAuthService.COOKIE_NAME, required = false) String accessToken,
            @RequestBody(required = false) String yaml) {
        return cloudRepoService.createRepo(accessToken, yaml);
    }

    @PostMapping("/repos/contents")
    public CloudRepoPushResponse pushTree(
            @CookieValue(name = IdpOAuthService.COOKIE_NAME, required = false) String accessToken,
            @RequestBody(required = false) String yaml) {
        return cloudRepoService.pushTree(accessToken, yaml);
    }
}
