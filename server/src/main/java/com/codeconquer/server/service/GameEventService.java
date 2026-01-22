package com.codeconquer.server.service;

import com.codeconquer.server.model.GameEvent;
import com.codeconquer.server.repository.GameEventRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
public class GameEventService {

    private final GameEventRepository repo;

    public GameEventService(GameEventRepository repo) {
        this.repo = repo;
    }

    public List<GameEvent> getEventsAfter(String sessionId, long afterSeq) {
        if (sessionId == null || sessionId.isBlank()) throw new IllegalArgumentException("sessionId required");
        if (afterSeq < 0) afterSeq = 0;
        return repo.findBySessionIdAndSeqGreaterThanOrderBySeqAsc(sessionId, afterSeq);
    }

    public List<GameEvent> getLatest(String sessionId, int limit) {
        if (sessionId == null || sessionId.isBlank()) throw new IllegalArgumentException("sessionId required");
        if (limit <= 0) limit = 10;
        if (limit > 50) limit = 50;
        List<GameEvent> desc = repo.findBySessionIdOrderBySeqDesc(sessionId, PageRequest.of(0, limit));
        if (desc == null || desc.isEmpty()) return Collections.emptyList();
        // Convert to ascending order for UI.
        List<GameEvent> asc = new ArrayList<>(desc);
        asc.sort((a, b) -> Long.compare(a.getSeq(), b.getSeq()));
        return asc;
    }
}
