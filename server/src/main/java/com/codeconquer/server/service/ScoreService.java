package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
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

    public ScoreService(ScoreRepository scoreRepository, GameSessionService sessionService) {
        this.scoreRepository = scoreRepository;
        this.sessionService = sessionService;
    }

    public Score saveScore(Score score) {
        if (score.getCreatedAt() == null) {
            score.setCreatedAt(Instant.now());
        }

        // Fill sessionCode if only sessionId provided (nice for debugging / exports)
        if (score.getSessionId() != null && (score.getSessionCode() == null || score.getSessionCode().isBlank())) {
            Optional<GameSession> s = sessionService.findById(score.getSessionId());
            s.ifPresent(sess -> score.setSessionCode(sess.getCode()));
        }

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
