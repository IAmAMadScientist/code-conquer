package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final GameSessionService sessionService;
    private final BoardGraphService boardGraphService;
    private final Random random = new Random();

    public PlayerService(PlayerRepository playerRepository, GameSessionService sessionService, BoardGraphService boardGraphService) {
        this.playerRepository = playerRepository;
        this.sessionService = sessionService;
        this.boardGraphService = boardGraphService;
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
            // Phase 2A: ensure board state is initialized for legacy rows
            if (p.getPositionNodeId() == null || p.getPositionNodeId().isBlank()) {
                p.setPositionNodeId(boardGraphService.getStartNodeId());
            }
            return playerRepository.save(p);
        }

        Player p = new Player();
        p.setId(UUID.randomUUID().toString());
        p.setSessionId(sessionId);
        p.setName(trimmed);
        p.setIcon(icon == null || icon.isBlank() ? "🙂" : icon.trim());
        p.setReady(false);
        p.setTotalScore(0);
        p.setLobbyRoll(null);
        // Phase 2A: board position init
        p.setPositionNodeId(boardGraphService.getStartNodeId());
        p.setSkipTurns(0);

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

    /**
     * Internal helper for controllers/services that already validated the player.
     * Keeps repository access centralized.
     */
    public Player save(Player p) {
        return playerRepository.save(p);
    }

    public Player setReady(String sessionId, String playerId, boolean ready) {
        Player p = playerRepository.findById(playerId).orElseThrow(() -> new IllegalArgumentException("player not found"));
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) throw new IllegalArgumentException("player not in session");

        // Phase 1: Must roll a lobby D20 before being allowed to ready up.
        if (ready) {
            if (p.getLobbyRoll() == null) {
                throw new IllegalStateException("Du musst zuerst den D20 für die Zugreihenfolge würfeln.");
            }
            List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
            List<String> tied = sessionService.computeTiedPlayerIds(players);
            if (tied.contains(p.getId())) {
                throw new IllegalStateException("Tie beim D20! Bitte würfle erneut, bevor du Ready drückst.");
            }
        }

        p.setReady(ready);
        Player saved = playerRepository.save(p);
        sessionService.tryStartIfAllReady(sessionId);
        return saved;
    }

    /**
     * Rolls a D20 for lobby turn order. Players may re-roll only if they are in a tie.
     */
    public int rollLobbyD20(String sessionId, String playerId) {
        if (sessionId == null || sessionId.isBlank()) throw new IllegalArgumentException("sessionId required");
        if (playerId == null || playerId.isBlank()) throw new IllegalArgumentException("playerId required");

        GameSession session = sessionService.findById(sessionId).orElseThrow(() -> new IllegalArgumentException("session not found"));
        if (session.isStarted() || session.isTurnOrderLocked()) {
            throw new IllegalStateException("Turn order ist bereits fixiert.");
        }

        Player p = playerRepository.findById(playerId).orElseThrow(() -> new IllegalArgumentException("player not found"));
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) throw new IllegalArgumentException("player not in session");

        List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        List<String> tied = sessionService.computeTiedPlayerIds(players);

        boolean canRoll = (p.getLobbyRoll() == null) || tied.contains(p.getId());
        if (!canRoll) {
            throw new IllegalStateException("Du hast bereits gewürfelt.");
        }

        // IMPORTANT:
        // If the player is currently part of a tie, everyone in that tie group must re-roll.
        // Otherwise the first re-roll would "break" the tie and the remaining tied players would be stuck
        // with their old value (and no longer be considered tied).
        Integer previousRoll = p.getLobbyRoll();
        if (previousRoll != null && tied.contains(p.getId())) {
            for (Player other : players) {
                if (other.getLobbyRoll() != null && other.getLobbyRoll().equals(previousRoll)) {
                    other.setLobbyRoll(null);
                    other.setReady(false);
                }
            }
            playerRepository.saveAll(players);
        }

        int roll = random.nextInt(20) + 1;
        p.setLobbyRoll(roll);
        // Reset ready if player re-rolls (keeps flow consistent)
        p.setReady(false);
        playerRepository.save(p);

        // Log the roll for the mini event feed.
        try {
            String nm = (p.getName() == null || p.getName().isBlank()) ? "Player" : p.getName().trim();
            String ic = (p.getIcon() == null || p.getIcon().isBlank()) ? "🙂" : p.getIcon().trim();
            sessionService.publishEvent(session, "D20_ROLL", "🎲 " + ic + " " + nm + " würfelt D20: " + roll);
        } catch (Exception ignored) {}

        // Refresh rolls list and finalize turn order if possible (all rolled + no ties)
        List<Player> updated = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (updated.stream().allMatch(pl -> pl.getLobbyRoll() != null) && sessionService.computeTiedPlayerIds(updated).isEmpty()) {
            sessionService.recomputeTurnOrderFromLobbyRoll(sessionId, updated);
        }
        return roll;
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
