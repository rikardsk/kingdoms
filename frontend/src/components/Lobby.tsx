import React, { useState } from 'react';
import { Socket } from 'socket.io-client';
import { GameState } from '../types.js';
import { Play, UserPlus, ShieldAlert, Bot } from 'lucide-react';

interface LobbyProps {
  socket: Socket;
  gameState: GameState | null;
  error: string | null;
}

export default function Lobby({ socket, gameState, error }: LobbyProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  const handleCreate = () => {
    socket.emit('create_game', { playerName: name });
  };

  const handleJoin = () => {
    if (!code) return;
    socket.emit('join_game', { gameId: code.trim().toUpperCase(), playerName: name });
  };

  const handleAddBot = (difficulty: 'easy' | 'hard') => {
    socket.emit('add_bot', { difficulty });
  };

  const handleStart = () => {
    socket.emit('start_game');
  };

  if (gameState) {
    const isHost = gameState.players[0].id === socket.id;
    return renderLobbyWaitingScreen(gameState, isHost, handleAddBot, handleStart);
  }

  return (
    <div className="lobby-container animate-pop" style={styles.container}>
      <h1 style={styles.title}>🏰 KINGDOMS</h1>
      <p style={styles.subtitle}>Reiner Knizia's Tactical Board Game</p>

      {error && (
        <div style={styles.errorAlert}>
          <ShieldAlert size={18} /> {error}
        </div>
      )}

      <div style={styles.inputGroup}>
        <label style={styles.label}>Your Nickname</label>
        <input
          type="text"
          placeholder="Enter name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />
      </div>

      <div style={styles.actions}>
        <button onClick={handleCreate} className="btn btn-primary" style={{ flex: 1 }}>
          <Play size={18} /> Create Room
        </button>

        <div style={styles.divider}>or</div>

        <div style={styles.joinBox}>
          <input
            type="text"
            placeholder="Lobby Code..."
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ ...styles.input, flex: 1 }}
          />
          <button onClick={handleJoin} className="btn btn-secondary">
            <UserPlus size={18} /> Join Game
          </button>
        </div>
      </div>
    </div>
  );
}

function renderLobbyWaitingScreen(
  gameState: GameState,
  isHost: boolean,
  handleAddBot: (diff: 'easy' | 'hard') => void,
  handleStart: () => void
) {
  return (
    <div className="glass-panel animate-pop" style={styles.waitingContainer}>
      <div style={styles.lobbyHeader}>
        <h2>LOBBY CODE: <span style={styles.codeText}>{gameState.gameId}</span></h2>
        <p style={styles.subtitle}>Share this code with other players to join</p>
      </div>

      <div style={styles.playerListContainer}>
        <h3>Players ({gameState.players.length}/4)</h3>
        <div style={styles.playerList}>
          {gameState.players.map((p, idx) => (
            <div key={p.id || idx} style={styles.playerRow}>
              <div style={{ ...styles.colorCircle, backgroundColor: p.color }} />
              <span style={{ fontWeight: p.id === gameState.players[0].id ? 600 : 400 }}>
                {p.name} {p.isBot ? '🤖' : ''} {idx === 0 ? '👑' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {isHost && gameState.players.length < 4 && (
        <div style={styles.botControls}>
          <button onClick={() => handleAddBot('easy')} className="btn btn-secondary" style={styles.smallBotBtn}>
            <Bot size={16} /> Add Easy Bot
          </button>
          <button onClick={() => handleAddBot('hard')} className="btn btn-secondary" style={styles.smallBotBtn}>
            <Bot size={16} /> Add Hard Bot
          </button>
        </div>
      )}

      <div style={styles.lobbyFooter}>
        {isHost ? (
          <button
            onClick={handleStart}
            disabled={gameState.players.length < 2}
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px' }}
          >
            Start Kingdoms Game
          </button>
        ) : (
          <div style={styles.waitingMsg}>Waiting for host to start the game...</div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '450px',
    margin: '10vh auto',
    padding: '32px',
    textAlign: 'center' as const,
    background: 'var(--bg-card)',
    backdropFilter: 'blur(12px)',
    border: '1px solid var(--border-glass)',
    borderRadius: '16px',
    boxShadow: 'var(--shadow-premium)'
  },
  title: {
    fontSize: '2.5rem',
    background: 'linear-gradient(135deg, #fff, var(--text-muted))',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px'
  },
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '0.95rem',
    marginBottom: '24px'
  },
  errorAlert: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    color: 'var(--color-hazard)',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '0.9rem'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    textAlign: 'left' as const,
    marginBottom: '20px'
  },
  label: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  input: {
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid var(--border-glass)',
    borderRadius: '8px',
    padding: '12px 16px',
    color: 'var(--text-main)',
    fontSize: '1rem',
    outline: 'none',
    transition: 'var(--transition-smooth)'
  },
  actions: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  },
  divider: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%'
  },
  joinBox: {
    display: 'flex',
    gap: '8px'
  },
  waitingContainer: {
    maxWidth: '450px',
    margin: '10vh auto',
    padding: '32px'
  },
  lobbyHeader: {
    textAlign: 'center' as const,
    borderBottom: '1px solid var(--border-glass)',
    paddingBottom: '20px',
    marginBottom: '20px'
  },
  codeText: {
    color: 'var(--accent)',
    fontSize: '1.8rem',
    letterSpacing: '0.1em',
    fontWeight: 800
  },
  playerListContainer: {
    marginBottom: '24px'
  },
  playerList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginTop: '12px'
  },
  playerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.02)',
    padding: '12px 16px',
    borderRadius: '8px',
    border: '1px solid var(--border-glass)'
  },
  colorCircle: {
    width: '14px',
    height: '14px',
    borderRadius: '50%'
  },
  botControls: {
    display: 'flex',
    gap: '10px',
    marginBottom: '24px'
  },
  smallBotBtn: {
    flex: 1,
    padding: '8px 12px',
    fontSize: '0.85rem'
  },
  lobbyFooter: {
    marginTop: '20px'
  },
  waitingMsg: {
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '12px'
  }
};
