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

    private String code; // short join code, e.g. 6 chars

    private Instant createdAt;
}
