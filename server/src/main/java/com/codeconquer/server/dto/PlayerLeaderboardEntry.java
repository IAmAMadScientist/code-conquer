package com.codeconquer.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PlayerLeaderboardEntry {
    private String playerId;
    private String playerName;
    private String icon;
    private int totalScore;
}
