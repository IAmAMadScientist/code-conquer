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

    private Instant createdAt;
}
