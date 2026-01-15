package com.codeconquer.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PlayerResponse {
    private String playerId;
    private String name;
    private String color; // reserved
}
