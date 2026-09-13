package dev.multistack.app.dto;

/** One path in the frozen assemble tree. Never a token or PAT. */
public record GithubTreeBlob(String path, String content) {
}
