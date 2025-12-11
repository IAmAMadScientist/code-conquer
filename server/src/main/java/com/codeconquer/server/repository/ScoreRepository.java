package com.codeconquer.server.repository;

import com.codeconquer.server.model.Score;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScoreRepository extends JpaRepository<Score, Long> {

}
