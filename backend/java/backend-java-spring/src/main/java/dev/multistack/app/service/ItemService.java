package dev.multistack.app.service;

import dev.multistack.app.dto.HealthResponse;
import dev.multistack.app.dto.ItemDto;
import dev.multistack.app.dto.ItemsResponse;
import dev.multistack.app.repository.ItemRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ItemService {

    /** Matches {@code health_service} for this module in {@code deploy/matrix.yaml}. */
    private static final String SERVICE_NAME = "backend-java-spring";

    private static final Sort BY_ID = Sort.by(Sort.Direction.ASC, "id");

    private final ItemRepository repository;

    public ItemService(ItemRepository repository) {
        this.repository = repository;
    }

    public HealthResponse health() {
        return new HealthResponse("ok", SERVICE_NAME);
    }

    public ItemsResponse listItems() {
        List<ItemDto> items = repository.findAll(BY_ID).stream()
                .map(entity -> new ItemDto(entity.getId(), entity.getName(), entity.getDescription()))
                .toList();
        return new ItemsResponse(items, "postgresql");
    }
}
