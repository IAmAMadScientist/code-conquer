import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import Play from './Play';
import { TURN_STATUS, DIFFICULTY, FIELD_TYPE, SESSION_STATUS } from '../lib/constants';
import * as playerLib from '../lib/player';
import * as sessionLib from '../lib/session';

// Mock dependencies
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  useLocation: () => ({ state: {} }),
  Link: ({ children }) => <a>{children}</a>,
}));

// Mock components that might cause issues or aren't relevant to the test
vi.mock('../components/AppShell', () => ({
  default: ({ children, title, actions }) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="actions">{actions}</div>
      {children}
    </div>
  ),
}));

vi.mock('../components/EventFeed', () => ({
  default: () => <div>EventFeed</div>,
}));

vi.mock('../components/D6Die', () => ({
  default: ({ onRoll, disabled }) => (
    <button onClick={onRoll} disabled={disabled}>
      Roll D6
    </button>
  ),
}));

vi.mock('../components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('Play Page', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    
    // Default mocks
    vi.spyOn(sessionLib, 'getSession').mockReturnValue({ sessionId: '123', sessionCode: 'ABC' });
    vi.spyOn(playerLib, 'getPlayer').mockReturnValue({ playerId: 'p1', playerName: 'Tester', playerIcon: '🧪' });
    vi.spyOn(playerLib, 'fetchLobby').mockResolvedValue({
      started: true,
      currentPlayerId: 'p1',
      turnStatus: TURN_STATUS.AWAITING_D6_ROLL,
      players: [{ id: 'p1', name: 'Tester', turnOrder: 1, positionType: FIELD_TYPE.EASY }],
    });
  });

  it('renders "Roll" button when it is my turn and awaiting roll', async () => {
    render(<Play />);

    await waitFor(() => {
      expect(screen.getByText('Roll D6')).toBeInTheDocument();
    });
    
    // Check if the button is enabled (not disabled)
    expect(screen.getByText('Roll D6')).not.toBeDisabled();
  });

  it('disables "Roll" button when it is NOT my turn', async () => {
    vi.spyOn(playerLib, 'fetchLobby').mockResolvedValue({
      started: true,
      currentPlayerId: 'p2', // Not me
      turnStatus: TURN_STATUS.AWAITING_D6_ROLL,
      players: [
        { id: 'p1', name: 'Tester', turnOrder: 1 },
        { id: 'p2', name: 'Opponent', turnOrder: 2 }
      ],
    });

    render(<Play />);

    await waitFor(() => {
      // The primary action button should say "Not your turn" and be disabled
      const btn = screen.getByText('Not your turn');
      expect(btn).toBeInTheDocument();
      expect(btn).toBeDisabled();
      
      // The D6Die component should NOT be rendered
      const rollBtn = screen.queryByText('Roll D6');
      expect(rollBtn).not.toBeInTheDocument();
    });
  });

  it('shows "Start challenge" when landed on a challenge field', async () => {
    vi.spyOn(playerLib, 'fetchLobby').mockResolvedValue({
      started: true,
      currentPlayerId: 'p1',
      turnStatus: TURN_STATUS.IDLE, // Landed
      players: [{ id: 'p1', name: 'Tester', positionType: FIELD_TYPE.HARD }], // Challenge field
    });

    render(<Play />);

    await waitFor(() => {
      const actions = screen.getByTestId('actions');
      expect(actions).toHaveTextContent('Start challenge');
    });
  });
});
