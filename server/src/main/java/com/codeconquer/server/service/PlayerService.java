package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final GameSessionService sessionService;

    public PlayerService(PlayerRepository playerRepository, GameSessionService sessionService) {
        this.playerRepository = playerRepository;
        this.sessionService = sessionService;
    }

    public Player registerPlayer(String sessionId, String name) {
        if (sessionId == null || sessionId.isBlank()) {
            throw new IllegalArgumentException("sessionId required");
        }
        if (name == null || name.isBlank()) {
            throw new IllegalArgumentException("name required");
        }

        Optional<GameSession> session = sessionService.findById(sessionId);
        if (session.isEmpty()) {
            throw new IllegalArgumentException("session not found");
        }

        String trimmed = name.trim();
        // If player already exists (case-insensitive), return the existing one.
        Optional<Player> existing = playerRepository.findBySessionIdAndNameIgnoreCase(sessionId, trimmed);
        if (existing.isPresent()) return existing.get();

        Player p = new Player();
        p.setId(UUID.randomUUID().toString());
        p.setSessionId(sessionId);
        p.setName(trimmed);
        p.setCreatedAt(Instant.now());
        return playerRepository.save(p);
    }

    public List<Player> listPlayers(String sessionId) {
        return playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    public Optional<Player> findById(String playerId) {
        return playerRepository.findById(playerId);
    }
}
