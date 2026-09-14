package dev.multistack.app.dto;

/** Dest cloud identity after school IdP. Never a token in JSON. Never create. */
public record IdpOAuthLoginResponse(String login) {
}
