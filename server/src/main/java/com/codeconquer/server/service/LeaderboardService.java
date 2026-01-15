package com.codeconquer.server.service;

import com.codeconquer.server.dto.LeaderboardEntry;
import com.codeconquer.server.repository.ScoreRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LeaderboardService {

    private final ScoreRepository scoreRepository;

    public LeaderboardService(ScoreRepository scoreRepository) {
        this.scoreRepository = scoreRepository;
    }

    public List<LeaderboardEntry> getLeaderboardForSession(String sessionId) {
        return scoreRepository.getLeaderboardForSession(sessionId);
    }
}
