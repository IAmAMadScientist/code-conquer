package com.codeconquer.server.model;

/**
 * Board node types used by the board graph JSON.
 *
 * Mapping rules for your physical board:
 * - START: S
 * - FINISH: F
 * - EASY: Kreis
 * - MEDIUM: Dreieck
 * - HARD: Quadrat
 * - SPECIAL: Stern
 * - JAIL: leeres Feld (Gefängnis)
 * - FORK: helper type for branch nodes (non-scoring)
 */
public enum BoardNodeType {
    START,
    FINISH,
    EASY,
    MEDIUM,
    HARD,
    SPECIAL,
    JAIL,
    FORK
}
