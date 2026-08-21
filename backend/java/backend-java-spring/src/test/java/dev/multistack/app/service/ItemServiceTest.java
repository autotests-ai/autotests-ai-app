package dev.multistack.app.service;

import dev.multistack.app.dto.HealthResponse;
import dev.multistack.app.dto.ItemsResponse;
import dev.multistack.app.entity.ItemEntity;
import dev.multistack.app.repository.ItemRepository;
import dev.multistack.app.allure.UnitTestBase;
import io.qameta.allure.Epic;
import io.qameta.allure.Feature;
import io.qameta.allure.Severity;
import io.qameta.allure.SeverityLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import org.springframework.data.domain.Sort;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@Epic("Home")
@Feature("ItemService")
@Severity(SeverityLevel.NORMAL)
@ExtendWith(MockitoExtension.class)
@DisplayName("ItemService")
class ItemServiceTest extends UnitTestBase {

    @Mock
    private ItemRepository repository;

    private ItemService service;

    @BeforeEach
    void setUp() {
        service = new ItemService(repository);
    }

    @Test
    @DisplayName("health returns ok status")
    void healthReturnsOk() {
        HealthResponse response = service.health();

        assertEquals("ok", response.status());
        assertEquals("backend-java-spring", response.service());
    }

    @Test
    @DisplayName("listItems maps repository rows to DTOs ordered by id")
    void listItemsMapsRows() {
        ItemEntity alpha = new ItemEntity("Alpha", "First item");
        ReflectionTestUtils.setField(alpha, "id", 1L);
        when(repository.findAll(any(Sort.class))).thenReturn(List.of(alpha));

        ItemsResponse response = service.listItems();

        assertEquals(1, response.items().size());
        assertEquals("Alpha", response.items().getFirst().name());
        assertEquals("First item", response.items().getFirst().description());
        assertEquals("postgresql", response.source());

        var sortCaptor = ArgumentCaptor.forClass(Sort.class);
        verify(repository).findAll(sortCaptor.capture());
        assertEquals(Sort.by(Sort.Direction.ASC, "id"), sortCaptor.getValue());
    }

    @Test
    @DisplayName("listItems returns empty list when repository is empty")
    void listItemsReturnsEmptyWhenNoRows() {
        when(repository.findAll(any(Sort.class))).thenReturn(List.of());

        ItemsResponse response = service.listItems();

        assertTrue(response.items().isEmpty());
        assertEquals("postgresql", response.source());
    }
}
