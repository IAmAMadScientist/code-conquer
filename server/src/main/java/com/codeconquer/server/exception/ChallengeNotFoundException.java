package com.codeconquer.server.exception;

public class ChallengeNotFoundException extends RuntimeException {
    public ChallengeNotFoundException(String message) {
        super(message);
    }
}
