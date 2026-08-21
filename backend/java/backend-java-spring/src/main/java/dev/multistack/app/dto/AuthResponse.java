package dev.multistack.app.dto;

public record AuthResponse(
        String token,
        String username,
        String redirectUrl
) {
}
