package com.codeconquer.server.controller;

import com.codeconquer.server.dto.ChallengeDescriptor;
import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Difficulty;
import com.codeconquer.server.service.ChallengeRouterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {

    private final ChallengeRouterService routerService;

    public ChallengeController(ChallengeRouterService routerService) {
        this.routerService = routerService;
    }

    /**
     * Returns a random minigame descriptor.
     *
     * Examples:
     *  - /api/challenges/random?difficulty=EASY
     *  - /api/challenges/random?difficulty=MEDIUM&category=GRAPH_PATH
     */
    @GetMapping("/random")
    public ResponseEntity<ChallengeDescriptor> random(
            @RequestParam Difficulty difficulty,
            @RequestParam(required = false) Category category
    ) {
        return ResponseEntity.ok(routerService.pickRandom(difficulty, category));
    }
}
