package com.codeconquer.server.controller;

import com.codeconquer.server.dto.PlayerRequest;
import com.codeconquer.server.dto.PlayerResponse;
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
            Player p = playerService.registerPlayer(sessionId, body.getName());
            return ResponseEntity.ok(new PlayerResponse(p.getId(), p.getName(), p.getColor()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().build();
        }
    }

    @GetMapping("/{sessionId}/players")
    public ResponseEntity<List<Player>> list(@PathVariable String sessionId) {
        if (sessionId == null || sessionId.isBlank()) return ResponseEntity.badRequest().build();
        return ResponseEntity.ok(playerService.listPlayers(sessionId));
    }
}
