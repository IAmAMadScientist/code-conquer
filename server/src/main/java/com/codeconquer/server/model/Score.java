package com.codeconquer.server.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Session ID is required")
    private String sessionId;
    
    private String sessionCode;

    @NotBlank(message = "Challenge ID is required")
    private String challengeId;

    @NotBlank(message = "Player ID is required")
    private String playerId;

    private String playerName;

    @NotBlank(message = "Category is required")
    private String category;

    @NotBlank(message = "Difficulty is required")
    private String difficulty;

    @PositiveOrZero(message = "Points must be zero or positive")
    private int points;

    @NotNull(message = "Time is required")
    @PositiveOrZero(message = "Time must be zero or positive")
    private Long timeMs;

    @NotNull(message = "Errors count is required")
    @PositiveOrZero(message = "Errors must be zero or positive")
    private Integer errors;

    private Instant createdAt;
}