package dev.multistack.app.dto;

/**
 * Dest user repo after GitHub create. {@code created} is true even when the repo
 * already existed. Never a token or PAT.
 */
public record GithubOAuthRepoResponse(String login, String url, boolean created) {
}
