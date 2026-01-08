package com.codeconquer.server.controller;

import com.codeconquer.server.dto.ChallengeResponse;
import com.codeconquer.server.dto.CheckAnswerRequest;
import com.codeconquer.server.dto.CheckAnswerResponse;
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

    // ✅ Returns public data only (no answer, no explanation)
    @GetMapping("/random")
    public ChallengeResponse getRandomChallenge(
            @RequestParam Category category,
            @RequestParam Difficulty difficulty
    ) {
        Challenge c = challengeService.getRandomChallenge(category, difficulty);

        ChallengeResponse dto = new ChallengeResponse();
        dto.setId(c.getId());
        dto.setQuestion(c.getQuestion());
        dto.setCategory(c.getCategory());
        dto.setDifficulty(c.getDifficulty());

        return dto;
    }

    // ✅ Check answer endpoint
    @PostMapping("/check")
    public CheckAnswerResponse checkAnswer(@RequestBody CheckAnswerRequest req) {
        boolean correct = challengeService.checkAnswer(req.getChallengeId(), req.getGuess());

        // reveal answer + explanation only now
        Challenge c = challengeService.getChallengeById(req.getChallengeId());

        CheckAnswerResponse res = new CheckAnswerResponse();
        res.setCorrect(correct);
        res.setExpectedAnswer(c.getAnswer());
        res.setExplanation(c.getExplanation());

        return res;
    }

    @GetMapping("/test")
    public String test() {
        return "Challenge API is working!";
    }
}
