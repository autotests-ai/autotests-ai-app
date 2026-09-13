package dev.multistack.app.dto;

/** Dest user identity after GitHub OAuth. Never a token or PAT. */
public record GithubOAuthLoginResponse(String login) {
}
