package com.codeconquer.server.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "game_event", indexes = {
        @Index(name = "idx_game_event_session_seq", columnList = "sessionId,seq")
})
public class GameEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String sessionId;

    /**
     * Monotonic sequence per session (1,2,3...).
     * Clients can poll using afterSeq.
     */
    @Column(nullable = false)
    private long seq;

    @Column(nullable = false)
    private String type;

    @Column(nullable = false, length = 500)
    private String message;

    @Column(nullable = false)
    private Instant createdAt;

    public GameEvent() {}

    public GameEvent(String sessionId, long seq, String type, String message, Instant createdAt) {
        this.sessionId = sessionId;
        this.seq = seq;
        this.type = type;
        this.message = message;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public long getSeq() {
        return seq;
    }

    public void setSeq(long seq) {
        this.seq = seq;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
