package com.codeconquer.server.controller;

import com.codeconquer.server.dto.LobbyPlayer;
import com.codeconquer.server.dto.LobbyState;
import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.service.GameSessionService;
import com.codeconquer.server.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/sessions")
public class LobbyController {

    private final GameSessionService sessionService;
    private final PlayerService playerService;

    public LobbyController(GameSessionService sessionService, PlayerService playerService) {
        this.sessionService = sessionService;
        this.playerService = playerService;
    }

    @GetMapping("/{sessionId}/lobby")
    public ResponseEntity<LobbyState> lobby(@PathVariable String sessionId) {
        Optional<GameSession> opt = sessionService.findById(sessionId);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        GameSession s = opt.get();
        List<Player> players = playerService.listPlayers(sessionId);
        players.sort(Comparator.comparingInt(Player::getTurnOrder));

        String currentPlayerId = null;
        if (s.isStarted() && s.getCurrentTurnOrder() > 0) {
            for (Player p : players) {
                if (p.getTurnOrder() == s.getCurrentTurnOrder()) {
                    currentPlayerId = p.getId();
                    break;
                }
            }
        }

        List<LobbyPlayer> lobbyPlayers = players.stream()
                .map(p -> new LobbyPlayer(p.getId(), p.getName(), p.getIcon(), p.isReady(), p.getTurnOrder()))
                .toList();

        return ResponseEntity.ok(new LobbyState(
                s.getId(),
                s.getCode(),
                s.isStarted(),
                s.getCurrentTurnOrder(),
                currentPlayerId,
                lobbyPlayers,
                s.getLastEventSeq(),
                s.getLastEventType(),
                s.getLastEventMessage()
        ));
    }
}
