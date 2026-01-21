package com.codeconquer.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class LobbyState {
    private String sessionId;
    private String sessionCode;
    private String sessionStatus;
    private String winnerPlayerId;
    private boolean started;
    private boolean turnOrderLocked;
    private int currentTurnOrder;
    private String currentPlayerId;
    private String turnStatus;
    private Integer lastDiceRoll;
    private String pendingForkNodeId;
    private Integer pendingRemainingSteps;
    private List<String> pendingForkOptions;
    private List<LobbyPlayer> players;

    // lightweight event channel for polling UIs
    private long lastEventSeq;
    private String lastEventType;
    private String lastEventMessage;
}
