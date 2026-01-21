package com.codeconquer.server.board;

import com.codeconquer.server.model.BoardNodeType;

import java.util.Collections;
import java.util.List;
import java.util.Map;

/**
 * Runtime representation of the board.
 */
public class BoardGraph {

    private final BoardGraphDefinition definition;
    private final Map<String, BoardNodeType> nodeTypeById;
    private final Map<String, List<String>> outgoingById;
    private final String startNodeId;
    private final String finishNodeId;
    private final String jailNodeId;

    public BoardGraph(BoardGraphDefinition definition,
                      Map<String, BoardNodeType> nodeTypeById,
                      Map<String, List<String>> outgoingById,
                      String startNodeId,
                      String finishNodeId,
                      String jailNodeId) {
        this.definition = definition;
        this.nodeTypeById = nodeTypeById;
        this.outgoingById = outgoingById;
        this.startNodeId = startNodeId;
        this.finishNodeId = finishNodeId;
        this.jailNodeId = jailNodeId;
    }

    public BoardGraphDefinition getDefinition() {
        return definition;
    }

    public Map<String, BoardNodeType> getNodeTypeById() {
        return nodeTypeById;
    }

    public String getStartNodeId() {
        return startNodeId;
    }

    public String getFinishNodeId() {
        return finishNodeId;
    }

    public String getJailNodeId() {
        return jailNodeId;
    }

    public BoardNodeType getType(String nodeId) {
        return nodeTypeById.get(nodeId);
    }

    public List<String> outgoing(String fromId) {
        return outgoingById.getOrDefault(fromId, Collections.emptyList());
    }
}
