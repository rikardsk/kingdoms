import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameState } from './types.js';
import Lobby from './components/Lobby.tsx';
import GameBoard from './components/GameBoard.tsx';

// Socket connection
const socket: Socket = io(window.location.origin, {
  autoConnect: true
});

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for state synchronization
    socket.on('game_state', (state: GameState) => {
      setGameState(state);
      setError(null);
    });

    // Listen for rule/action errors
    socket.on('error_msg', (msg: string) => {
      setError(msg);
      // Auto-dismiss errors after 4 seconds
      setTimeout(() => {
        setError(prev => prev === msg ? null : prev);
      }, 4000);
    });

    return () => {
      socket.off('game_state');
      socket.off('error_msg');
    };
  }, []);

  return (
    <div style={styles.appContainer}>
      {!gameState || gameState.status === 'LOBBY' ? (
        <Lobby socket={socket} gameState={gameState} error={error} />
      ) : (
        <GameBoard socket={socket} gameState={gameState} />
      )}
    </div>
  );
}

const styles = {
  appContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '20px 0'
  }
};
