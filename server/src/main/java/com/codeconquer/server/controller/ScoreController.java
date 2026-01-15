package com.codeconquer.server.controller;

import com.codeconquer.server.model.Score;
import com.codeconquer.server.service.ScoreService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/scores")
public class ScoreController {

    private final ScoreService scoreService;

    public ScoreController(ScoreService scoreService) {
        this.scoreService = scoreService;
    }

    @PostMapping
    public ResponseEntity<Score> submitScore(@RequestBody Score score) {
        if (score.getSessionId() == null || score.getSessionId().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        if (score.getPlayerId() == null || score.getPlayerId().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        // Ignore any client-provided playerName; it will be set server-side from playerId.
        score.setPlayerName(null);
        return ResponseEntity.ok(scoreService.saveScore(score));
    }

    /**
     * Optional filters:
     *  - sessionId: return only scores from that match
     *  - playerName: (requires sessionId) return only that player's scores
     */
    @GetMapping
    public List<Score> getScores(@RequestParam(required = false) String sessionId,
                                 @RequestParam(required = false) String playerName) {

        if (sessionId != null && !sessionId.isBlank()) {
            if (playerName != null && !playerName.isBlank()) {
                return scoreService.getScoresForSessionAndPlayer(sessionId, playerName);
            }
            return scoreService.getScoresForSession(sessionId);
        }

        return scoreService.getAllScores();
    }

    @GetMapping("/top")
    public List<Score> getTopScores(@RequestParam(required = false) String sessionId) {
        if (sessionId != null && !sessionId.isBlank()) {
            return scoreService.getTopScoresForSession(sessionId);
        }
        return scoreService.getTopScores();
    }
}
