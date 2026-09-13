package dev.multistack.app.dto;

import jakarta.validation.constraints.NotBlank;

public record GithubOAuthRequest(
        @NotBlank String code,
        @NotBlank String state
) {
}
