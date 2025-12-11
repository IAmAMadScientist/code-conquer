package com.codeconquer.server.service;

import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Challenge;
import com.codeconquer.server.model.Difficulty;
import org.springframework.stereotype.Service;

import java.util.Random;

@Service
public class ChallengeService {

    private final Random random = new Random();

    public Challenge getRandomChallenge(Category category, Difficulty difficulty) {

        // Example simple generated challenge
        String question = switch (category) {
            case TRACE -> "What is the output of: int x = 2 + 3 * 2;";
            case SPOT_THE_BUG -> "Find the bug: for(int i = 0; i <= 5; i++);";
            case BINARY_BLITZ -> "Convert 13 to binary.";
            case CONCEPT_CLASH -> "Which data structure uses LIFO?";
        };

        String answer = switch (category) {
            case TRACE -> "8";
            case SPOT_THE_BUG -> "The semicolon after the for-loop prevents it from running.";
            case BINARY_BLITZ -> "1101";
            case CONCEPT_CLASH -> "Stack";
        };

        return new Challenge(
                question,
                answer,
                category,
                difficulty,
                "This is a simple auto-generated challenge."
        );
    }
}
