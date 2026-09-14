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

@Epic("Adopt")
@Feature("AdoptProperties")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("AdoptProperties")
class AdoptPropertiesTest extends UnitTestBase {

    @Test
    @DisplayName("configured requires ADOPT_URL")
    void configuredRequiresUrl() {
        assertTrue(new AdoptProperties("http://127.0.0.1:3033").configured());
        assertFalse(new AdoptProperties(null).configured());
        assertFalse(new AdoptProperties("").configured());
        assertFalse(new AdoptProperties("  ").configured());
        assertFalse(AdoptProperties.hasText(null));
        assertTrue(AdoptProperties.hasText("http://127.0.0.1:3033"));
    }

    @Test
    @DisplayName("adopt endpoint is POST /adopt on the stand URL, not /assemble")
    void adoptEndpointJoinsPath() {
        assertEquals(
                "http://127.0.0.1:3033/adopt",
                new AdoptProperties("http://127.0.0.1:3033").adoptEndpoint());
        assertEquals(
                "http://127.0.0.1:3033/adopt",
                new AdoptProperties("http://127.0.0.1:3033/").adoptEndpoint());
        assertEquals(
                "http://127.0.0.1:3033/adopt",
                new AdoptProperties("http://127.0.0.1:3033/adopt").adoptEndpoint());
        assertEquals(
                "http://127.0.0.1:3033/adopt",
                new AdoptProperties("http://127.0.0.1:3033/adopt/").adoptEndpoint());
        assertEquals("/adopt", new AdoptProperties(null).adoptEndpoint());
        assertEquals("/adopt", new AdoptProperties("").adoptEndpoint());
        assertFalse(new AdoptProperties("http://127.0.0.1:3033").adoptEndpoint().contains("/assemble"));
    }

    @Test
    @DisplayName("dest zip endpoint is POST /adopt/zip on the stand URL, not /assemble")
    void adoptZipEndpointJoinsPath() {
        assertEquals(
                "http://127.0.0.1:3033/adopt/zip",
                new AdoptProperties("http://127.0.0.1:3033").adoptZipEndpoint());
        assertEquals(
                "http://127.0.0.1:3033/adopt/zip",
                new AdoptProperties("http://127.0.0.1:3033/").adoptZipEndpoint());
        assertEquals(
                "http://127.0.0.1:3033/adopt/zip",
                new AdoptProperties("http://127.0.0.1:3033/adopt").adoptZipEndpoint());
        assertEquals(
                "http://127.0.0.1:3033/adopt/zip",
                new AdoptProperties("http://127.0.0.1:3033/adopt/").adoptZipEndpoint());
        assertEquals(
                "http://127.0.0.1:3033/adopt/zip",
                new AdoptProperties("http://127.0.0.1:3033/adopt/zip").adoptZipEndpoint());
        assertEquals(
                "http://127.0.0.1:3033/adopt/zip",
                new AdoptProperties("http://127.0.0.1:3033/adopt/zip/").adoptZipEndpoint());
        assertEquals("/adopt/zip", new AdoptProperties(null).adoptZipEndpoint());
        assertEquals("/adopt/zip", new AdoptProperties("").adoptZipEndpoint());
        assertEquals("/adopt/zip", new AdoptProperties("   ").adoptZipEndpoint());
        assertFalse(new AdoptProperties("http://127.0.0.1:3033").adoptZipEndpoint().contains("/assemble"));
    }
}
