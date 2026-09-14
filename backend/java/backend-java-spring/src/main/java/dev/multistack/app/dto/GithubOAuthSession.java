package dev.multistack.app.dto;

/**
 * Server-side GitHub OAuth exchange. The access token is stored in an httpOnly cookie
 * and must never be serialized as a JSON body.
 */
public record GithubOAuthSession(String login, String accessToken) {
}
