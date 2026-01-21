package com.codeconquer.server.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
public class Player {

    @Id
    private String id; // UUID string

    private String sessionId;

    private String name;

    // Variant 2 ready: emoji/icon + optional color
    private String icon;   // e.g. "🦊"
    private String color;  // reserved

    private boolean ready;

    // Turn order within session (1..n)
    private int turnOrder;

    // Running total score for this match.
    // This is the single source of truth for the leaderboard.
    private int totalScore;

    // Lobby D20 roll used to determine the initial turn order.
    // Nullable until the player has rolled.
    private Integer lobbyRoll;

    // --- Board position state (Phase 2A) ---
    // The current node id on the board graph (e.g. "n0").
    // Initialized to START when the player joins a session.
    private String positionNodeId;

    // Jail mechanic support (Phase 2A prep): number of upcoming turns to skip.
    // For example, entering JAIL sets this to 1.
    private int skipTurns;

    private Instant createdAt;
}
