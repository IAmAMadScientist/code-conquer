package com.codeconquer.server.model;

/**
 * Special deck cards (drawn in real life, selected in-app for applying effects).
 */
public enum SpecialCardType {
    PERMISSION_DENIED,
    RAGE_BAIT,
    REFACTOR,
    SECOND_CHANCE,
    SHORTCUT_FOUND,
    ROLLBACK,
    BOOST,
    JAIL;

    public boolean isPositive() {
        return switch (this) {
            case REFACTOR, SECOND_CHANCE, SHORTCUT_FOUND, BOOST -> true;
            default -> false;
        };
    }
}
