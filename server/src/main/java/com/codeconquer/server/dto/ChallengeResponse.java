package com.codeconquer.server.dto;

import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Difficulty;
import lombok.Data;

@Data
public class ChallengeResponse {
    private String question;
    private Category category;
    private Difficulty difficulty;
    private String explanation; // Optional
}
