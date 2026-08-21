package dev.multistack.app.controller;

import dev.multistack.app.dto.HealthResponse;
import dev.multistack.app.dto.ItemsResponse;
import dev.multistack.app.service.ItemService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class ApiController {

    private final ItemService itemService;

    public ApiController(ItemService itemService) {
        this.itemService = itemService;
    }

    @GetMapping("/health")
    public HealthResponse health() {
        return itemService.health();
    }

    @GetMapping("/items")
    public ItemsResponse items() {
        return itemService.listItems();
    }
}
