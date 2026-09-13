package dev.multistack.app.dto;

/**
 * Dest cloud repo after the assemble tree is on {@code main}. {@code pushed} is true
 * even when GitHub already had the same tree. Never a token or PAT. Never dest user.
 */
public record CloudRepoPushResponse(String login, String url, boolean pushed) {
}
