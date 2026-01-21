package com.codeconquer.server.board;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class BoardGraphDefinition {
    private Map<String, Object> meta;
    private List<BoardNodeDef> nodes;
    private List<BoardEdgeDef> edges;
}
