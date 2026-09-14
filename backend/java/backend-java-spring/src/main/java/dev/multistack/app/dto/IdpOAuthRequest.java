package dev.multistack.app.dto;

import jakarta.validation.constraints.NotBlank;

/** Dest cloud IdP callback. Never a token. {@code redirectUri} must match authorize. */
public record IdpOAuthRequest(
        @NotBlank String code,
        @NotBlank String state,
        @NotBlank String redirectUri
) {
}
