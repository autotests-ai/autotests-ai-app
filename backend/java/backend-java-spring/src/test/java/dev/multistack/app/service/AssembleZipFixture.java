package dev.multistack.app.service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

/** Tiny dest-zip shaped archive for AssembleTree / push tests. Never a PAT. */
final class AssembleZipFixture {

    private AssembleZipFixture() {
    }

    static byte[] cellZip() {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(out)) {
                directory(zip, "assemble-from-landing-home/");
                directory(zip, "assemble-from-landing-home/backend/");
                text(zip, "assemble-from-landing-home/README.md", "assemble\n");
                text(zip, "assemble-from-landing-home/.gitignore", ".env\n");
                text(zip, "assemble-from-landing-home/backend/java/backend-java-spring/README.md", "backend\n");
                text(zip, "assemble-from-landing-home/frontend/typescript/frontend-typescript-react/package.json", "{}\n");
                text(zip, "assemble-from-landing-home/tests/java/tests-java-junit5-rest_assured-selenide/README.md", "tests\n");
                text(zip, "assemble-from-landing-home/_contract/openapi.yaml", "openapi: 3.1.0\n");
                text(zip, "assemble-from-landing-home/docs/agent-skills/rag/po-fluent.md", "os harness\n");
                text(zip, "assemble-from-landing-home/node_modules/left-pad/index.js", "skip\n");
                text(zip, "assemble-from-landing-home/backend/java/backend-java-spring/build/classes/Foo.txt", "skip\n");
                text(zip, "assemble-from-landing-home/docs/agent-skills/rag/hw-check-verdict.md", "course\n");
                text(zip, "assemble-from-landing-home/docs/agent-skills/qa-homework-check/SKILL.md", "course\n");
                text(zip, "assemble-from-landing-home/.cursor/rules/05-homework-check.mdc", "course\n");
                text(zip, "assemble-from-landing-home/.DS_Store", "skip\n");
                text(zip, "assemble-from-landing-home/docs/.DS_Store", "skip\n");
                zip.putNextEntry(new ZipEntry("assemble-from-landing-home/frontend/icon.png"));
                zip.write(new byte[] {(byte) 0x89, 'P', 'N', 'G', 0, 1, 2});
                zip.closeEntry();
            }
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    static byte[] emptyZip() {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(out)) {
                zip.flush();
            }
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    static byte[] unwrappedCellZip() {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(out)) {
                text(zip, "backend/java/README.md", "backend\n");
                text(zip, "frontend/package.json", "{}\n");
                text(zip, "tests/java/README.md", "tests\n");
                text(zip, "_contract/openapi.yaml", "openapi: 3.1.0\n");
                text(zip, "README.md", "assemble\n");
            }
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    static byte[] mixedPrefixZip() {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(out)) {
                text(zip, "foo/a.md", "a\n");
                text(zip, "bar/b.md", "b\n");
            }
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    static byte[] jsonBytes() {
        return "{\"ok\":true}".getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    /** Intern dest after Import: backend module + filled tests, no frontend, no etalon README. */
    static byte[] internZip() {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            try (ZipOutputStream zip = new ZipOutputStream(out)) {
                text(zip, "adopt-intern-flat/backend/java/backend-java-spring/build.gradle",
                        "plugins { id 'java' }\n");
                text(zip, "adopt-intern-flat/backend/java/backend-java-spring/src/main/java/App.java",
                        "class App {}\n");
                text(zip,
                        "adopt-intern-flat/tests/java/tests-java-junit5-rest_assured-selenide/src/test/java/LoginTest.java",
                        "class LoginTest {}\n");
                text(zip, "adopt-intern-flat/docs/coverage-profile.md", "intern\n");
                text(zip, "adopt-intern-flat/docs/agent-skills/PACK.md", "pack\n");
                text(zip, "adopt-intern-flat/.clinerules/01-qa-java-gradle.md", "os\n");
                text(zip, "adopt-intern-flat/node_modules/left-pad/index.js", "skip\n");
            }
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static void directory(ZipOutputStream zip, String name) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.closeEntry();
    }

    private static void text(ZipOutputStream zip, String name, String content) throws IOException {
        zip.putNextEntry(new ZipEntry(name));
        zip.write(content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        zip.closeEntry();
    }
}
