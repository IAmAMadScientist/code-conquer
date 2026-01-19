package com.codeconquer.server.dto;

import lombok.Data;

@Data
public class PlayerRequest {
    private String name;
    private String icon; // emoji/icon (optional)
}
