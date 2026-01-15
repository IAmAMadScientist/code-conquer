package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.model.Score;
import com.codeconquer.server.repository.ScoreRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

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
        if (score == null) {
            throw new IllegalArgumentException("Score required");
        }
        if (score.getSessionId() == null || score.getSessionId().isBlank()) {
            throw new IllegalArgumentException("SessionId required");
        }
        if (score.getPlayerId() == null || score.getPlayerId().isBlank()) {
            throw new IllegalArgumentException("PlayerId required");
        }

        Optional<GameSession> sessionOpt = sessionService.findById(score.getSessionId());
        if (sessionOpt.isEmpty()) {
            throw new IllegalArgumentException("Session not found");
        }

        Optional<Player> playerOpt = playerService.findById(score.getPlayerId());
        if (playerOpt.isEmpty()) {
            throw new IllegalArgumentException("Player not found");
        }
        Player p = playerOpt.get();
        if (p.getSessionId() == null || !p.getSessionId().equals(score.getSessionId())) {
            throw new IllegalArgumentException("Player not found for session");
        }

        // Denormalize player name so leaderboard stays simple & consistent.
        score.setPlayerName(p.getName());

        // Timestamp if missing
        score.setCreatedAt(Instant.now());

        return scoreRepository.save(score);
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
