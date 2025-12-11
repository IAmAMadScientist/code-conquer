package com.codeconquer.server.controller;

import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Challenge;
import com.codeconquer.server.model.Difficulty;
import com.codeconquer.server.service.ChallengeService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {

    private final ChallengeService challengeService;

    public ChallengeController(ChallengeService challengeService) {
        this.challengeService = challengeService;
    }

    @GetMapping("/random")
    public Challenge getRandomChallenge(
            @RequestParam Category category,
            @RequestParam Difficulty difficulty
    ) {
        return challengeService.getRandomChallenge(category, difficulty);
    }

    @GetMapping("/test")
    public String test() {
        return "Challenge API is working!";
    }
}
