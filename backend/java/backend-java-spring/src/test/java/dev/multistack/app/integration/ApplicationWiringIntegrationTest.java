package dev.multistack.app.integration;

import dev.multistack.app.allure.IntegrationTestBase;
import dev.multistack.app.dto.HealthResponse;
import dev.multistack.app.dto.ItemsResponse;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@Epic("Application wiring")
@Feature("PostgreSQL and Flyway")
@Severity(SeverityLevel.BLOCKER)
@DisplayName("Application wiring on real PostgreSQL")
class ApplicationWiringIntegrationTest extends IntegrationTestBase {

    @Test
    @DisplayName("GET /api/health — full stack reports the active backend module")
    void healthReportsActiveBackendService() {
        ResponseEntity<HealthResponse> response = getJson("/api/health", HealthResponse.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("ok", response.getBody().status());
        assertEquals("backend-java-spring", response.getBody().service());
    }

    @Test
    @DisplayName("GET /api/items — catalogue is served from PostgreSQL with Flyway seed")
    void itemsAreWiredToPostgreSQL() {
        ResponseEntity<ItemsResponse> response = getJson("/api/items", ItemsResponse.class);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("postgresql", response.getBody().source());
        assertEquals(3, response.getBody().items().size());
        assertEquals("Alpha", response.getBody().items().getFirst().name());
        assertEquals("Beta", response.getBody().items().get(1).name());
        assertEquals("Gamma", response.getBody().items().getLast().name());
    }
}
