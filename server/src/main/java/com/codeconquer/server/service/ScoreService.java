package com.codeconquer.server.service;

import com.codeconquer.server.model.Score;
import com.codeconquer.server.repository.ScoreRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ScoreService {

    private final ScoreRepository scoreRepository;

    public ScoreService(ScoreRepository scoreRepository) {
        this.scoreRepository = scoreRepository;
    }

    public Score saveScore(Score score) {
        return scoreRepository.save(score);
    }

    public List<Score> getAllScores() {
        return scoreRepository.findAll();
    }

    public List<Score> getTopScores() {
        return scoreRepository.findTop10ByOrderByPointsDesc();
    }
}
