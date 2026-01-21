package com.codeconquer.server.board;

import com.codeconquer.server.model.BoardNodeType;
import lombok.Data;

@Data
public class BoardNodeDef {
    private String id;
    private BoardNodeType type;
}
