package com.codeconquer.server.controller;

import com.codeconquer.server.model.GameEvent;
import com.codeconquer.server.service.GameEventService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/sessions")
public class GameEventController {

    private final GameEventService eventService;

    public GameEventController(GameEventService eventService) {
        this.eventService = eventService;
    }

    /**
     * Poll game events for a session.
     *
     * Examples:
     *  - /api/sessions/{id}/events?limit=10
     *  - /api/sessions/{id}/events?afterSeq=12
     */
    @GetMapping("/{sessionId}/events")
    public List<GameEvent> getEvents(@PathVariable("sessionId") String sessionId,
                                    @RequestParam(value = "afterSeq", required = false) Long afterSeq,
                                    @RequestParam(value = "limit", required = false) Integer limit) {
        if (afterSeq != null) {
            return eventService.getEventsAfter(sessionId, afterSeq);
        }
        return eventService.getLatest(sessionId, limit == null ? 10 : limit);
    }
}
