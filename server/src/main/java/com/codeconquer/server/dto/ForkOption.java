package com.codeconquer.server.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ForkOption {
    private String to;
    private String label;
}
