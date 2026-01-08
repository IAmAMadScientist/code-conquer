package com.codeconquer.server.service;

import com.codeconquer.server.exception.ChallengeNotFoundException;
import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Challenge;
import com.codeconquer.server.model.Difficulty;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;

@Component
public class ChallengeLoader {

    private final Map<Category, List<Challenge>> challengeMap = new EnumMap<>(Category.class);
    private final Map<String, Challenge> byId = new HashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();
    private final Random rng = new Random();

    @PostConstruct
    public void loadChallenges() {
        // You renamed spot.json -> bug.json, so we load bug.json now
        loadCategoryFile("challenges/trace.json");
        loadCategoryFile("challenges/bug.json");
        loadCategoryFile("challenges/binary.json");
        loadCategoryFile("challenges/concept.json");

        System.out.println("ChallengeLoader: total challenges indexed by id = " + byId.size());
    }

    private void loadCategoryFile(String path) {
        try (InputStream is = getClass().getClassLoader().getResourceAsStream(path)) {
            if (is == null) {
                System.err.println("ChallengeLoader: Missing file: " + path);
                return;
            }

            List<Challenge> list = mapper.readValue(is, new TypeReference<List<Challenge>>() {});

            for (Challenge c : list) {
                // Require category in JSON (your choice). If missing, skip and warn.
                if (c.getCategory() == null) {
                    System.err.println("ChallengeLoader: Skipping challenge with missing category in " + path
                            + " (question=" + safeShort(c.getQuestion()) + ")");
                    continue;
                }

                // Generate id if not present
                if (c.getId() == null || c.getId().isBlank()) {
                    c.setId(UUID.randomUUID().toString());
                }

                // Store into category map
                challengeMap.computeIfAbsent(c.getCategory(), k -> new ArrayList<>()).add(c);

                // Store into id index
                byId.put(c.getId(), c);
            }

            System.out.println("ChallengeLoader: Loaded " + list.size() + " from " + path);
        } catch (Exception e) {
            System.err.println("ChallengeLoader: Failed reading " + path + " -> " + e.getMessage());
            e.printStackTrace();
        }
    }

    public Challenge getRandom(Category cat, Difficulty diff) {
        List<Challenge> pool = challengeMap.getOrDefault(cat, List.of());

        List<Challenge> filtered = pool.stream()
                .filter(c -> c.getDifficulty() == diff)
                .toList();

        if (filtered.isEmpty()) {
            throw new ChallengeNotFoundException("No challenge found for category=" + cat + ", difficulty=" + diff);
        }

        return filtered.get(rng.nextInt(filtered.size()));
    }

    public Challenge getByIdOrThrow(String id) {
        Challenge c = byId.get(id);
        if (c == null) {
            throw new ChallengeNotFoundException("No challenge found for id=" + id);
        }
        return c;
    }

    private String safeShort(String s) {
        if (s == null) return "null";
        return s.length() <= 40 ? s : s.substring(0, 40) + "...";
    }
}
