package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.model.Score;
import com.codeconquer.server.repository.ScoreRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class ScoreService {

    private final ScoreRepository scoreRepository;
    private final GameSessionService sessionService;
    private final PlayerService playerService;

    public ScoreService(ScoreRepository scoreRepository,
                        GameSessionService sessionService,
                        PlayerService playerService) {
        this.scoreRepository = scoreRepository;
        this.sessionService = sessionService;
        this.playerService = playerService;
    }

    public Score saveScore(Score score) {
        if (score == null) throw new IllegalArgumentException("Score required");
        if (score.getSessionId() == null || score.getSessionId().isBlank()) throw new IllegalArgumentException("SessionId required");
        if (score.getPlayerId() == null || score.getPlayerId().isBlank()) throw new IllegalArgumentException("PlayerId required");

        GameSession s = sessionService.findById(score.getSessionId())
                .orElseThrow(() -> new IllegalArgumentException("Session not found"));

        Player p = playerService.findById(score.getPlayerId())
                .orElseThrow(() -> new IllegalArgumentException("Player not found"));

        if (p.getSessionId() == null || !p.getSessionId().equals(score.getSessionId())) {
            throw new IllegalArgumentException("Player not found for session");
        }

        // Enforce started + turn owner
        if (!s.isStarted()) throw new IllegalArgumentException("Session not started");
        if (GameSessionService.SESSION_FINISHED.equals(s.getStatus())) {
            throw new IllegalArgumentException("Session finished");
        }
        if (s.getCurrentTurnOrder() <= 0) throw new IllegalArgumentException("Session turn not initialized");
        if (p.getTurnOrder() != s.getCurrentTurnOrder()) throw new IllegalArgumentException("Not your turn");

        // Phase enforcement: must match the active challenge instance
        if (!GameSessionService.TURN_IN_CHALLENGE.equals(s.getTurnStatus())) {
            throw new IllegalArgumentException("No active challenge");
        }
        if (score.getChallengeId() == null || score.getChallengeId().isBlank()) {
            throw new IllegalArgumentException("challengeId required");
        }
        if (s.getActiveChallengeId() == null || !s.getActiveChallengeId().equals(score.getChallengeId())) {
            throw new IllegalArgumentException("challengeId mismatch");
        }

        // Denormalize player name for leaderboard/history
        score.setPlayerName(p.getName());
        score.setCreatedAt(Instant.now());

        // Phase 2D: fixed points per difficulty (easy 5 / medium 10 / hard 15).
        // To keep the backend authoritative, normalize any positive score to the fixed base.
        int expected = expectedBasePoints(score.getDifficulty());
        if (score.getPoints() > 0 && expected > 0) {
            score.setPoints(expected);
        }

        Score saved = scoreRepository.save(score);

        // Update running total score for the player (used by leaderboard).
        playerService.addToTotalScore(score.getSessionId(), score.getPlayerId(), score.getPoints());

        // Unlock challenge and advance the turn immediately.
        // Your game uses "each player on their own phone", so there is no handover confirm.
        s.setTurnStatus(GameSessionService.TURN_AWAITING_D6_ROLL);
        s.setActiveChallengeId(null);
        sessionService.save(s);

        // Advance to next player and automatically consume any skipTurns.
        sessionService.advanceTurn(score.getSessionId());
        sessionService.advanceTurnConsideringSkips(score.getSessionId());

        return saved;
    }

    public List<Score> getAllScores() {
        return scoreRepository.findAll();
    }

    public List<Score> getTopScores() {
        return scoreRepository.findTop10ByOrderByPointsDesc();
    }

    public List<Score> getTopScoresForSession(String sessionId) {
        return scoreRepository.findTop10BySessionIdOrderByPointsDesc(sessionId);
    }

    public List<Score> getScoresForSession(String sessionId) {
        return scoreRepository.findBySessionIdOrderByIdAsc(sessionId);
    }

    public List<Score> getScoresForSessionAndPlayer(String sessionId, String playerName) {
        return scoreRepository.findBySessionIdAndPlayerNameOrderByIdAsc(sessionId, playerName);
    }

    private int expectedBasePoints(String difficulty) {
        if (difficulty == null) return 0;
        String d = difficulty.trim().toUpperCase();
        return switch (d) {
            case "EASY" -> 5;
            case "MEDIUM" -> 10;
            case "HARD" -> 15;
            default -> 0;
        };
    }
}
