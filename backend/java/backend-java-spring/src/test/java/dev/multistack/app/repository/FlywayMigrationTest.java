package dev.multistack.app.repository;

import dev.multistack.app.entity.ItemEntity;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@Epic("Persistence")
@Feature("Flyway schema")
@Severity(SeverityLevel.CRITICAL)
@DisplayName("Flyway schema on real PostgreSQL")
class FlywayMigrationTest extends PostgresSliceTestBase {

    @Autowired
    private ItemRepository itemRepository;

    @Test
    @DisplayName("migrations apply and seed the items catalogue (V1)")
    void migrationsSeedItems() {
        List<ItemEntity> items = itemRepository.findAll(Sort.by(Sort.Direction.ASC, "id"));

        assertEquals(3, items.size());
        assertEquals(List.of("Alpha", "Beta", "Gamma"), items.stream().map(ItemEntity::getName).toList());
        items.forEach(item -> {
            assertNotNull(item.getId());
            assertNotNull(item.getDescription());
        });
    }

    @Test
    @DisplayName("insert into the migrated schema assigns an identity id")
    void insertAssignsIdentityId() {
        ItemEntity saved = itemRepository.saveAndFlush(
                new ItemEntity("Delta", "Inserted by the persistence slice"));

        assertNotNull(saved.getId());
        assertEquals("Delta", saved.getName());
        assertEquals("Inserted by the persistence slice", saved.getDescription());
    }
}
