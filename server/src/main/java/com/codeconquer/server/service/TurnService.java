package com.codeconquer.server.service;

import com.codeconquer.server.board.BoardGraph;
import com.codeconquer.server.dto.TurnMoveResponse;
import com.codeconquer.server.model.BoardNodeType;
import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.GameSessionRepository;
import com.codeconquer.server.repository.PlayerRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.Random;

/**
 * Handles board movement for turns (Phase 2B):
 * - D6 roll (server authoritative)
 * - Step-by-step movement over directed graph
 * - Fork stop + choosePath continuation
 * - Jail landing -> skipTurns=1 and turn ends
 */
@Service
public class TurnService {

    private final GameSessionService sessionService;
    private final BoardGraphService boardService;
    private final PlayerRepository playerRepository;
    private final GameSessionRepository sessionRepository;

    private final Random random = new Random();

    public TurnService(GameSessionService sessionService,
                       BoardGraphService boardService,
                       PlayerRepository playerRepository,
                       GameSessionRepository sessionRepository) {
        this.sessionService = sessionService;
        this.boardService = boardService;
        this.playerRepository = playerRepository;
        this.sessionRepository = sessionRepository;
    }

    public TurnMoveResponse rollD6(String sessionId, String playerId) {
        GameSession s = requireSession(sessionId);
        Player p = requirePlayer(playerId, sessionId);
        if (!s.isStarted()) throw new IllegalArgumentException("Session not started");
        if (GameSessionService.SESSION_FINISHED.equals(s.getStatus())) {
            throw new IllegalArgumentException("Session finished");
        }

        // Auto-skip if needed (jail mechanic)
        sessionService.advanceTurnConsideringSkips(sessionId);
        s = requireSession(sessionId);
        p = requirePlayer(playerId, sessionId);

        enforceMyTurn(s, p);
        if (!GameSessionService.TURN_AWAITING_D6_ROLL.equals(s.getTurnStatus())) {
            throw new IllegalArgumentException("Not waiting for dice roll");
        }

        int roll = random.nextInt(6) + 1;
        s.setLastDiceRoll(roll);
        s.setPendingForkNodeId(null);
        s.setPendingRemainingSteps(null);

        MoveResult mr = moveSteps(s, p, roll);
        sessionRepository.save(s);
        playerRepository.save(p);

        // If we reached a terminal end-of-turn effect (JAIL), advance immediately.
        if (mr.turnEnded) {
            sessionService.advanceTurn(sessionId);
            sessionService.advanceTurnConsideringSkips(sessionId);
            return responseFor(sessionId, playerId, roll, p, s, mr, "Turn ended");
        }

        // If stopped at fork -> waiting for path choice.
        if (mr.awaitingChoice) {
            return responseFor(sessionId, playerId, roll, p, s, mr, "Choose a path");
        }

        // If movement ended exactly on a FORK node (no steps remaining), there is no challenge to play.
        // End the turn immediately so the game doesn't get stuck on a non-challenge field.
        String endPos = p.getPositionNodeId();
        BoardNodeType endType = (endPos == null ? null : boardService.getBoard().getType(endPos));
        if (endType == BoardNodeType.FORK) {
            sessionRepository.save(s);
            playerRepository.save(p);
            sessionService.advanceTurn(sessionId);
            sessionService.advanceTurnConsideringSkips(sessionId);
            GameSession s2 = requireSession(sessionId);
            Player p2 = requirePlayer(playerId, sessionId);
            return responseFor(sessionId, playerId, roll, p2, s2, new MoveResult(), "Fork – turn ended");
        }

        // Movement finished normally -> allow challenge selection.
        s.setTurnStatus(GameSessionService.TURN_IDLE);
        sessionRepository.save(s);
        return responseFor(sessionId, playerId, roll, p, s, mr, "Moved");
    }

