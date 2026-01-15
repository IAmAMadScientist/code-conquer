package com.codeconquer.server.repository;

import com.codeconquer.server.model.GameSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GameSessionRepository extends JpaRepository<GameSession, String> {

    Optional<GameSession> findByCodeIgnoreCase(String code);
}
