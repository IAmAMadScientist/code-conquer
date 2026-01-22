package com.codeconquer.server.service;

import com.codeconquer.server.board.BoardEdgeDef;
import com.codeconquer.server.board.BoardGraph;
import com.codeconquer.server.board.BoardGraphDefinition;
import com.codeconquer.server.board.BoardNodeDef;
import com.codeconquer.server.dto.ForkOption;
import com.codeconquer.server.model.BoardNodeType;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Loads the board graph from resources at startup.
 */
@Service
public class BoardGraphService {

    private final BoardGraph board;

    public BoardGraphService(ObjectMapper objectMapper) {
        this.board = loadFromJson(objectMapper);
    }

    public BoardGraph getBoard() {
        return board;
    }

    public String getStartNodeId() {
        return board.getStartNodeId();
    }

    public String getFinishNodeId() {
        return board.getFinishNodeId();
    }

    public String getJailNodeId() {
        return board.getJailNodeId();
    }

    /**
     * Returns labeled fork options for UI. If the fork is a known board fork,
     * we label the two outgoing edges as "Go straight" vs "Take shortcut".
     * Otherwise we fall back to generic labels.
     */
    public List<ForkOption> getForkOptions(String forkNodeId) {
        if (forkNodeId == null || forkNodeId.isBlank()) return List.of();
        List<String> outs = board.outgoing(forkNodeId);
        if (outs == null || outs.isEmpty()) return List.of();

        // Hard-coded mapping (from design doc). If your board JSON changes, update here.
        // fork -> {straightTo, shortcutTo}
        Map<String, String> straight = Map.of(
                "n12", "n13",
                "n21", "n20",
                "n48", "n49",
                "n59", "n58"
        );
        Map<String, String> shortcut = Map.of(
                "n12", "n16",
                "n21", "n35",
                "n48", "n52",
                "n59", "n69"
        );

        List<ForkOption> options = new ArrayList<>();
        String straightTo = straight.get(forkNodeId);
        String shortcutTo = shortcut.get(forkNodeId);

        for (String to : outs) {
            if (to == null) continue;
            if (shortcutTo != null && shortcutTo.equals(to)) {
                options.add(new ForkOption(to, "Take shortcut"));
            } else if (straightTo != null && straightTo.equals(to)) {
                options.add(new ForkOption(to, "Go straight"));
            } else {
                options.add(new ForkOption(to, "Choose path"));
            }
        }

        // Prefer showing shortcut first (nice UX).
        options.sort((a, b) -> {
            if ("Take shortcut".equals(a.getLabel()) && !"Take shortcut".equals(b.getLabel())) return -1;
            if (!"Take shortcut".equals(a.getLabel()) && "Take shortcut".equals(b.getLabel())) return 1;
            return a.getTo().compareTo(b.getTo());
        });

        return options;
    }

    private BoardGraph loadFromJson(ObjectMapper objectMapper) {
        ClassPathResource res = new ClassPathResource("board/board.json");
        try (InputStream in = res.getInputStream()) {
            BoardGraphDefinition def = objectMapper.readValue(in, BoardGraphDefinition.class);
            validate(def);

            Map<String, BoardNodeType> nodeTypeById = new HashMap<>();
            for (BoardNodeDef n : def.getNodes()) {
                nodeTypeById.put(n.getId(), n.getType());
            }

            Map<String, List<String>> outgoingById = new HashMap<>();
            for (BoardEdgeDef e : def.getEdges()) {
                outgoingById.computeIfAbsent(e.getFrom(), k -> new ArrayList<>()).add(e.getTo());
            }

            String start = def.getNodes().stream()
                    .filter(n -> n.getType() == BoardNodeType.START)
                    .map(BoardNodeDef::getId)
                    .findFirst().orElseThrow(() -> new IllegalStateException("START node missing"));

            String finish = def.getNodes().stream()
                    .filter(n -> n.getType() == BoardNodeType.FINISH)
                    .map(BoardNodeDef::getId)
                    .findFirst().orElseThrow(() -> new IllegalStateException("FINISH node missing"));

            String jail = def.getNodes().stream()
                    .filter(n -> n.getType() == BoardNodeType.JAIL)
                    .map(BoardNodeDef::getId)
                    .findFirst().orElse(null);

            return new BoardGraph(def, nodeTypeById, outgoingById, start, finish, jail);
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load board/board.json", e);
        }
    }

    private void validate(BoardGraphDefinition def) {
        if (def == null) throw new IllegalStateException("board.json is empty");
        if (def.getNodes() == null || def.getNodes().isEmpty()) throw new IllegalStateException("board.json: nodes missing");
        if (def.getEdges() == null || def.getEdges().isEmpty()) throw new IllegalStateException("board.json: edges missing");

        Map<String, BoardNodeDef> byId = new HashMap<>();
        for (BoardNodeDef n : def.getNodes()) {
            if (n.getId() == null || n.getId().isBlank()) throw new IllegalStateException("board.json: node id missing");
            if (n.getType() == null) throw new IllegalStateException("board.json: node type missing for id=" + n.getId());
            if (byId.put(n.getId(), n) != null) throw new IllegalStateException("board.json: duplicate node id=" + n.getId());
        }

        long startCount = def.getNodes().stream().filter(n -> n.getType() == BoardNodeType.START).count();
        long finishCount = def.getNodes().stream().filter(n -> n.getType() == BoardNodeType.FINISH).count();
        if (startCount != 1) throw new IllegalStateException("board.json: expected exactly 1 START node, got " + startCount);
        if (finishCount != 1) throw new IllegalStateException("board.json: expected exactly 1 FINISH node, got " + finishCount);

        for (BoardEdgeDef e : def.getEdges()) {
            if (e.getFrom() == null || e.getFrom().isBlank()) throw new IllegalStateException("board.json: edge.from missing");
            if (e.getTo() == null || e.getTo().isBlank()) throw new IllegalStateException("board.json: edge.to missing");
            if (!byId.containsKey(e.getFrom())) throw new IllegalStateException("board.json: edge.from unknown node " + e.getFrom());
            if (!byId.containsKey(e.getTo())) throw new IllegalStateException("board.json: edge.to unknown node " + e.getTo());
        }

        // Sanity: finish node should exist and can have no outgoing edges; others typically have at least one.
        // We don't strictly enforce out-degree here because special rules might add teleports later.
    }
}
