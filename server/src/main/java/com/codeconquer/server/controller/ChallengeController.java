package com.codeconquer.server.controller;

import com.codeconquer.server.dto.ChallengeDescriptor;
import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Difficulty;
import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.service.ChallengeRouterService;
import com.codeconquer.server.service.GameSessionService;
import com.codeconquer.server.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {

    private final ChallengeRouterService router;
    private final GameSessionService sessionService;
    private final PlayerService playerService;

    public ChallengeController(ChallengeRouterService router, GameSessionService sessionService, PlayerService playerService) {
        this.router = router;
        this.sessionService = sessionService;
        this.playerService = playerService;
    }

    @GetMapping("/random")
    public ResponseEntity<ChallengeDescriptor> random(
            @RequestParam Difficulty difficulty,
            @RequestParam(required = false) Category category,
            @RequestParam String sessionId,
            @RequestParam String playerId
    ) {
        Optional<GameSession> sOpt = sessionService.findById(sessionId);
        if (sOpt.isEmpty()) return ResponseEntity.badRequest().build();
        GameSession s = sOpt.get();

        Optional<Player> pOpt = playerService.findById(playerId);
        if (pOpt.isEmpty()) return ResponseEntity.badRequest().build();
        Player p = pOpt.get();
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) return ResponseEntity.badRequest().build();

        if (!s.isStarted()) return ResponseEntity.status(409).build(); // game not started
        if (s.getCurrentTurnOrder() <= 0 || p.getTurnOrder() != s.getCurrentTurnOrder()) {
            return ResponseEntity.status(403).build(); // not your turn
        }

        return ResponseEntity.ok(router.pickRandom(difficulty, category));
    }
}
