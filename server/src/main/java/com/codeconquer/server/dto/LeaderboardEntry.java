package com.codeconquer.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LeaderboardEntry {
    private String playerName;
    private Long totalPoints;
    private Long attempts;
    private Double avgTimeMs;
    private Long totalErrors;
}
