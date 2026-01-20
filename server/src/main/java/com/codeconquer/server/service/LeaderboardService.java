package com.codeconquer.server.service;

import com.codeconquer.server.dto.PlayerLeaderboardEntry;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LeaderboardService {

    private final PlayerRepository playerRepository;

    public LeaderboardService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    /**
     * Leaderboard is based on each player's running total score within the session.
     */
    public List<PlayerLeaderboardEntry> getLeaderboardForSession(String sessionId) {
        List<Player> players = playerRepository.findBySessionIdOrderByTotalScoreDescCreatedAtAsc(sessionId);
        return players.stream()
                .map(p -> new PlayerLeaderboardEntry(p.getId(), p.getName(), p.getIcon(), p.getTotalScore()))
                .toList();
    }
}
