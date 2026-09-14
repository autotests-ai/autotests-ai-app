package dev.multistack.app.dto;

/**
 * Server-side school IdP exchange. The access token is stored in an httpOnly cookie
 * and must never be serialized as a JSON body.
 */
public record IdpOAuthSession(String login, String accessToken) {
}
