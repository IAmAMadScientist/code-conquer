package com.codeconquer.server.controller;

import com.codeconquer.server.dto.PlayerRequest;
import com.codeconquer.server.dto.PlayerResponse;
import com.codeconquer.server.dto.ReadyRequest;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    @PostMapping("/{sessionId}/players")
    public ResponseEntity<PlayerResponse> register(@PathVariable String sessionId, @RequestBody PlayerRequest body) {
        if (body == null || body.getName() == null || body.getName().isBlank()) {
            return ResponseEntity.badRequest().build();
        }
        try {
            Player p = playerService.registerPlayer(sessionId, body.getName(), body.getIcon());
            return ResponseEntity.ok(new PlayerResponse(p.getId(), p.getName(), p.getIcon(), p.getColor(), p.isReady(), p.getTurnOrder()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{sessionId}/players")
    public ResponseEntity<List<Player>> list(@PathVariable String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(playerService.listPlayers(sessionId));
    }

    @PostMapping("/{sessionId}/players/{playerId}/ready")
    public ResponseEntity<PlayerResponse> setReady(@PathVariable String sessionId, @PathVariable String playerId, @RequestBody ReadyRequest body) {
        if (body == null) return ResponseEntity.badRequest().build();
        try {
            Player p = playerService.setReady(sessionId, playerId, body.isReady());
            return ResponseEntity.ok(new PlayerResponse(p.getId(), p.getName(), p.getIcon(), p.getColor(), p.isReady(), p.getTurnOrder()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Leaves a match (removes the player from the session).
     */
    @DeleteMapping("/{sessionId}/players/{playerId}")
    public ResponseEntity<Void> leave(@PathVariable String sessionId, @PathVariable String playerId) {
        try {
            playerService.removePlayer(sessionId, playerId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }
}
