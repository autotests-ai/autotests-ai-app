package dev.multistack.app.dto;

/** Clone-as-student zip from {@code ASSEMBLE_URL}/clone. Never a form dump or PAT. */
public record CloneZip(byte[] body, String filename) {

    public static final String DEFAULT_FILENAME = "clone-as-student.zip";
}
