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

    private String sessionId;
    private String sessionCode;

    // Challenge instance token to prevent double-starts / double-submits
    private String challengeId;

    // New: stable identity within a session. Frontend should send playerId.
    private String playerId;

    // Denormalized for easy leaderboard queries / history. Backend sets this from playerId.
    private String playerName;

    // For minigames: category is your minigame identifier (STACK_MAZE, GRAPH_PATH, ...)
    private String category;

    private String difficulty;

    private int points;

    // Analytics inputs (used by scoring formula)
    private Long timeMs;
    private Integer errors;

    private Instant createdAt;
}