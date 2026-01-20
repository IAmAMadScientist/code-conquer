package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
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

    public Player registerPlayer(String sessionId, String name, String icon) {
        if (sessionId == null || sessionId.isBlank()) throw new IllegalArgumentException("sessionId required");
        if (name == null || name.isBlank()) throw new IllegalArgumentException("name required");

        Optional<GameSession> session = sessionService.findById(sessionId);
        if (session.isEmpty()) throw new IllegalArgumentException("session not found");

        String trimmed = name.trim();

        Optional<Player> existing = playerRepository.findBySessionIdAndNameIgnoreCase(sessionId, trimmed);
        if (existing.isPresent()) {
            // Optionally update icon if provided
            Player p = existing.get();
            if (icon != null && !icon.isBlank()) p.setIcon(icon.trim());
            return playerRepository.save(p);
        }

        Player p = new Player();
        p.setId(UUID.randomUUID().toString());
        p.setSessionId(sessionId);
        p.setName(trimmed);
        p.setIcon(icon == null || icon.isBlank() ? "🙂" : icon.trim());
        p.setReady(false);
        p.setTotalScore(0);

        int nextOrder = playerRepository.getMaxTurnOrder(sessionId) + 1;
        p.setTurnOrder(nextOrder);

        p.setCreatedAt(Instant.now());
        return playerRepository.save(p);
    }

    public List<Player> listPlayers(String sessionId) {
        return playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
    }

    public Optional<Player> findById(String playerId) {
        return playerRepository.findById(playerId);
    }

    public Player setReady(String sessionId, String playerId, boolean ready) {
        Player p = playerRepository.findById(playerId).orElseThrow(() -> new IllegalArgumentException("player not found"));
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) throw new IllegalArgumentException("player not in session");
        p.setReady(ready);
        Player saved = playerRepository.save(p);
        sessionService.tryStartIfAllReady(sessionId);
        return saved;
    }

    /**
     * Adds points to a player's running total score for this session.
     */
    public Player addToTotalScore(String sessionId, String playerId, int deltaPoints) {
        Player p = playerRepository.findById(playerId).orElseThrow(() -> new IllegalArgumentException("player not found"));
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) {
            throw new IllegalArgumentException("player not in session");
        }
        int next = p.getTotalScore() + Math.max(0, deltaPoints);
        p.setTotalScore(next);
        return playerRepository.save(p);
    }

    public void removePlayer(String sessionId, String playerId) {
        Player p = playerRepository.findById(playerId)
                .orElseThrow(() -> new IllegalArgumentException("player not found"));
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) {
            throw new IllegalArgumentException("player not in session");
        }
        int leavingOrder = p.getTurnOrder();
        String leavingName = p.getName();
        String leavingIcon = p.getIcon();
        playerRepository.delete(p);
        sessionService.handlePlayerLeft(sessionId, leavingOrder, leavingName, leavingIcon);
    }
}
