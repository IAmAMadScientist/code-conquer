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

    // Reserved for Variant 2 (e.g., color/avatar). Keep nullable for now.
    private String color;

    private Instant createdAt;
}
