package dev.multistack.app.dto;

/**
 * Dest cloud repo after org create. {@code created} is true even when the repo
 * already existed. Never a token or PAT. Never a dest user URL.
 */
public record CloudRepoResponse(String login, String url, boolean created) {
}
