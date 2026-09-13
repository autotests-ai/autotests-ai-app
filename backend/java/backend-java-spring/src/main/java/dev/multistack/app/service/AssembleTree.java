package dev.multistack.app.service;

import dev.multistack.app.dto.GithubTreeBlob;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Frozen assemble files pushed to {@code github.com/{login}/{e2e.stack}}.
 * Classpath only — never a PAT or OAuth token.
 */
@Component
public class AssembleTree {

    public static final String ROOT = "assemble-tree";
    static final List<String> FILES = List.of(
            "README.md",
            ".gitignore",
            "docs/coverage-profile.md");

    private final List<GithubTreeBlob> blobs;

    public AssembleTree() {
        this(read(FILES));
    }

    AssembleTree(List<GithubTreeBlob> blobs) {
        this.blobs = List.copyOf(blobs);
    }

    public List<GithubTreeBlob> blobs() {
        return blobs;
    }

    static List<GithubTreeBlob> read(List<String> paths) {
        try {
            List<GithubTreeBlob> blobs = new ArrayList<>();
            for (String path : paths) {
                blobs.add(readBlob(path));
            }
            return List.copyOf(blobs);
        } catch (IOException ex) {
            return List.of();
        }
    }

    static GithubTreeBlob readBlob(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(ROOT + "/" + resourceName(path));
        return new GithubTreeBlob(path, resource.getContentAsString(StandardCharsets.UTF_8));
    }

    static String resourceName(String path) {
        if (".gitignore".equals(path)) {
            return "gitignore";
        }
        return path;
    }
}
