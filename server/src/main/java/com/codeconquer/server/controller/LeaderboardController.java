package com.codeconquer.server.controller;

import com.codeconquer.server.dto.PlayerLeaderboardEntry;
import com.codeconquer.server.service.LeaderboardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/leaderboard")
public class LeaderboardController {

    private final LeaderboardService leaderboardService;

    public LeaderboardController(LeaderboardService leaderboardService) {
        this.leaderboardService = leaderboardService;
    }

    @GetMapping
    public ResponseEntity<List<PlayerLeaderboardEntry>> getLeaderboard(@RequestParam String sessionId) {
        if (sessionId == null || sessionId.isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        return ResponseEntity.ok(leaderboardService.getLeaderboardForSession(sessionId));
    }
}