    public TurnMoveResponse choosePath(String sessionId, String playerId, String toNodeId) {
        GameSession s = requireSession(sessionId);
        Player p = requirePlayer(playerId, sessionId);
        if (!s.isStarted()) throw new IllegalArgumentException("Session not started");
        if (GameSessionService.SESSION_FINISHED.equals(s.getStatus())) {
            throw new IllegalArgumentException("Session finished");
        }

        // Auto-skip if needed
        sessionService.advanceTurnConsideringSkips(sessionId);
        s = requireSession(sessionId);
        p = requirePlayer(playerId, sessionId);

        enforceMyTurn(s, p);
        if (!GameSessionService.TURN_AWAITING_PATH_CHOICE.equals(s.getTurnStatus())) {
            throw new IllegalArgumentException("Not waiting for path choice");
        }
        if (s.getPendingForkNodeId() == null || s.getPendingRemainingSteps() == null) {
            throw new IllegalArgumentException("No pending fork");
        }
        String forkNode = s.getPendingForkNodeId();
        int remaining = s.getPendingRemainingSteps();
        if (remaining <= 0) throw new IllegalArgumentException("No remaining steps");

        BoardGraph board = boardService.getBoard();
        List<String> outs = board.outgoing(forkNode);
        if (outs == null || outs.isEmpty()) throw new IllegalArgumentException("Fork has no outgoing edges");
        if (!outs.contains(toNodeId)) throw new IllegalArgumentException("Invalid path choice");

        // Consume 1 step by moving from fork -> chosen node
        p.setPositionNodeId(toNodeId);

        // Apply immediate landing effects for the chosen node before continuing.
        BoardNodeType landed = board.getType(toNodeId);
        if (landed == BoardNodeType.SPECIAL) {
            // SPECIAL: send player to JAIL for one turn, then return to this node.
            sendToJailForOneTurn(p, toNodeId);
            // Clear fork state and end turn immediately.
            s.setPendingForkNodeId(null);
            s.setPendingRemainingSteps(null);
            s.setTurnStatus(GameSessionService.TURN_AWAITING_D6_ROLL);
            sessionRepository.save(s);
            playerRepository.save(p);

            sessionService.advanceTurn(sessionId);
            sessionService.advanceTurnConsideringSkips(sessionId);
            Integer roll = s.getLastDiceRoll();
            return responseFor(sessionId, playerId, roll, p, s, new MoveResult(), "SPECIAL -> JAIL");
        }
        if (landed == BoardNodeType.JAIL) {
            p.setSkipTurns(1);
            // Clear fork state and end turn immediately.
            s.setPendingForkNodeId(null);
            s.setPendingRemainingSteps(null);
            s.setTurnStatus(GameSessionService.TURN_AWAITING_D6_ROLL);
            sessionRepository.save(s);
            playerRepository.save(p);

            sessionService.advanceTurn(sessionId);
            sessionService.advanceTurnConsideringSkips(sessionId);
            Integer roll = s.getLastDiceRoll();
            return responseFor(sessionId, playerId, roll, p, s, new MoveResult(), "Landed on JAIL");
        }
        if (landed == BoardNodeType.FINISH) {
            // Finish: mark session finished and announce winner.
            sessionService.finishSession(sessionId, playerId);
            s = requireSession(sessionId);
            sessionRepository.save(s);
            playerRepository.save(p);
            Integer roll = s.getLastDiceRoll();
            return responseFor(sessionId, playerId, roll, p, s, new MoveResult(), "Reached FINISH");
        }

        // Clear fork state before continuing
        s.setPendingForkNodeId(null);
        s.setPendingRemainingSteps(null);

        MoveResult mr = moveSteps(s, p, remaining - 1);
        sessionRepository.save(s);
        playerRepository.save(p);

        Integer roll = s.getLastDiceRoll();

        if (mr.turnEnded) {
            sessionService.advanceTurn(sessionId);
            sessionService.advanceTurnConsideringSkips(sessionId);
            return responseFor(sessionId, playerId, roll, p, s, mr, "Turn ended");
        }

        if (mr.awaitingChoice) {
            return responseFor(sessionId, playerId, roll, p, s, mr, "Choose a path");
        }

        // If movement ended on a FORK node (no steps remaining), there is no challenge to play.
        // End the turn immediately.
        String endPos = p.getPositionNodeId();
        BoardNodeType endType = (endPos == null ? null : boardService.getBoard().getType(endPos));
        if (endType == BoardNodeType.FORK) {
            sessionRepository.save(s);
            playerRepository.save(p);
            sessionService.advanceTurn(sessionId);
            sessionService.advanceTurnConsideringSkips(sessionId);
            GameSession s2 = requireSession(sessionId);
            Player p2 = requirePlayer(playerId, sessionId);
            return responseFor(sessionId, playerId, roll, p2, s2, new MoveResult(), "Fork – turn ended");
        }

        s.setTurnStatus(GameSessionService.TURN_IDLE);
        sessionRepository.save(s);
        return responseFor(sessionId, playerId, roll, p, s, mr, "Moved");
    }

