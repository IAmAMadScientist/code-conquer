package com.codeconquer.server.service;

import com.codeconquer.server.board.BoardGraph;
import com.codeconquer.server.dto.TurnMoveResponse;
import com.codeconquer.server.model.BoardNodeType;
import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.GameSessionRepository;
import com.codeconquer.server.repository.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class TurnServiceTest {

    @Mock
    private GameSessionService sessionService;

    @Mock
    private BoardGraphService boardService;

    @Mock
    private PlayerRepository playerRepository;

    @Mock
    private GameSessionRepository sessionRepository;

    @InjectMocks
    private TurnService turnService;

    @Mock
    private BoardGraph boardGraph;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        when(boardService.getBoard()).thenReturn(boardGraph);
    }

    @Test
    void testRollD6_BasicMove() {
        String sessionId = "s1";
        String playerId = "p1";

        GameSession session = new GameSession();
        session.setId(sessionId);
        session.setStarted(true);
        session.setCurrentTurnOrder(1);
        session.setTurnStatus(GameSessionService.TURN_AWAITING_D6_ROLL);

        Player player = new Player();
        player.setId(playerId);
        player.setSessionId(sessionId);
        player.setTurnOrder(1);
        player.setPositionNodeId("n1");

        when(sessionService.findById(sessionId)).thenReturn(Optional.of(session));
        when(playerRepository.findById(playerId)).thenReturn(Optional.of(player));
        
        // Mock board movement: n1 -> n2 -> n3 -> n4 -> n5 -> n6 -> n7
        when(boardGraph.outgoing("n1")).thenReturn(List.of("n2"));
        when(boardGraph.outgoing("n2")).thenReturn(List.of("n3"));
        when(boardGraph.outgoing("n3")).thenReturn(List.of("n4"));
        when(boardGraph.outgoing("n4")).thenReturn(List.of("n5"));
        when(boardGraph.outgoing("n5")).thenReturn(List.of("n6"));
        when(boardGraph.outgoing("n6")).thenReturn(List.of("n7"));
        
        when(boardGraph.getType(anyString())).thenReturn(BoardNodeType.EASY);

        TurnMoveResponse response = turnService.rollD6(sessionId, playerId);

        assertNotNull(response);
        assertNotNull(response.getDiceRoll());
        assertTrue(response.getDiceRoll() >= 1 && response.getDiceRoll() <= 6);
        
        // Final position should be starting node + dice roll
        String expectedNode = "n" + (1 + response.getDiceRoll());
        assertEquals(expectedNode, player.getPositionNodeId());
        assertEquals(GameSessionService.TURN_IDLE, session.getTurnStatus());
        
        verify(sessionRepository, atLeastOnce()).save(session);
        verify(playerRepository, atLeastOnce()).save(player);
        verify(sessionService, atLeastOnce()).notifyUpdate(sessionId);
    }
}
