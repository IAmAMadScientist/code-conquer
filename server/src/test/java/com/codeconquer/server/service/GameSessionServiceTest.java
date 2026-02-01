package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.model.Player;
import com.codeconquer.server.repository.GameEventRepository;
import com.codeconquer.server.repository.GameSessionRepository;
import com.codeconquer.server.repository.PlayerRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GameSessionServiceTest {

    @Mock
    private GameSessionRepository sessionRepository;

    @Mock
    private PlayerRepository playerRepository;

    @Mock
    private GameEventRepository gameEventRepository;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private GameSessionService sessionService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testAdvanceTurn_CyclesPlayers() {
        String sessionId = "s1";
        GameSession session = new GameSession();
        session.setId(sessionId);
        session.setStarted(true);
        session.setCurrentTurnOrder(1);
        session.setStatus(GameSessionService.SESSION_IN_PROGRESS);

        Player p1 = new Player();
        p1.setId("p1");
        p1.setSessionId(sessionId);
        p1.setTurnOrder(1);
        p1.setName("Alice");

        Player p2 = new Player();
        p2.setId("p2");
        p2.setSessionId(sessionId);
        p2.setTurnOrder(2);
        p2.setName("Bob");

        when(sessionRepository.findById(sessionId)).thenReturn(Optional.of(session));
        // Return players in order
        when(playerRepository.findBySessionIdOrderByCreatedAtAsc(sessionId)).thenReturn(Arrays.asList(p1, p2));
        when(sessionRepository.save(any(GameSession.class))).thenAnswer(i -> i.getArguments()[0]);

        // Act: Advance from p1
        sessionService.advanceTurn(sessionId);

        // Assert: Should be p2 (turn order 2)
        assertEquals(2, session.getCurrentTurnOrder());
        assertEquals(GameSessionService.TURN_AWAITING_D6_ROLL, session.getTurnStatus());

        // Act: Advance from p2
        sessionService.advanceTurn(sessionId);

        // Assert: Should be p1 (turn order 1)
        assertEquals(1, session.getCurrentTurnOrder());

        verify(sessionRepository, atLeast(2)).save(session);
        // notifyUpdate is called on advance
        verify(messagingTemplate, atLeast(2)).convertAndSend(anyString(), any(Object.class));
    }
}
