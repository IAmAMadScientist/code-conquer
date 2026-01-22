package com.codeconquer.server.controller;

import com.codeconquer.server.dto.LobbyPlayer;
import com.codeconquer.server.dto.LobbyState;
import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.service.GameSessionService;
import com.codeconquer.server.service.BoardGraphService;
import com.codeconquer.server.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@RestController
@RequestMapping("/api/sessions")
public class LobbyController {

    private final GameSessionService sessionService;
    private final PlayerService playerService;
    private final BoardGraphService boardGraphService;

    public LobbyController(GameSessionService sessionService, PlayerService playerService, BoardGraphService boardGraphService) {
        this.sessionService = sessionService;
        this.playerService = playerService;
        this.boardGraphService = boardGraphService;
    }

    @GetMapping("/{sessionId}/lobby")
    public ResponseEntity<LobbyState> lobby(@PathVariable String sessionId) {
        Optional<GameSession> opt = sessionService.findById(sessionId);
        if (opt.isEmpty()) return ResponseEntity.notFound().build();

        GameSession s = opt.get();
        List<Player> players = playerService.listPlayers(sessionId);
        players.sort(Comparator.comparingInt(Player::getTurnOrder));

        // Compute ties for lobbyRoll display/controls
        List<String> tiedIds = sessionService.computeTiedPlayerIds(players);

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
                .map(p -> new LobbyPlayer(
                        p.getId(),
                        p.getName(),
                        p.getIcon(),
                        p.isReady(),
                        p.getTurnOrder(),
                        p.getLobbyRoll(),
                        tiedIds.contains(p.getId()),
                        p.getPositionNodeId(),
                        p.getPositionNodeId() == null ? null : boardGraphService.getBoard().getType(p.getPositionNodeId()).name()
                ))
                .toList();

        // If we're waiting at a fork, expose the available outgoing options so the UI can render buttons even after refresh.
        List<com.codeconquer.server.dto.ForkOption> pendingForkOptions = List.of();
        if (GameSessionService.TURN_AWAITING_PATH_CHOICE.equals(s.getTurnStatus()) && s.getPendingForkNodeId() != null) {
            try {
                pendingForkOptions = boardGraphService.getForkOptions(s.getPendingForkNodeId());
            } catch (Exception ignored) {
                pendingForkOptions = List.of();
            }
        }

        return ResponseEntity.ok(new LobbyState(
                s.getId(),
                s.getCode(),
                s.getStatus(),
                s.getWinnerPlayerId(),
                s.isStarted(),
                s.isTurnOrderLocked(),
                s.getCurrentTurnOrder(),
                currentPlayerId,
                s.getTurnStatus(),
                s.getLastDiceRoll(),
                s.getPendingForkNodeId(),
                s.getPendingRemainingSteps(),
                pendingForkOptions,
                lobbyPlayers,
                s.getLastEventSeq(),
                s.getLastEventType(),
                s.getLastEventMessage()
        ));
    }

    @PostMapping("/{sessionId}/lobby/roll")
    public ResponseEntity<Map<String, Object>> rollLobby(@PathVariable String sessionId, @RequestParam String playerId) {
        try {
            int roll = playerService.rollLobbyD20(sessionId, playerId);
            return ResponseEntity.ok(Map.of("roll", roll));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(423).body(Map.of("message", ex.getMessage()));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }
}
