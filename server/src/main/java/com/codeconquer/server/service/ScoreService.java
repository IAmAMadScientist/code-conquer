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

        Score saved = scoreRepository.save(score);

        // Unlock turn and advance
        s.setTurnStatus(GameSessionService.TURN_IDLE);
        s.setActiveChallengeId(null);
        sessionService.save(s);
        sessionService.advanceTurn(score.getSessionId());

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
}
