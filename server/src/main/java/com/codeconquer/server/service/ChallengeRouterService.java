package com.codeconquer.server.service;

import com.codeconquer.server.dto.ChallengeDescriptor;
import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Difficulty;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Picks a minigame ("challenge") for a given difficulty and optional category.
 * Current implementation is in-memory and deterministic enough for an MVP.
 * Later you can replace this with DB-driven content, weights, cooldowns,
 * "don't repeat last game" etc.
 */
@Service
public class ChallengeRouterService {

    private final EnumMap<Category, String> categoryToRoute = new EnumMap<>(Category.class);

    public ChallengeRouterService() {
        categoryToRoute.put(Category.STACK_MAZE, "/stackmaze");
        categoryToRoute.put(Category.GRAPH_PATH, "/graphpath");
        categoryToRoute.put(Category.BST_INSERT, "/bstinsert");
        categoryToRoute.put(Category.QUEUE_COMMANDER, "/queuecommander");
    }

    public ChallengeDescriptor pickRandom(Difficulty difficulty, Category categoryOrNull, Category excludeCategoryOrNull) {
        if (difficulty == null) {
            throw new IllegalArgumentException("difficulty is required");
        }

        Category chosenCategory;
        if (categoryOrNull != null) {
            chosenCategory = categoryOrNull;
        } else {
            chosenCategory = pickRandomCategory(excludeCategoryOrNull);
        }
        String route = categoryToRoute.get(chosenCategory);
        if (route == null) {
            throw new IllegalStateException("No route configured for category " + chosenCategory);
        }

        // Optional per-difficulty parameters you can evolve later.
        // Frontend minigames can start reading these when you're ready.
        Map<String, Object> params = defaultParamsFor(chosenCategory, difficulty);

        return new ChallengeDescriptor(
                UUID.randomUUID().toString(),
                chosenCategory,
                difficulty,
                route,
                params
        );
    }

    private Category pickRandomCategory(Category excludeOrNull) {
        List<Category> all = new ArrayList<>(categoryToRoute.keySet());
        // Avoid immediate repeats if possible.
        if (excludeOrNull != null && all.size() > 1) {
            all.removeIf(c -> c == excludeOrNull);
        }
        int idx = ThreadLocalRandom.current().nextInt(all.size());
        return all.get(idx);
    }

    private Map<String, Object> defaultParamsFor(Category category, Difficulty difficulty) {
        // Keep it minimal but future-proof.
        // Examples:
        // - StackMaze: gridSize, timeLimitSec
        // - GraphPath: nodes, weighted
        // - BSTInsert: inserts
        // - QueueCommander: ops
        int level;
        switch (difficulty) {
            case EASY -> level = 1;
            case MEDIUM -> level = 2;
            case HARD -> level = 3;
            default -> level = 1;
        }

        return Map.of(
                "level", level,
                "difficulty", difficulty.name(),
                "category", category.name()
        );
    }
}
