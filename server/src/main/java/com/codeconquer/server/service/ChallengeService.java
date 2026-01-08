package com.codeconquer.server.service;

import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Challenge;
import com.codeconquer.server.model.Difficulty;
import org.springframework.stereotype.Service;

@Service
public class ChallengeService {

    private final ChallengeLoader loader;

    public ChallengeService(ChallengeLoader loader) {
        this.loader = loader;
    }

    public Challenge getRandomChallenge(Category category, Difficulty difficulty) {
        return loader.getRandom(category, difficulty);
    }

    public boolean checkAnswer(String challengeId, String guess) {
        Challenge c = loader.getByIdOrThrow(challengeId);

        String expected = normalize(c.getAnswer());
        String actual = normalize(guess);

        return expected.equals(actual);
    }

    public Challenge getChallengeById(String challengeId) {
        return loader.getByIdOrThrow(challengeId);
    }

    private String normalize(String s) {
        if (s == null) return "";
        return s.trim().replaceAll("\\s+", " ").toLowerCase();
    }
}
