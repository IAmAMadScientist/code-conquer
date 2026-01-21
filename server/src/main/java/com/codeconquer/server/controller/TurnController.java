package com.codeconquer.server.controller;

import com.codeconquer.server.dto.TurnMoveResponse;
import com.codeconquer.server.service.TurnService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/turn")
public class TurnController {

    private final TurnService turnService;

    public TurnController(TurnService turnService) {
        this.turnService = turnService;
    }

    /**
     * Server-authoritative D6 roll and movement.
     */
    @PostMapping("/rollD6")
    public ResponseEntity<TurnMoveResponse> rollD6(@RequestParam String sessionId,
                                                   @RequestParam String playerId) {
        try {
            return ResponseEntity.ok(turnService.rollD6(sessionId, playerId));
        } catch (IllegalArgumentException e) {
            // Use 423 to match the app's existing "locked" UI pattern when the action isn't allowed.
            return ResponseEntity.status(423).body(new TurnMoveResponse(sessionId, playerId, null, null, null, null, null, null, null, e.getMessage()));
        }
    }

    /**
     * Continue movement after a fork stop.
     */
    @PostMapping("/choosePath")
    public ResponseEntity<TurnMoveResponse> choosePath(@RequestParam String sessionId,
                                                       @RequestParam String playerId,
                                                       @RequestParam String toNodeId) {
        try {
            return ResponseEntity.ok(turnService.choosePath(sessionId, playerId, toNodeId));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(423).body(new TurnMoveResponse(sessionId, playerId, null, null, null, null, null, null, null, e.getMessage()));
        }
    }
}
