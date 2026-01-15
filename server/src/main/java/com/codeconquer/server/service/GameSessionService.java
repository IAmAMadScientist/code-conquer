package com.codeconquer.server.service;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.repository.GameSessionRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Service
public class GameSessionService {

    private final GameSessionRepository repo;
    private final SecureRandom rng = new SecureRandom();
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I

    public GameSessionService(GameSessionRepository repo) {
        this.repo = repo;
    }

    public GameSession createNew() {
        GameSession s = new GameSession();
        s.setId(UUID.randomUUID().toString());
        s.setCreatedAt(Instant.now());
        s.setCode(generateUniqueCode());
        return repo.save(s);
    }

    public Optional<GameSession> findById(String id) {
        return repo.findById(id);
    }

    public Optional<GameSession> findByCode(String code) {
        if (code == null) return Optional.empty();
        return repo.findByCodeIgnoreCase(code.trim());
    }

    private String generateUniqueCode() {
        // Try a few times, collisions are extremely unlikely but possible.
        for (int attempt = 0; attempt < 20; attempt++) {
            String code = randomCode(6);
            if (repo.findByCodeIgnoreCase(code).isEmpty()) {
                return code;
            }
        }
        // fallback: use UUID fragment
        return UUID.randomUUID().toString().replace("-", "").substring(0, 6).toUpperCase(Locale.ROOT);
    }

    private String randomCode(int len) {
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(ALPHABET.charAt(rng.nextInt(ALPHABET.length())));
        }
        return sb.toString();
    }
}
