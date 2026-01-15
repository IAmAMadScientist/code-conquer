package com.codeconquer.server.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Groups all scores belonging to one physical boardgame match
    private String sessionId;

    // Convenience for humans (join code). Optional but handy.
    private String sessionCode;

    private String playerName;

    // For minigames: category is your minigame identifier (STACK_MAZE, GRAPH_PATH, ...)
    private String category;

    private String difficulty;

    private int points;

    // Optional analytics / fairness; frontend can fill these in
    private Long timeMs;
    private Integer errors;
    private Instant createdAt;
}
