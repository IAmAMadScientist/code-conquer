package com.codeconquer.server.repository;

import com.codeconquer.server.model.Score;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScoreRepository extends JpaRepository<Score, Long> {

    List<Score> findTop10ByOrderByPointsDesc();
}
