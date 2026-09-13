package dev.multistack.app.service;

import dev.multistack.app.allure.UnitTestBase;
import dev.multistack.app.dto.GithubTreeBlob;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Epic("GitHub OAuth")
@Feature("AssembleTree")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("AssembleTree")
class AssembleTreeTest extends UnitTestBase {

    @Test
    @DisplayName("loads the frozen assemble files from the classpath without a PAT")
    void classpathLoadsFrozenFiles() {
        List<GithubTreeBlob> blobs = new AssembleTree().blobs();
        assertEquals(AssembleTree.FILES, blobs.stream().map(GithubTreeBlob::path).toList());
        String blob = blobs.toString().toLowerCase();
        assertTrue(blobs.stream().anyMatch(item -> item.content().contains(GithubOAuthService.REPO_NAME)));
        assertTrue(blob.contains("readme.md"));
        assertTrue(!blob.contains("ghp_"));
        assertTrue(!blob.contains("gho_"));
        assertTrue(!blobs.isEmpty());
        assertEquals("gitignore", AssembleTree.resourceName(".gitignore"));
        assertEquals("README.md", AssembleTree.resourceName("README.md"));
    }

    @Test
    @DisplayName("copies an injected tree and treats a missing classpath file as empty")
    void injectedAndMissing() {
        List<GithubTreeBlob> injected = List.of(new GithubTreeBlob("README.md", "assemble\n"));
        assertEquals(injected, new AssembleTree(injected).blobs());
        assertTrue(AssembleTree.read(List.of("missing-never-ship.md")).isEmpty());
        assertThrows(IOException.class, () -> AssembleTree.readBlob("missing-never-ship.md"));
    }
}
