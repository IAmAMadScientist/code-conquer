package com.codeconquer.server.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;

import java.time.Instant;

@Data
@Entity
public class GameSession {

    @Id
    private String id; // UUID string

    private String code;

    private boolean started;

    // Current player's turn order (1..n). 0 means not started.
    private int currentTurnOrder;

    // Turn phase control
    // IDLE | IN_CHALLENGE
    private String turnStatus;

    // Set when turnStatus == IN_CHALLENGE
    private String activeChallengeId;

    // Lightweight event channel for polling clients (no websockets needed).
    // Increment lastEventSeq whenever something noteworthy happens (player left, etc.).
    private long lastEventSeq;
    private String lastEventType;
    private String lastEventMessage;
    private Instant lastEventAt;

    private Instant createdAt;
}
