package com.codeconquer.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LobbyPlayer {
    private String id;
    private String name;
    private String icon;
    private boolean ready;
    private int turnOrder;
    private Integer lobbyRoll;
    private boolean tied;
}
