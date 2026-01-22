package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.GameEvent;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.GameSessionRepository;
import com.codeconquer.server.repository.GameEventRepository;
import com.codeconquer.server.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GameSessionService {

    public static final String SESSION_LOBBY = "LOBBY";
    public static final String SESSION_IN_PROGRESS = "IN_PROGRESS";
    public static final String SESSION_FINISHED = "FINISHED";

    public static final String TURN_IDLE = "IDLE";
    public static final String TURN_IN_CHALLENGE = "IN_CHALLENGE";
    public static final String TURN_AWAITING_CONFIRM = "AWAITING_CONFIRM";
    public static final String TURN_AWAITING_D6_ROLL = "AWAITING_D6_ROLL";
    public static final String TURN_AWAITING_PATH_CHOICE = "AWAITING_PATH_CHOICE";

    private final GameSessionRepository sessionRepository;
    private final PlayerRepository playerRepository;
    private final GameEventRepository gameEventRepository;
    private final Random random = new Random();

    public GameSessionService(GameSessionRepository sessionRepository,
                              PlayerRepository playerRepository,
                              GameEventRepository gameEventRepository) {
        this.sessionRepository = sessionRepository;
        this.playerRepository = playerRepository;
        this.gameEventRepository = gameEventRepository;
    }

    public GameSession createNew() {
        GameSession s = new GameSession();
        s.setId(UUID.randomUUID().toString());
        s.setCode(generateUniqueCode());
        s.setCreatedAt(Instant.now());
        s.setStarted(false);
        s.setStatus(SESSION_LOBBY);
        s.setWinnerPlayerId(null);
        s.setTurnOrderLocked(false);
        s.setCurrentTurnOrder(0);
        s.setTurnStatus(TURN_IDLE);
        s.setActiveChallengeId(null);
        s.setLastDiceRoll(null);
        s.setPendingForkNodeId(null);
        s.setPendingRemainingSteps(null);
        s.setLastEventSeq(0);
        s.setLastEventType(null);
        s.setLastEventMessage(null);
        s.setLastEventAt(null);
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

        // Preserve the established order. In the lobby (before rolls are finalized)
        // turnOrder is assigned incrementally; once rolls are applied, turnOrder is the
        // authoritative sequence for the rest of the match.
        players.sort(Comparator.comparingInt(Player::getTurnOrder));
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
        if (SESSION_FINISHED.equals(s.getStatus())) return;
        if (s.isStarted()) return;

        List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (players.isEmpty()) return;

        // Lobby D20 requirement: everyone must have rolled, and there must be no ties.
        boolean allReady = players.stream().allMatch(Player::isReady);
        if (!allReady) return;

        if (!allHaveLobbyRoll(players)) return;
        if (!computeTiedPlayerIds(players).isEmpty()) return;

        // Finalize initial turn order from lobby rolls before starting.
        recomputeTurnOrderFromLobbyRoll(sessionId, players);

        s.setStarted(true);
        s.setStatus(SESSION_IN_PROGRESS);
        s.setTurnOrderLocked(true);
        s.setCurrentTurnOrder(1);
        s.setTurnStatus(TURN_AWAITING_D6_ROLL);
        s.setActiveChallengeId(null);
        s.setLastDiceRoll(null);
        s.setPendingForkNodeId(null);
        s.setPendingRemainingSteps(null);
        save(s);

        // If the first player is supposed to skip (e.g. jailed), handle it immediately.
        advanceTurnConsideringSkips(sessionId);
        // Announce whose turn it is (after auto-skips).
        announceCurrentTurn(sessionId);
    }

    private boolean allHaveLobbyRoll(List<Player> players) {
        return players.stream().allMatch(p -> p.getLobbyRoll() != null);
    }

    /**
     * Returns the set of player IDs that are currently in a lobby-roll tie.
     * Only non-null rolls are considered.
     */
    public List<String> computeTiedPlayerIds(List<Player> players) {
        Map<Integer, List<Player>> byRoll = new HashMap<>();
        for (Player p : players) {
            if (p.getLobbyRoll() == null) continue;
            byRoll.computeIfAbsent(p.getLobbyRoll(), k -> new ArrayList<>()).add(p);
        }
        List<String> tied = new ArrayList<>();
        for (Map.Entry<Integer, List<Player>> e : byRoll.entrySet()) {
            if (e.getValue().size() > 1) {
                tied.addAll(e.getValue().stream().map(Player::getId).toList());
            }
        }
        return tied;
    }

    /**
     * Finalizes (or refreshes) player.turnOrder based on lobbyRoll descending.
     * Only safe to call when everyone has rolled and there are no ties.
     */
    public void recomputeTurnOrderFromLobbyRoll(String sessionId, List<Player> players) {
        if (players == null) {
            players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        }
        if (players.isEmpty()) return;

        // Sort by roll descending. As a safety net, break ties by createdAt/id,
        // but callers should ensure no ties remain.
        List<Player> sorted = new ArrayList<>(players);
        sorted.sort(
                Comparator
                        .comparing(Player::getLobbyRoll, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(Player::getCreatedAt, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(Player::getId)
        );

        boolean changed = false;
        int i = 1;
        for (Player p : sorted) {
            if (p.getTurnOrder() != i) {
                p.setTurnOrder(i);
                changed = true;
            }
            i++;
        }
        if (changed) playerRepository.saveAll(sorted);
    }

    /**
     * Advances to the next player in sequential turn order.
     * Uses the actual list of players rather than numeric +1 with gaps.
     */
    public void advanceTurn(String sessionId) {
        Optional<GameSession> opt = findById(sessionId);
        if (opt.isEmpty()) return;

        GameSession s = opt.get();
        if (SESSION_FINISHED.equals(s.getStatus())) return;
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
        s.setTurnStatus(TURN_AWAITING_D6_ROLL);
        s.setActiveChallengeId(null);
        s.setLastDiceRoll(null);
        s.setPendingForkNodeId(null);
        s.setPendingRemainingSteps(null);
        save(s);

        advanceTurnConsideringSkips(sessionId);
        announceCurrentTurn(sessionId);
    }

    /**
     * If the current player has pending skipTurns, automatically skip them and advance.
     * This keeps the game moving without needing an action from the skipped player.
     */
    public void advanceTurnConsideringSkips(String sessionId) {
        Optional<GameSession> opt = findById(sessionId);
        if (opt.isEmpty()) return;

        GameSession s = opt.get();
        if (SESSION_FINISHED.equals(s.getStatus())) return;
        if (!s.isStarted()) return;

        normalizeTurnOrders(sessionId);
        List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (players.isEmpty()) return;

        // Index by turnOrder for quick lookup.
        Map<Integer, Player> byOrder = players.stream().collect(Collectors.toMap(Player::getTurnOrder, p -> p, (a, b) -> a));
        int n = players.size();
        int safety = n;

        boolean skippedAny = false;

        while (safety-- > 0) {
            int curOrder = s.getCurrentTurnOrder();
            if (curOrder < 1 || curOrder > n) curOrder = 1;
            Player cur = byOrder.get(curOrder);
            if (cur == null) break;

            if (cur.getSkipTurns() > 0) {
                skippedAny = true;
                // If the player was teleported to JAIL as a penalty, return them to their original node
                // after the skipped turn is consumed.
                if (cur.getJailReturnNodeId() != null && !cur.getJailReturnNodeId().isBlank()) {
                    cur.setPositionNodeId(cur.getJailReturnNodeId());
                    cur.setJailReturnNodeId(null);
                }
                cur.setSkipTurns(cur.getSkipTurns() - 1);
                playerRepository.save(cur);
                publishEvent(s, "TURN_SKIPPED", (cur.getIcon() == null || cur.getIcon().isBlank() ? "🙂" : cur.getIcon()) + " " + (cur.getName() == null || cur.getName().isBlank() ? "Player" : cur.getName()) + " setzt aus.");

                int next = curOrder + 1;
                if (next > n) next = 1;
                s.setCurrentTurnOrder(next);
                s.setTurnStatus(TURN_AWAITING_D6_ROLL);
                s.setActiveChallengeId(null);
                s.setLastDiceRoll(null);
                s.setPendingForkNodeId(null);
                s.setPendingRemainingSteps(null);
                save(s);
                continue;
            }

            // Current player is active and not skipping.
            if (!TURN_AWAITING_D6_ROLL.equals(s.getTurnStatus())
                    && !TURN_AWAITING_PATH_CHOICE.equals(s.getTurnStatus())
                    && !TURN_IN_CHALLENGE.equals(s.getTurnStatus())
                    && !TURN_AWAITING_CONFIRM.equals(s.getTurnStatus())
                    && !TURN_IDLE.equals(s.getTurnStatus())) {
                s.setTurnStatus(TURN_AWAITING_D6_ROLL);
                save(s);
            }
            break;
        }

        if (skippedAny) {
            // After automatically skipping players, announce who is up next.
            announceCurrentTurn(sessionId);
        }
    }

    /**
     * Publishes a lightweight "next turn" event so all clients can show it in the event feed.
     */
    public void announceCurrentTurn(String sessionId) {
        Optional<GameSession> opt = findById(sessionId);
        if (opt.isEmpty()) return;
        GameSession s = opt.get();
        if (!s.isStarted()) return;
        if (SESSION_FINISHED.equals(s.getStatus())) return;

        normalizeTurnOrders(sessionId);
        List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
        if (players.isEmpty()) return;
        Player current = players.stream().filter(p -> p.getTurnOrder() == s.getCurrentTurnOrder()).findFirst().orElse(null);
        if (current == null) return;

        String nm = (current.getName() == null || current.getName().isBlank()) ? "Player" : current.getName().trim();
        String ic = (current.getIcon() == null || current.getIcon().isBlank()) ? "🙂" : current.getIcon().trim();
        publishEvent(s, "TURN_NEXT", "Nächster Zug: " + ic + " " + nm);
    }

    /**
     * Remove a player and keep turn state consistent.
     *
     * If the leaving player was currently up, we unlock any in-progress phase and
     * advance to the next available player.
     */
    public void handlePlayerLeft(String sessionId, int leavingTurnOrder, String leavingName, String leavingIcon) {
        Optional<GameSession> opt = findById(sessionId);
        if (opt.isEmpty()) return;

        GameSession s = opt.get();
        if (SESSION_FINISHED.equals(s.getStatus())) {
            publishEvent(s, "PLAYER_LEFT", formatLeftMessage(leavingName, leavingIcon));
            return;
        }
        if (!s.isStarted()) {
            // Lobby phase: just keep orders clean.
            normalizeTurnOrders(sessionId);
            publishEvent(s, "PLAYER_LEFT", formatLeftMessage(leavingName, leavingIcon));
            return;
        }

        normalizeTurnOrders(sessionId);

        if (leavingTurnOrder > 0 && leavingTurnOrder == s.getCurrentTurnOrder()) {
            // Current player left mid-turn: unlock and move on.
            s.setTurnStatus(TURN_AWAITING_D6_ROLL);
            s.setActiveChallengeId(null);
            s.setLastDiceRoll(null);
            s.setPendingForkNodeId(null);
            s.setPendingRemainingSteps(null);
            publishEvent(s, "PLAYER_LEFT", formatLeftMessage(leavingName, leavingIcon));
            advanceTurn(sessionId);
        } else {
            // Not current: ensure currentTurnOrder still maps into 1..n after normalization.
            List<Player> players = playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId);
            int n = players.size();
            if (n <= 0) return;
            int cur = s.getCurrentTurnOrder();
            if (cur < 1 || cur > n) {
                s.setCurrentTurnOrder(1);
                publishEvent(s, "PLAYER_LEFT", formatLeftMessage(leavingName, leavingIcon));
            } else {
                publishEvent(s, "PLAYER_LEFT", formatLeftMessage(leavingName, leavingIcon));
            }
        }
    }

    public void publishEvent(GameSession s, String type, String message) {
        if (s == null) return;
        long newSeq = s.getLastEventSeq() + 1;
        s.setLastEventSeq(newSeq);
        s.setLastEventType(type);
        s.setLastEventMessage(message);
        s.setLastEventAt(Instant.now());
        save(s);

        // Persist to the session event log for polling clients.
        try {
            GameEvent evt = new GameEvent(s.getId(), newSeq, type, message, s.getLastEventAt());
            gameEventRepository.save(evt);
        } catch (Exception ignored) {
            // Event feed is non-critical; never break core game flow if logging fails.
        }
    }

    private String formatLeftMessage(String name, String icon) {
        String nm = (name == null || name.isBlank()) ? "Player" : name.trim();
        String ic = (icon == null || icon.isBlank()) ? "🙂" : icon.trim();
        return ic + " " + nm + " hat verlassen.";
    }

    /**
     * Confirms the end-of-turn handover after a score has been saved.
     * Only the current player may confirm.
     */
    public void confirmTurnHandover(String sessionId, String playerId) {
        if (sessionId == null || sessionId.isBlank()) throw new IllegalArgumentException("sessionId required");
        if (playerId == null || playerId.isBlank()) throw new IllegalArgumentException("playerId required");

        GameSession s = findById(sessionId).orElseThrow(() -> new IllegalArgumentException("Session not found"));
        if (SESSION_FINISHED.equals(s.getStatus())) throw new IllegalArgumentException("Session finished");
        if (!s.isStarted()) throw new IllegalArgumentException("Session not started");
        if (!TURN_AWAITING_CONFIRM.equals(s.getTurnStatus())) throw new IllegalArgumentException("No handover pending");

        normalizeTurnOrders(sessionId);
        Player p = playerRepository.findById(playerId).orElseThrow(() -> new IllegalArgumentException("Player not found"));
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) {
            throw new IllegalArgumentException("Player not found for session");
        }
        if (p.getTurnOrder() != s.getCurrentTurnOrder()) throw new IllegalArgumentException("Not your turn");

        // Advance to next player and reset phase.
        advanceTurn(sessionId);
    }

    /**
     * Marks the session as finished and records the winner.
     * Further turn/challenge actions should be blocked once finished.
     */
    public void finishSession(String sessionId, String winnerPlayerId, String winnerName, String winnerIcon) {
        if (sessionId == null || sessionId.isBlank()) throw new IllegalArgumentException("sessionId required");
        GameSession s = findById(sessionId).orElseThrow(() -> new IllegalArgumentException("Session not found"));
        if (SESSION_FINISHED.equals(s.getStatus())) return;

        s.setStatus(SESSION_FINISHED);
        s.setWinnerPlayerId(winnerPlayerId);
        s.setTurnStatus(TURN_IDLE);
        s.setActiveChallengeId(null);
        s.setPendingForkNodeId(null);
        s.setPendingRemainingSteps(null);
        s.setLastDiceRoll(null);

        String nm = (winnerName == null || winnerName.isBlank()) ? "Player" : winnerName.trim();
        String ic = (winnerIcon == null || winnerIcon.isBlank()) ? "🏁" : winnerIcon.trim();
        publishEvent(s, "GAME_FINISHED", ic + " " + nm + " hat das Spiel gewonnen! 🏁");
        save(s);
    }

    /**
     * Marks a session as finished and sets the winner.
     * The game remains readable (leaderboard etc.), but no further turns/actions are allowed.
     */
    public void finishSession(String sessionId, String winnerPlayerId) {
        if (sessionId == null || sessionId.isBlank()) throw new IllegalArgumentException("sessionId required");
        if (winnerPlayerId == null || winnerPlayerId.isBlank()) throw new IllegalArgumentException("winnerPlayerId required");

        GameSession s = findById(sessionId).orElseThrow(() -> new IllegalArgumentException("Session not found"));
        if (SESSION_FINISHED.equals(s.getStatus())) return;

        s.setStatus(SESSION_FINISHED);
        s.setWinnerPlayerId(winnerPlayerId);
        s.setTurnStatus(TURN_IDLE);
        s.setActiveChallengeId(null);
        s.setPendingForkNodeId(null);
        s.setPendingRemainingSteps(null);
        s.setLastDiceRoll(null);

        // Publish a friendly win message.
        Player winner = playerRepository.findById(winnerPlayerId).orElse(null);
        String icon = winner == null ? "🏁" : (winner.getIcon() == null || winner.getIcon().isBlank() ? "🙂" : winner.getIcon());
        String name = winner == null ? "Player" : (winner.getName() == null || winner.getName().isBlank() ? "Player" : winner.getName());
        publishEvent(s, "GAME_FINISHED", "🏁 " + icon + " " + name + " hat gewonnen!");
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
