package com.codeconquer.server.controller;

import com.codeconquer.server.dto.ChallengeDescriptor;
import com.codeconquer.server.model.Category;
import com.codeconquer.server.model.Difficulty;
import com.codeconquer.server.model.BoardNodeType;
import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.service.ChallengeRouterService;
import com.codeconquer.server.service.BoardGraphService;
import com.codeconquer.server.service.GameSessionService;
import com.codeconquer.server.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/challenges")
public class ChallengeController {

    private final ChallengeRouterService router;
    private final GameSessionService sessionService;
    private final PlayerService playerService;
    private final BoardGraphService boardService;

    public ChallengeController(ChallengeRouterService router, GameSessionService sessionService, PlayerService playerService, BoardGraphService boardService) {
        this.router = router;
        this.sessionService = sessionService;
        this.playerService = playerService;
        this.boardService = boardService;
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
        if (GameSessionService.SESSION_FINISHED.equals(s.getStatus())) return ResponseEntity.status(409).build();

        // Turn enforcement
        if (s.getCurrentTurnOrder() <= 0 || p.getTurnOrder() != s.getCurrentTurnOrder()) {
            return ResponseEntity.status(403).build(); // not your turn
        }

        // Phase enforcement: only one active challenge per turn
        // Be defensive: older rows could have null in turnStatus.
        String status = s.getTurnStatus();
        if (status != null && !GameSessionService.TURN_IDLE.equals(status)) {
            return ResponseEntity.status(423).build(); // locked / in challenge
        }

        // Lock the turn to a single challenge instance
        String instanceId = UUID.randomUUID().toString();
        s.setTurnStatus(GameSessionService.TURN_IN_CHALLENGE);
        s.setActiveChallengeId(instanceId);
        sessionService.save(s);

        Category exclude = null;
        try {
            if (p.getLastChallengeCategory() != null && !p.getLastChallengeCategory().isBlank()) {
                exclude = Category.valueOf(p.getLastChallengeCategory());
            }
        } catch (Exception ignored) {
            exclude = null;
        }

        ChallengeDescriptor d = router.pickRandom(difficulty, category, exclude);
        d.setChallengeInstanceId(instanceId);
        d.setBasePoints(basePointsFor(difficulty));
        // remember for "no repeat twice" rule
        p.setLastChallengeCategory(d.getCategory().name());
        playerService.save(p);
        return ResponseEntity.ok(d);
    }

    /**
     * Board-driven challenge selection (Phase 2D):
     * - Difficulty is derived from the player's current board node type.
     * - Points are fixed per difficulty (Easy 5, Medium 10, Hard 15).
     */
    @GetMapping("/forTurn")
    public ResponseEntity<ChallengeDescriptor> forTurn(
            @RequestParam String sessionId,
            @RequestParam String playerId,
            @RequestParam(required = false) Category category
    ) {
        Optional<GameSession> sOpt = sessionService.findById(sessionId);
        if (sOpt.isEmpty()) return ResponseEntity.badRequest().build();
        GameSession s = sOpt.get();

        Optional<Player> pOpt = playerService.findById(playerId);
        if (pOpt.isEmpty()) return ResponseEntity.badRequest().build();
        Player p = pOpt.get();
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) return ResponseEntity.badRequest().build();

        if (!s.isStarted()) return ResponseEntity.status(409).build();
        if (GameSessionService.SESSION_FINISHED.equals(s.getStatus())) return ResponseEntity.status(409).build();

        // Turn enforcement
        if (s.getCurrentTurnOrder() <= 0 || p.getTurnOrder() != s.getCurrentTurnOrder()) {
            return ResponseEntity.status(403).build();
        }

        // Must be in a state where a challenge can be started.
        String status = s.getTurnStatus();
        if (status != null && !GameSessionService.TURN_IDLE.equals(status)) {
            return ResponseEntity.status(423).build();
        }

        // Determine difficulty from board node type.
        String pos = p.getPositionNodeId();
        if (pos == null || pos.isBlank()) return ResponseEntity.status(409).build();
        BoardNodeType nodeType = boardService.getBoard().getType(pos);
        Difficulty diff;
        if (nodeType == BoardNodeType.EASY) diff = Difficulty.EASY;
        else if (nodeType == BoardNodeType.MEDIUM) diff = Difficulty.MEDIUM;
        else if (nodeType == BoardNodeType.HARD) diff = Difficulty.HARD;
        else if (nodeType == BoardNodeType.FORK) diff = Difficulty.MEDIUM; // Fork nodes are treated as MEDIUM challenge fields
        else return ResponseEntity.status(409).build(); // no challenge on START/JAIL/SPECIAL/FINISH

        // Special cards can downgrade the next hard challenge.
        if (diff == Difficulty.HARD && p.isNextHardBecomesEasy()) {
            p.setNextHardBecomesEasy(false);
            playerService.save(p);
            diff = Difficulty.EASY;
        } else if (diff == Difficulty.HARD && p.isNextHardBecomesMedium()) {
            p.setNextHardBecomesMedium(false);
            playerService.save(p);
            diff = Difficulty.MEDIUM;
        }

        // Lock the turn to a single challenge instance
        String instanceId = UUID.randomUUID().toString();
        s.setTurnStatus(GameSessionService.TURN_IN_CHALLENGE);
        s.setActiveChallengeId(instanceId);
        sessionService.save(s);

        Category exclude2 = null;
        try {
            if (p.getLastChallengeCategory() != null && !p.getLastChallengeCategory().isBlank()) {
                exclude2 = Category.valueOf(p.getLastChallengeCategory());
            }
        } catch (Exception ignored) {
            exclude2 = null;
        }

        ChallengeDescriptor d = router.pickRandom(diff, category, exclude2);
        d.setChallengeInstanceId(instanceId);
        d.setBasePoints(basePointsFor(diff));
        p.setLastChallengeCategory(d.getCategory().name());
        playerService.save(p);
        return ResponseEntity.ok(d);
    }

    private int basePointsFor(Difficulty difficulty) {
        if (difficulty == null) return 0;
        return switch (difficulty) {
            case EASY -> 5;
            case MEDIUM -> 10;
            case HARD -> 15;
        };
    }
}
