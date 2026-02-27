package com.codeconquer.server.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class PlayerRequest {
    @NotBlank(message = "Player name is required")
    @Size(min = 2, max = 16, message = "Player name must be between 2 and 16 characters")
    private String name;
    
    private String icon; // emoji/icon (optional)
}