    private MoveResult moveSteps(GameSession s, Player p, int steps) {
        BoardGraph board = boardService.getBoard();
        MoveResult mr = new MoveResult();

        int remaining = steps;
        while (remaining > 0) {
            String cur = p.getPositionNodeId();
            if (cur == null || cur.isBlank()) {
                p.setPositionNodeId(boardService.getStartNodeId());
                cur = p.getPositionNodeId();
            }

            BoardNodeType t = board.getType(cur);
            if (t == BoardNodeType.FINISH) {
                // Already at finish, no further moves.
                remaining = 0;
                break;
            }

            List<String> outs = board.outgoing(cur);
            if (outs.size() > 1) {
                // Stop at fork before consuming more steps.
                s.setTurnStatus(GameSessionService.TURN_AWAITING_PATH_CHOICE);
                s.setPendingForkNodeId(cur);
                s.setPendingRemainingSteps(remaining);
                mr.awaitingChoice = true;
                mr.forkNodeId = cur;
                mr.remainingSteps = remaining;
                mr.options = outs;
                return mr;
            }
            if (outs.isEmpty()) {
                // Dead end: stop movement.
                remaining = 0;
                break;
            }

            // Single path
            String next = outs.get(0);
            p.setPositionNodeId(next);
            remaining--;

            // Landing effects
            BoardNodeType landedType = board.getType(next);
            if (landedType == BoardNodeType.SPECIAL) {
                // SPECIAL: send player to JAIL for one turn, then return to this node.
                sendToJailForOneTurn(p, next);
                mr.turnEnded = true;
                return mr;
            }
            if (landedType == BoardNodeType.JAIL) {
                p.setSkipTurns(1);
                mr.turnEnded = true;
                return mr;
            }
            if (landedType == BoardNodeType.FINISH) {
                // Finish game immediately.
                sessionService.finishSession(s.getId(), p.getId());
                mr.turnEnded = true;
                return mr;
            }
        }
        mr.awaitingChoice = false;
        return mr;
    }

    private void sendToJailForOneTurn(Player p, String returnNodeId) {
        String jailId = boardService.getJailNodeId();
        if (jailId == null || jailId.isBlank()) {
            // If no jail node is defined, fall back to a normal skip without teleport.
            p.setSkipTurns(1);
            return;
        }
        p.setJailReturnNodeId(returnNodeId);
        p.setPositionNodeId(jailId);
        p.setSkipTurns(1);
    }

    private TurnMoveResponse responseFor(String sessionId, String playerId, Integer roll, Player p, GameSession s, MoveResult mr, String msg) {
        BoardGraph board = boardService.getBoard();
        String pos = p.getPositionNodeId();
        BoardNodeType t = pos == null ? null : board.getType(pos);
        String type = t == null ? null : t.name();
        return new TurnMoveResponse(
                sessionId,
                playerId,
                roll,
                pos,
                type,
                s.getTurnStatus(),
                mr.forkNodeId,
                mr.remainingSteps,
                mr.options,
                msg
        );
    }

    private GameSession requireSession(String sessionId) {
        if (sessionId == null || sessionId.isBlank()) throw new IllegalArgumentException("sessionId required");
        return sessionService.findById(sessionId).orElseThrow(() -> new IllegalArgumentException("Session not found"));
    }

    private Player requirePlayer(String playerId, String sessionId) {
        if (playerId == null || playerId.isBlank()) throw new IllegalArgumentException("playerId required");
        Player p = playerRepository.findById(playerId).orElseThrow(() -> new IllegalArgumentException("Player not found"));
        if (p.getSessionId() == null || !p.getSessionId().equals(sessionId)) throw new IllegalArgumentException("Player not found for session");
        return p;
    }

    private void enforceMyTurn(GameSession s, Player p) {
        if (s.getCurrentTurnOrder() <= 0) throw new IllegalArgumentException("Session turn not initialized");
        if (p.getTurnOrder() != s.getCurrentTurnOrder()) throw new IllegalArgumentException("Not your turn");
    }

    private static class MoveResult {
        boolean awaitingChoice = false;
        boolean turnEnded = false;
        String forkNodeId;
        Integer remainingSteps;
        List<String> options;
    }
}
