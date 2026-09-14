package dev.multistack.app.config;

import dev.multistack.app.allure.UnitTestBase;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

@Epic("GitHub OAuth")
@Feature("AssembleProperties")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("AssembleProperties")
class AssemblePropertiesTest extends UnitTestBase {

    @Test
    @DisplayName("configured requires ASSEMBLE_URL")
    void configuredRequiresUrl() {
        assertTrue(new AssembleProperties("http://127.0.0.1:3032").configured());
        assertFalse(new AssembleProperties(null).configured());
        assertFalse(new AssembleProperties("").configured());
        assertFalse(new AssembleProperties("  ").configured());
        assertFalse(AssembleProperties.hasText(null));
        assertFalse(AssembleProperties.hasText(""));
        assertFalse(AssembleProperties.hasText("  "));
        assertTrue(AssembleProperties.hasText("http://127.0.0.1:3032"));
    }

    @Test
    @DisplayName("assemble endpoint is POST /assemble on the stand URL")
    void assembleEndpointJoinsPath() {
        assertEquals(
                "http://127.0.0.1:3032/assemble",
                new AssembleProperties("http://127.0.0.1:3032").assembleEndpoint());
        assertEquals(
                "http://127.0.0.1:3032/assemble",
                new AssembleProperties("http://127.0.0.1:3032/").assembleEndpoint());
        assertEquals(
                "http://127.0.0.1:3032/assemble",
                new AssembleProperties("http://127.0.0.1:3032///").assembleEndpoint());
        assertEquals(
                "http://127.0.0.1:3032/assemble",
                new AssembleProperties("http://127.0.0.1:3032/assemble").assembleEndpoint());
        assertEquals(
                "http://127.0.0.1:3032/assemble",
                new AssembleProperties("http://127.0.0.1:3032/assemble/").assembleEndpoint());
        assertEquals("/assemble", new AssembleProperties(null).assembleEndpoint());
        assertEquals("/assemble", new AssembleProperties("").assembleEndpoint());
    }
}
