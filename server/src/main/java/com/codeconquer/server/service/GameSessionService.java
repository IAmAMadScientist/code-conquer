package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.GameSessionRepository;
import com.codeconquer.server.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
public class GameSessionService {

    private final GameSessionRepository sessionRepository;
    private final PlayerRepository playerRepository;
    private final Random random = new Random();

    public GameSessionService(GameSessionRepository sessionRepository, PlayerRepository playerRepository) {
        this.sessionRepository = sessionRepository;
        this.playerRepository = playerRepository;
    }

    public GameSession createNew() {
        GameSession s = new GameSession();
        s.setId(UUID.randomUUID().toString());
        s.setCode(generateUniqueCode());
        s.setCreatedAt(Instant.now());
        s.setStarted(false);
        s.setCurrentTurnOrder(0);
        return sessionRepository.save(s);
    }

    public Optional<GameSession> findById(String id) {
        return sessionRepository.findById(id);
    }

    public Optional<GameSession> findByCode(String code) {
        return sessionRepository.findByCodeIgnoreCase(code);
    }

    public GameSession save(GameSession s) {
        return sessionRepository.save(s);
    }

    public void tryStartIfAllReady(String sessionId) {
        Optional<GameSession> opt = findById(sessionId);
        if (opt.isEmpty()) return;

        GameSession s = opt.get();
        if (s.isStarted()) return;

        List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (players.isEmpty()) return;

        boolean allReady = players.stream().allMatch(Player::isReady);
        if (!allReady) return;

        // Start: current turn is player with turnOrder=1 (first joined). Can change to random later.
        s.setStarted(true);
        int first = players.stream().mapToInt(Player::getTurnOrder).min().orElse(1);
        s.setCurrentTurnOrder(first);
        save(s);
    }

    public void advanceTurn(String sessionId) {
        Optional<GameSession> opt = findById(sessionId);
        if (opt.isEmpty()) return;

        GameSession s = opt.get();
        if (!s.isStarted()) return;

        List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (players.isEmpty()) return;

        int max = players.stream().mapToInt(Player::getTurnOrder).max().orElse(1);
        int min = players.stream().mapToInt(Player::getTurnOrder).min().orElse(1);

        int next = s.getCurrentTurnOrder() + 1;
        if (next > max) next = min;

        s.setCurrentTurnOrder(next);
        save(s);
    }

    private String generateUniqueCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        while (true) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < 6; i++) {
                sb.append(chars.charAt(random.nextInt(chars.length())));
            }
            String code = sb.toString();
            if (sessionRepository.findByCodeIgnoreCase(code).isEmpty()) return code;
        }
    }
}
