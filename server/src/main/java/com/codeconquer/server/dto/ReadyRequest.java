package com.codeconquer.server.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReadyRequest {
    @NotNull(message = "Ready state is required")
    private boolean ready;
}
