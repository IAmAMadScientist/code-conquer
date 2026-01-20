package com.codeconquer.server.repository;

import com.codeconquer.server.model.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, String> {

    List<Player> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    List<Player> findBySessionIdOrderByTotalScoreDescCreatedAtAsc(String sessionId);

    Optional<Player> findBySessionIdAndNameIgnoreCase(String sessionId, String name);

    @Query("SELECT COALESCE(MAX(p.turnOrder), 0) FROM Player p WHERE p.sessionId = :sessionId")
    int getMaxTurnOrder(@Param("sessionId") String sessionId);
}
