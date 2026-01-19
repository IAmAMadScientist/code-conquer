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

    private Instant createdAt;
}
