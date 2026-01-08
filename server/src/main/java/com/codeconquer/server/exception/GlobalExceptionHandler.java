package com.codeconquer.server.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ChallengeNotFoundException.class)
    public ResponseEntity<?> handleNotFound(ChallengeNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(Map.of("error", ex.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleError(Exception ex) {
        // keep generic as 400 for now
        return ResponseEntity.badRequest()
                .body(Map.of("error", ex.getMessage()));
    }
}
