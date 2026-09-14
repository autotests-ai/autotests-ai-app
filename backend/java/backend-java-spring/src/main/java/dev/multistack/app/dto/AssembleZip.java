package dev.multistack.app.dto;

/** Dest zip bytes from {@code ASSEMBLE_URL}. Never a token or PAT. */
public record AssembleZip(byte[] body, String filename) {

    public static final String DEFAULT_FILENAME = "assemble.zip";
}
