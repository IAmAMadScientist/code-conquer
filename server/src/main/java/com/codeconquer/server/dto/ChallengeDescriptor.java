package com.codeconquer.server.dto;

import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Difficulty;

import java.util.Map;

/**
 * A lightweight description of what "challenge" (minigame) the frontend should open.
 *
 * This intentionally does NOT contain game logic. It is a routing decision plus optional params.
 */
public class ChallengeDescriptor {
    private String id;
    private Category category;
    private Difficulty difficulty;
    private String route;
    private Map<String, Object> params;

    public ChallengeDescriptor() {
    }

    public ChallengeDescriptor(String id, Category category, Difficulty difficulty, String route, Map<String, Object> params) {
        this.id = id;
        this.category = category;
        this.difficulty = difficulty;
        this.route = route;
        this.params = params;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Category getCategory() {
        return category;
    }

    public void setCategory(Category category) {
        this.category = category;
    }

    public Difficulty getDifficulty() {
        return difficulty;
    }

    public void setDifficulty(Difficulty difficulty) {
        this.difficulty = difficulty;
    }

    public String getRoute() {
        return route;
    }

    public void setRoute(String route) {
        this.route = route;
    }

    public Map<String, Object> getParams() {
        return params;
    }

    public void setParams(Map<String, Object> params) {
        this.params = params;
    }
}
