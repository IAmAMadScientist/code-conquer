package com.codeconquer.server.controller;

import com.codeconquer.server.model.GameSession;
import com.codeconquer.server.service.GameSessionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    private final GameSessionService service;

    public SessionController(GameSessionService service) {
        this.service = service;
    }

    @PostMapping
    public GameSession createSession() {
        return service.createNew();
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameSession> getById(@PathVariable String id) {
        return service.findById(id).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<GameSession> getByCode(@PathVariable String code) {
        return service.findByCode(code).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }
}
