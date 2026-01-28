package com.codeconquer.server.controller;

import com.codeconquer.server.board.BoardGraph;
import com.codeconquer.server.model.BoardNodeType;
import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.model.SpecialCardType;
import com.codeconquer.server.repository.GameSessionRepository;
import com.codeconquer.server.repository.PlayerRepository;
import com.codeconquer.server.service.BoardGraphService;
import com.codeconquer.server.service.GameSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/special")
public class SpecialCardController {

    private final GameSessionService sessionService;
    private final BoardGraphService boardService;
    private final PlayerRepository playerRepository;
    private final GameSessionRepository sessionRepository;

    public SpecialCardController(GameSessionService sessionService,
                                 BoardGraphService boardService,
                                 PlayerRepository playerRepository,
                                 GameSessionRepository sessionRepository) {
        this.sessionService = sessionService;
        this.boardService = boardService;
        this.playerRepository = playerRepository;
        this.sessionRepository = sessionRepository;
    }

    /**
     * Apply a special-card effect after a player landed on a SPECIAL node.
     * Cards are drawn in real life; in-app selection is just for deterministic resolution.
     */
    @PostMapping("/apply")
    public ResponseEntity<?> apply(
            @RequestParam String sessionId,
            @RequestParam String playerId,
            @RequestParam SpecialCardType card,
            @RequestParam(required = false) String targetPlayerId,
            // Only used for BOOST on fork nodes (player chooses the outgoing edge)
            @RequestParam(required = false) String boostToNodeId
    ) {
        Optional<GameSession> sOpt = sessionService.findById(sessionId);
        if (sOpt.isEmpty()) return ResponseEntity.badRequest().build();
        GameSession s = sOpt.get();

        Optional<Player> pOpt = playerRepository.findById(playerId);
        if (pOpt.isEmpty()) return ResponseEntity.badRequest().build();
        Player p = pOpt.get();
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) return ResponseEntity.badRequest().build();

        if (!s.isStarted()) return ResponseEntity.status(409).build();
        if (GameSessionService.SESSION_FINISHED.equals(s.getStatus())) return ResponseEntity.status(409).build();

        // Must be current player's turn.
        if (s.getCurrentTurnOrder() <= 0 || p.getTurnOrder() != s.getCurrentTurnOrder()) {
            return ResponseEntity.status(403).build();
        }

        // Must be waiting for special card.
        if (!GameSessionService.TURN_AWAITING_SPECIAL_CARD.equals(s.getTurnStatus())) {
            return ResponseEntity.status(423).build();
        }

        // Resolve "ignore next positive" mechanic.
        if (card.isPositive() && p.isIgnoreNextPositiveSpecial()) {
            p.setIgnoreNextPositiveSpecial(false);
            playerRepository.save(p);
            sessionService.publishEvent(s, "SPECIAL_IGNORED", "🚫🃏 " + fmt(p) + " – positive Special-Karte wurde ignoriert.");
            // Turn ends anyway.
            s.setTurnStatus(GameSessionService.TURN_AWAITING_D6_ROLL);
            sessionRepository.save(s);
            sessionService.advanceTurn(sessionId);
            return ResponseEntity.ok().body(java.util.Map.of("ok", true, "ignored", true));
        }

