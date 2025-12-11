package com.codeconquer.server.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Challenge {
    private String question;
    private String answer;
    private Category category;
    private Difficulty difficulty;
    private String explanation; // optional
}
