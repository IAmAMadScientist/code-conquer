package com.codeconquer.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

import com.codeconquer.server.dto.ForkOption;

@Data
@AllArgsConstructor
public class TurnMoveResponse {
    private String sessionId;
    private String playerId;

    private Integer diceRoll;

    private String positionNodeId;
    private String positionType;

    private String turnStatus;

    // Fork state (only when turnStatus == AWAITING_PATH_CHOICE)
    private String forkNodeId;
    private Integer remainingSteps;
    private List<ForkOption> options;

    // Human readable info (optional)
    private String message;
}
