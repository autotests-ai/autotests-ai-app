package dev.multistack.app.dto;

/** Dest zip bytes of {@code generated-projects/adopt-<id>}. Never etalon render. */
public record AdoptZip(byte[] body, String filename) {

    public static final String DEFAULT_FILENAME = "adopt.zip";
}
