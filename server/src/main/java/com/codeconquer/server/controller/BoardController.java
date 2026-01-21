package com.codeconquer.server.controller;

import com.codeconquer.server.board.BoardGraphDefinition;
import com.codeconquer.server.service.BoardGraphService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class BoardController {

    private final BoardGraphService boardGraphService;

    public BoardController(BoardGraphService boardGraphService) {
        this.boardGraphService = boardGraphService;
    }

    @GetMapping("/board")
    public ResponseEntity<Map<String, Object>> getBoard() {
        BoardGraphDefinition def = boardGraphService.getBoard().getDefinition();
        return ResponseEntity.ok(Map.of(
                "startNodeId", boardGraphService.getStartNodeId(),
                "finishNodeId", boardGraphService.getFinishNodeId(),
                "jailNodeId", boardGraphService.getJailNodeId(),
                "meta", def.getMeta(),
                "nodes", def.getNodes(),
                "edges", def.getEdges()
        ));
    }
}
