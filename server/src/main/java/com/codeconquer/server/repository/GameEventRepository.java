package com.codeconquer.server.repository;

import com.codeconquer.server.model.GameEvent;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameEventRepository extends JpaRepository<GameEvent, Long> {

    List<GameEvent> findBySessionIdAndSeqGreaterThanOrderBySeqAsc(String sessionId, long afterSeq);

    List<GameEvent> findBySessionIdOrderBySeqDesc(String sessionId, Pageable pageable);
}
