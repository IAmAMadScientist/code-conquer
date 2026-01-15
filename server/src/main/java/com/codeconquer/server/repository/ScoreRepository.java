package com.codeconquer.server.repository;

import com.codeconquer.server.model.Score;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ScoreRepository extends JpaRepository<Score, Long> {

    List<Score> findTop10ByOrderByPointsDesc();

    List<Score> findTop10BySessionIdOrderByPointsDesc(String sessionId);

    List<Score> findBySessionIdAndPlayerNameOrderByIdAsc(String sessionId, String playerName);

    List<Score> findBySessionIdOrderByIdAsc(String sessionId);

    @Query("""
        SELECT new com.codeconquer.server.dto.LeaderboardEntry(
            s.playerName,
            SUM(s.points),
            COUNT(s),
            AVG(s.timeMs),
            SUM(COALESCE(s.errors, 0))
        )
        FROM Score s
        WHERE s.sessionId = :sessionId
        GROUP BY s.playerName
        ORDER BY SUM(s.points) DESC, COUNT(s) DESC
    """)
    java.util.List<com.codeconquer.server.dto.LeaderboardEntry> getLeaderboardForSession(@Param("sessionId") String sessionId);
}
