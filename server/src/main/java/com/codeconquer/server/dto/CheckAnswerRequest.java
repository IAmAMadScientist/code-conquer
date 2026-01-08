package com.codeconquer.server.dto;

import lombok.Data;

@Data
public class CheckAnswerRequest {
    private String challengeId;
    private String guess;
}
