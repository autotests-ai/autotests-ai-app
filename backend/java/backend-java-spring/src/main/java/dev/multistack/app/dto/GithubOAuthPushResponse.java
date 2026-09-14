package dev.multistack.app.dto;

/**
 * Dest user repo after the assemble tree is on {@code main}. {@code pushed} is true
 * even when GitHub already had the same tree. Never a token or PAT.
 */
public record GithubOAuthPushResponse(String login, String url, boolean pushed) {
}
