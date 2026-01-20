package com.codeconquer.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class LobbyState {
    private String sessionId;
    private String sessionCode;
    private boolean started;
    private int currentTurnOrder;
    private String currentPlayerId;
    private List<LobbyPlayer> players;

    // lightweight event channel for polling UIs
    private long lastEventSeq;
    private String lastEventType;
    private String lastEventMessage;
}
