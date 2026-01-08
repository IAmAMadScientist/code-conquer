package com.codeconquer.server.dto;

import lombok.Data;

@Data
public class CheckAnswerResponse {
    private boolean correct;
    private String expectedAnswer;
    private String explanation; // may be null
}
