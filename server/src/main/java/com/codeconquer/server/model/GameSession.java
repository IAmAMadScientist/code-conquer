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

    // Session lifecycle: LOBBY -> IN_PROGRESS -> FINISHED
    private String status;

    // Set when status == FINISHED
    private String winnerPlayerId;

    // Once the lobby turn order has been finalized (or the game started),
    // prevent further lobby re-rolls.
    private boolean turnOrderLocked;

    // Current player's turn order (1..n). 0 means not started.
    private int currentTurnOrder;

    // Turn phase control
    // IDLE | IN_CHALLENGE | AWAITING_CONFIRM | AWAITING_D6_ROLL | AWAITING_PATH_CHOICE
    private String turnStatus;

    // Set when turnStatus == IN_CHALLENGE
    private String activeChallengeId;

    // --- Board movement state (Phase 2B) ---
    // Last d6 roll result for the current turn.
    private Integer lastDiceRoll;

    // If the player encountered a fork mid-move, we stop and require a path choice.
    // pendingForkNodeId is the node where the fork decision must be made.
    private String pendingForkNodeId;
    // Remaining steps left to move after choosing a path.
    private Integer pendingRemainingSteps;

    // Lightweight event channel for polling clients (no websockets needed).
    // Increment lastEventSeq whenever something noteworthy happens (player left, etc.).
    private long lastEventSeq;
    private String lastEventType;
    private String lastEventMessage;
    private Instant lastEventAt;

    private Instant createdAt;
}
