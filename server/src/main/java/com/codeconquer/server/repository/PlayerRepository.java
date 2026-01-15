package com.codeconquer.server.repository;

import com.codeconquer.server.model.Player;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlayerRepository extends JpaRepository<Player, String> {

    List<Player> findBySessionIdOrderByCreatedAtAsc(String sessionId);

    Optional<Player> findBySessionIdAndNameIgnoreCase(String sessionId, String name);
}
