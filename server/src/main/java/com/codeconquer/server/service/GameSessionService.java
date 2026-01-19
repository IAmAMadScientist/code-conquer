package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.GameSessionRepository;
import com.codeconquer.server.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
public class GameSessionService {

    public static final String TURN_IDLE = "IDLE";
    public static final String TURN_IN_CHALLENGE = "IN_CHALLENGE";

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
        s.setTurnStatus(TURN_IDLE);
        s.setActiveChallengeId(null);
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

    /**
     * Ensures players in a session have a clean sequential turnOrder (1..n).
     * This prevents edge cases where turnOrder might be 0 or have gaps due to older data.
     */
    public void normalizeTurnOrders(String sessionId) {
        List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (players.isEmpty()) return;

        players.sort(Comparator.comparing(Player::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder())));
        int i = 1;
        boolean changed = false;
        for (Player p : players) {
            if (p.getTurnOrder() != i) {
                p.setTurnOrder(i);
                changed = true;
            }
            i++;
        }
        if (changed) {
            playerRepository.saveAll(players);
        }
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

        normalizeTurnOrders(sessionId);

        s.setStarted(true);
        s.setCurrentTurnOrder(1);
        s.setTurnStatus(TURN_IDLE);
        s.setActiveChallengeId(null);
        save(s);
    }

    /**
     * Advances to the next player in sequential turn order.
     * Uses the actual list of players rather than numeric +1 with gaps.
     */
    public void advanceTurn(String sessionId) {
        Optional<GameSession> opt = findById(sessionId);
        if (opt.isEmpty()) return;

        GameSession s = opt.get();
        if (!s.isStarted()) return;

        normalizeTurnOrders(sessionId);
        List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (players.isEmpty()) return;

        int n = players.size();
        int current = s.getCurrentTurnOrder();
        if (current < 1 || current > n) current = 1;

        int next = current + 1;
        if (next > n) next = 1;

        s.setCurrentTurnOrder(next);
        s.setTurnStatus(TURN_IDLE);
        s.setActiveChallengeId(null);
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
