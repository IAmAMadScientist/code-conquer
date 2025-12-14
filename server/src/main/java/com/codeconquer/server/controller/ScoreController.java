package com.codeconquer.server.controller;

import com.codeconquer.server.model.Score;
import com.codeconquer.server.service.ScoreService;
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
    public Score submitScore(@RequestBody Score score) {
        return scoreService.saveScore(score);
    }

    @GetMapping
    public List<Score> getAllScores() {
        return scoreService.getAllScores();
    }

    @GetMapping("/top")
    public List<Score> getTopScores() {
        return scoreService.getTopScores();
    }
}
