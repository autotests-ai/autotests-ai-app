package dev.multistack.app.repository;

import dev.multistack.app.allure.SliceTestBase;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * Persistence slice against the same PostgreSQL the app ships with (docker-compose uses
 * {@code postgres:16-alpine} too). Flyway migrates the container schema on context start and
 * {@code hibernate.ddl-auto: validate} then checks the entities against it, so an entity/migration
 * drift fails these tests before any deploy.
 *
 * <p>Singleton container (started once per JVM, shared by all persistence test classes);
 * Testcontainers' Ryuk reaps it when the JVM exits. Requires a running Docker daemon —
 * a deliberate part of the dev environment, same as docker-compose for the app itself.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
public abstract class PostgresSliceTestBase extends SliceTestBase {

    @ServiceConnection
    protected static final PostgreSQLContainer<?> POSTGRES =
            new PostgreSQLContainer<>("postgres:16-alpine");

    static {
        POSTGRES.start();
    }
}