        // Apply effect.
        switch (card) {
            case PERMISSION_DENIED -> {
                Player t = requireTarget(sessionId, targetPlayerId);
                t.setIgnoreNextPositiveSpecial(true);
                playerRepository.save(t);
                sessionService.publishEvent(s, "SPECIAL", "⛔🃏 " + fmt(p) + " spielt Permission denied auf " + fmt(t) + ".");
            }
            case RAGE_BAIT -> {
                Player t = requireTarget(sessionId, targetPlayerId);
                String aPos = p.getPositionNodeId();
                String bPos = t.getPositionNodeId();
                p.setPositionNodeId(bPos);
                t.setPositionNodeId(aPos);
                playerRepository.save(p);
                playerRepository.save(t);
                sessionService.publishEvent(s, "SPECIAL", "🔁🃏 " + fmt(p) + " tauscht Position mit " + fmt(t) + ".");
            }
            case REFACTOR -> {
                p.setNextHardBecomesMedium(true);
                playerRepository.save(p);
                sessionService.publishEvent(s, "SPECIAL", "🛠️🃏 " + fmt(p) + " aktiviert Refactor (nächste HARD wird MEDIUM).");
            }
            case SECOND_CHANCE -> {
                p.setNextDiceAdvantage(true);
                playerRepository.save(p);
                sessionService.publishEvent(s, "SPECIAL", "🎲🃏 " + fmt(p) + " aktiviert Second Chance (nächster Wurf zweimal, höher zählt).");
            }
            case SHORTCUT_FOUND -> {
                p.setNextHardBecomesEasy(true);
                playerRepository.save(p);
                sessionService.publishEvent(s, "SPECIAL", "✨🃏 " + fmt(p) + " findet einen Shortcut (nächste HARD wird EASY).");
            }
            case ROLLBACK -> {
                Player t = requireTarget(sessionId, targetPlayerId);
                sendToJailForOneTurn(t, t.getPositionNodeId());
                playerRepository.save(t);
                sessionService.publishEvent(s, "SPECIAL", "⛓️🃏 " + fmt(p) + " schickt " + fmt(t) + " ins Gefängnis (1 Runde).");
            }
            case BOOST -> {
                BoostResult br = boostOneStep(s, p, boostToNodeId);

                // If this is a fork and the player hasn't chosen an outgoing edge yet,
                // keep the turn in AWAITING_SPECIAL_CARD and return the options so the UI can prompt.
                if (br.needChoice) {
                    return ResponseEntity.status(409).body(java.util.Map.of(
                            "ok", false,
                            "needChoice", true,
                            "forkNodeId", br.forkNodeId,
                            "options", br.options
                    ));
                }

                playerRepository.save(p);
                sessionService.publishEvent(s, "SPECIAL", "⚡🃏 " + fmt(p) + " bekommt einen Boost (+1 Feld).");
            }
            case JAIL -> {
                sendToJailForOneTurn(p, p.getPositionNodeId());
                playerRepository.save(p);
                sessionService.publishEvent(s, "SPECIAL", "⛓️🃏 " + fmt(p) + " muss ins Gefängnis (1 Runde).");
            }
        }

        // End the turn after resolving a special card.
        s.setTurnStatus(GameSessionService.TURN_AWAITING_D6_ROLL);
        sessionRepository.save(s);
        sessionService.advanceTurn(sessionId);
        return ResponseEntity.ok().body(java.util.Map.of("ok", true));
    }

    private Player requireTarget(String sessionId, String targetPlayerId) {
        if (targetPlayerId == null || targetPlayerId.isBlank()) {
            throw new IllegalArgumentException("targetPlayerId required");
        }
        Player t = playerRepository.findById(targetPlayerId).orElseThrow(() -> new IllegalArgumentException("Target not found"));
        if (t.getSessionId() == null || !t.getSessionId().equals(sessionId)) {
            throw new IllegalArgumentException("Target not in session");
        }
        return t;
    }

    private void sendToJailForOneTurn(Player p, String returnNodeId) {
        String jailId = boardService.getJailNodeId();
        if (jailId == null || jailId.isBlank()) {
            p.setSkipTurns(1);
            return;
        }
        p.setJailReturnNodeId(returnNodeId);
        p.setPositionNodeId(jailId);
        p.setSkipTurns(1);
    }

    private static class BoostResult {
        boolean needChoice = false;
        String forkNodeId;
        java.util.List<com.codeconquer.server.dto.ForkOption> options = java.util.List.of();
    }

    private BoostResult boostOneStep(GameSession s, Player p, String boostToNodeId) {
        BoostResult br = new BoostResult();
        BoardGraph board = boardService.getBoard();
        String cur = p.getPositionNodeId();
        if (cur == null) return br;
        var outs = board.outgoing(cur);
        if (outs == null || outs.isEmpty()) return br;

        String next;
        if (outs.size() > 1) {
            // Fork: player must choose.
            if (boostToNodeId == null || boostToNodeId.isBlank()) {
                br.needChoice = true;
                br.forkNodeId = cur;
                br.options = boardService.getForkOptions(cur);
                return br;
            }
            if (!outs.contains(boostToNodeId)) {
                throw new IllegalArgumentException("Invalid boostToNodeId for this fork");
            }
            next = boostToNodeId;
        } else {
            // Only one path.
            next = outs.get(0);
        }

        p.setPositionNodeId(next);

        BoardNodeType t = board.getType(next);
        if (t == BoardNodeType.JAIL) {
            p.setSkipTurns(1);
        }
        if (t == BoardNodeType.FINISH) {
            sessionService.finishSession(s.getId(), p.getId());
        }

        return br;
    }

    private String fmt(Player p) {
        if (p == null) return "🙂 Player";
        String nm = (p.getName() == null || p.getName().isBlank()) ? "Player" : p.getName().trim();
        String ic = (p.getIcon() == null || p.getIcon().isBlank()) ? "🙂" : p.getIcon().trim();
        return ic + " " + nm;
    }
}
