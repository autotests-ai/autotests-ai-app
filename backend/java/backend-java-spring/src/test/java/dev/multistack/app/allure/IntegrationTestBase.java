package dev.multistack.app.allure;

import io.qameta.allure.Allure;
import io.qameta.allure.Owner;
import org.junit.jupiter.api.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Full Spring Boot context against real PostgreSQL — classical application integration.
 * Runs in CI before build/deploy; not HTTP against a live stand.
 */
@Owner("stanislav")
@Layer("integration")
@Tag("integration")
@Module("backend-java-spring")
@Language("java")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
public abstract class IntegrationTestBase {

    @ServiceConnection
    protected static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();
    }

    @Autowired
    protected TestRestTemplate rest;

    protected <T> ResponseEntity<T> getJson(String url, Class<T> type) {
        return Allure.step("GET " + url, () -> rest.getForEntity(url, type));
    }

    protected <T> ResponseEntity<T> postJson(String url, Object body, Class<T> type) {
        return Allure.step("POST " + url, () -> rest.postForEntity(url, jsonEntity(body), type));
    }

    protected <T> ResponseEntity<T> exchangeJson(
            String url, HttpMethod method, HttpEntity<?> entity, Class<T> type) {
        return Allure.step(method.name() + " " + url, () -> rest.exchange(url, method, entity, type));
    }

    protected HttpEntity<Void> bearerEntity(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    protected <T> HttpEntity<T> jsonEntity(T body) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }

    protected <T> HttpEntity<T> jsonBearerEntity(T body, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(token);
        return new HttpEntity<>(body, headers);
    }
}
