import React, { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { GameState, TileType, BoardCell, Player } from '../types.js';
import { Coins, LogOut, ArrowRight, CircleDot } from 'lucide-react';

interface GameBoardProps {
  socket: Socket;
  gameState: GameState;
}

type SelectedAction = 
  | { type: 'castle'; rank: number }
  | { type: 'secret' }
  | null;

export default function GameBoard({ socket, gameState }: GameBoardProps) {
  const [selectedAction, setSelectedAction] = useState<SelectedAction>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const me = gameState.players.find(p => p.id === socket.id);
  const isMyTurn = me && gameState.players[gameState.activePlayerIndex].id === me.id;

  // Auto-scroll game log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [gameState.gameLog]);

  const handleCellClick = (r: number, c: number) => {
    if (!isMyTurn || gameState.board[r][c].type !== 'empty') return;

    if (gameState.currentTurnTile) {
      socket.emit('place_drawn_tile', { r, c });
      setSelectedAction(null);
      return;
    }

    if (!selectedAction) return;

    if (selectedAction.type === 'castle') {
      socket.emit('place_castle', { rank: selectedAction.rank, r, c });
    } else if (selectedAction.type === 'secret') {
      socket.emit('place_secret_tile', { r, c });
    }
    setSelectedAction(null);
  };

  const handleDrawTile = () => {
    if (!isMyTurn || gameState.currentTurnTile || gameState.tileBag.length === 0) return;
    socket.emit('draw_tile');
  };

  // Calculations for edge indicators
  const rowSums = calculateRowSegmentSums(gameState.board);
  const colSums = calculateColSegmentSums(gameState.board);

  return (
    <div style={styles.outerContainer} className="animate-pop">
      {/* Top Header */}
      <div className="glass-panel" style={styles.header}>
        <div style={styles.logoSec}>
          <h2 style={styles.logoTitle}>🏰 KINGDOMS</h2>
          <span style={styles.epochBadge}>Epoch {gameState.epoch} / 3</span>
        </div>
        <div style={styles.bagStats}>
          <div style={styles.statBox}>
            <span style={styles.statLabel}>Tiles in Bag</span>
            <span style={styles.statValue}>{gameState.tileBag.length}</span>
          </div>
          <button onClick={() => window.location.reload()} className="btn btn-danger" style={{ padding: '8px 12px' }}>
            <LogOut size={16} /> Leave
          </button>
        </div>
      </div>

      {/* Main Board & Sidebar Area */}
      <div style={styles.mainArea}>
        {/* Left Side: Board & Player deck */}
        <div style={styles.boardColumn}>
          {/* Status Alert Bar */}
          <div className="glass-panel" style={styles.statusPanel}>
            {renderStatusMessage(gameState, isMyTurn || false, me)}
          </div>

          {/* Grid with indicators */}
          <div style={styles.gridWrapper}>
            {/* Column Sums Top */}
            <div style={styles.colIndicatorsRow}>
              <div style={styles.cornerSpacer} />
              {colSums.map((sums, c) => (
                <div key={c} style={styles.colIndicator}>
                  {sums.map((sum, i) => (
                    <span key={i} style={sum >= 0 ? styles.positiveText : styles.negativeText}>
                      {sum >= 0 ? `+${sum}` : sum}
                    </span>
                  ))}
                </div>
              ))}
              <div style={styles.cornerSpacer} />
            </div>

            {/* Board Row & Row Sums */}
            <div style={styles.boardLayoutRow}>
              {/* Row Sums Left */}
              <div style={styles.rowIndicatorsCol}>
                {rowSums.map((sums, r) => (
                  <div key={r} style={styles.rowIndicator}>
                    {sums.map((sum, i) => (
                      <span key={i} style={sum >= 0 ? styles.positiveText : styles.negativeText}>
                        {sum >= 0 ? `+${sum}` : sum}
                      </span>
                    ))}
                  </div>
                ))}
              </div>

              {/* Game Grid */}
              <div className="game-grid">
                {gameState.board.map((row, r) =>
                  row.map((cell, c) => {
                    const isValidHighlight = isMyTurn && cell.type === 'empty' && (gameState.currentTurnTile || selectedAction);
                    return (
                      <div
                        key={`${r}-${c}`}
                        onClick={() => handleCellClick(r, c)}
                        className={`grid-cell ${isValidHighlight ? 'highlight-valid' : ''}`}
                      >
                        {renderCellContent(cell, gameState.players)}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Row Sums Right (duplicate for easier scanning) */}
              <div style={styles.rowIndicatorsCol}>
                {rowSums.map((sums, r) => (
                  <div key={r} style={styles.rowIndicator}>
                    {sums.map((sum, i) => (
                      <span key={i} style={sum >= 0 ? styles.positiveText : styles.negativeText}>
                        {sum >= 0 ? `+${sum}` : sum}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Column Sums Bottom */}
            <div style={styles.colIndicatorsRow}>
              <div style={styles.cornerSpacer} />
              {colSums.map((sums, c) => (
                <div key={c} style={styles.colIndicator}>
                  {sums.map((sum, i) => (
                    <span key={i} style={sum >= 0 ? styles.positiveText : styles.negativeText}>
                      {sum >= 0 ? `+${sum}` : sum}
                    </span>
                  ))}
                </div>
              ))}
              <div style={styles.cornerSpacer} />
            </div>
          </div>

          {/* Action deck */}
          {me && gameState.status === 'PLAYING' && (
            <div className="glass-panel animate-pop" style={styles.deckPanel}>
              <h4 style={styles.panelTitle}>YOUR DECK</h4>
              <div style={styles.deckActions}>
                {/* Castles */}
                <div style={styles.deckGroup}>
                  <span style={styles.deckLabel}>CASTLES</span>
                  <div style={styles.castleButtons}>
                    {([1, 2, 3, 4] as const).map(rank => {
                      const count = me.castles[rank];
                      const isSelected = selectedAction?.type === 'castle' && selectedAction.rank === rank;
                      return (
                        <button
                          key={rank}
                          disabled={!isMyTurn || count <= 0 || !!gameState.currentTurnTile}
                          onClick={() => setSelectedAction(isSelected ? null : { type: 'castle', rank })}
                          style={{
                            ...styles.deckItemBtn,
                            borderColor: isSelected ? 'var(--primary)' : 'var(--border-glass)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)'
                          }}
                        >
                          <span style={styles.castleVisual}>🏰 Rank {rank}</span>
                          <span style={styles.castleCount}>x{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Secret Tile */}
                <div style={styles.deckGroup}>
                  <span style={styles.deckLabel}>SECRET TILE</span>
                  {me.secretTile ? (
                    <button
                      disabled={!isMyTurn || !!gameState.currentTurnTile}
                      onClick={() => setSelectedAction(selectedAction?.type === 'secret' ? null : { type: 'secret' })}
                      style={{
                        ...styles.deckItemBtn,
                        borderColor: selectedAction?.type === 'secret' ? 'var(--primary)' : 'var(--border-glass)',
                        background: selectedAction?.type === 'secret' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)'
                      }}
                    >
                      {renderTileBadge(me.secretTile)}
                    </button>
                  ) : (
                    <div style={styles.noSecretText}>Spent</div>
                  )}
                </div>

                {/* Draw Bag Action */}
                <div style={styles.deckGroup}>
                  <span style={styles.deckLabel}>BAG</span>
                  <button
                    disabled={!isMyTurn || !!gameState.currentTurnTile || gameState.tileBag.length === 0}
                    onClick={handleDrawTile}
                    className="btn btn-primary"
                    style={{ height: '48px', width: '120px' }}
                  >
                    Draw Tile
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Scoreboard & Game Log */}
        <div style={styles.sidebar}>
          {/* Scoreboard */}
          <div className="glass-panel" style={styles.sidebarPanel}>
            <h4 style={styles.panelTitle}><Coins size={16} /> SCOREBOARD</h4>
            <div style={styles.playerScores}>
              {gameState.players.map((p, idx) => {
                const isActive = gameState.players[gameState.activePlayerIndex].id === p.id && gameState.status === 'PLAYING';
                return (
                  <div
                    key={p.id || idx}
                    style={{
                      ...styles.playerScoreRow,
                      borderColor: isActive ? p.color : 'var(--border-glass)',
                      background: isActive ? 'rgba(255,255,255,0.03)' : 'transparent'
                    }}
                  >
                    <div style={styles.scoreRowLeft}>
                      <div style={{ ...styles.colorIndicator, backgroundColor: p.color }} />
                      <span style={{ fontWeight: isActive ? 600 : 400 }}>
                        {p.name} {p.isBot ? '🤖' : ''}
                      </span>
                      {isActive && <CircleDot size={12} color={p.color} className="animate-pulse" />}
                    </div>
                    <span style={styles.scoreVal}>{p.score} Gold</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Game Log */}
          <div className="glass-panel" style={{ ...styles.sidebarPanel, flex: 1 }}>
            <h4 style={styles.panelTitle}>GAME LOG</h4>
            <div style={styles.logBox}>
              {gameState.gameLog.map((log, idx) => (
                <div key={idx} style={styles.logLine}>
                  <ArrowRight size={12} color="var(--primary)" style={{ flexShrink: 0, marginTop: '3px' }} />
                  <span>{log}</span>
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderStatusMessage(gameState: GameState, isMyTurn: boolean, me: Player | undefined) {
  if (gameState.status === 'FINISHED') {
    const winner = gameState.players.find(p => p.id === gameState.winnerId);
    return (
      <div style={styles.statusInner}>
        <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>🏆 Game Over! Winner: {winner?.name || 'Unknown'}</span>
      </div>
    );
  }

  const activePlayer = gameState.players[gameState.activePlayerIndex];

  if (isMyTurn) {
    if (gameState.currentTurnTile) {
      return (
        <div style={styles.statusInner}>
          <span style={styles.highlightText}>Your Turn:</span>
          <span>You drew {renderTileBadgeSmall(gameState.currentTurnTile)}. Choose an empty space to place it.</span>
        </div>
      );
    }
    return (
      <div style={styles.statusInner}>
        <span style={styles.highlightText}>Your Turn:</span>
        <span>Choose an action below (Place castle, place secret tile, or draw from bag).</span>
      </div>
    );
  }

  // Opponent's turn
  if (gameState.currentTurnTile) {
    return (
      <div style={styles.statusInner}>
        <span>{activePlayer.name} drew a tile and is placing it...</span>
      </div>
    );
  }
  return (
    <div style={styles.statusInner}>
      <span>Waiting for {activePlayer.name} to take a turn...</span>
    </div>
  );
}

function renderCellContent(cell: BoardCell, players: Player[]) {
  if (cell.type === 'tile') {
    return renderTileBadge(cell.tile);
  }
  if (cell.type === 'castle') {
    const player = players.find(p => p.id === cell.castle.playerId);
    const castleColor = player ? player.color : '#fff';
    
    // Draw tower ranks
    const dots = [];
    for (let i = 0; i < cell.castle.rank; i++) {
      dots.push(<div key={i} className="tower-dot" />);
    }

    return (
      <div className="castle-badge" style={{ backgroundColor: `${castleColor}22`, borderColor: castleColor }}>
        <span style={{ color: castleColor, fontWeight: 800, fontSize: '1.4rem' }}>🏰</span>
        <div className="castle-towers">{dots}</div>
      </div>
    );
  }
  return null;
}

function renderTileBadge(tile: TileType) {
  if (tile.type === 'resource') {
    return <div className="tile-badge tile-resource">+{tile.value}</div>;
  }
  if (tile.type === 'hazard') {
    return <div className="tile-badge tile-hazard">{tile.value}</div>;
  }
  if (tile.type === 'dragon') {
    return <div className="tile-badge tile-dragon">🐉</div>;
  }
  if (tile.type === 'goldmine') {
    return <div className="tile-badge tile-goldmine">🪙</div>;
  }
  if (tile.type === 'wizard') {
    return <div className="tile-badge tile-wizard">🧙</div>;
  }
  if (tile.type === 'mountain') {
    return <div className="tile-badge tile-mountain">⛰️</div>;
  }
  return null;
}

function renderTileBadgeSmall(tile: TileType) {
  if (tile.type === 'resource') {
    return <span style={{ color: 'var(--color-resource)', fontWeight: 800 }}>[+{tile.value} Resource]</span>;
  }
  if (tile.type === 'hazard') {
    return <span style={{ color: 'var(--color-hazard)', fontWeight: 800 }}>[{tile.value} Hazard]</span>;
  }
  const emojiMap = { dragon: '🐉 Dragon', goldmine: '🪙 Gold Mine', wizard: '🧙 Wizard', mountain: '⛰️ Mountain' };
  return <span style={{ color: 'var(--primary)', fontWeight: 800 }}>[{emojiMap[tile.type as keyof typeof emojiMap]}]</span>;
}

// Logic for calculating edge segment scores on frontend
function calculateRowSegmentSums(board: BoardCell[][]): number[][] {
  const allRowSums: number[][] = [];
  for (let r = 0; r < 5; r++) {
    const row = board[r];
    const segmentSums: number[] = [];
    let currentSum = 0;
    let hasDragon = false;
    let hasGoldMine = false;
    let hasSegmentTiles = false;

    for (let c = 0; c < 6; c++) {
      const cell = row[c];
      if (cell.type === 'tile' && cell.tile.type === 'mountain') {
        if (hasSegmentTiles) {
          if (hasGoldMine) currentSum *= 2;
          segmentSums.push(currentSum);
        } else {
          segmentSums.push(0);
        }
        currentSum = 0;
        hasDragon = false;
        hasGoldMine = false;
        hasSegmentTiles = false;
        continue;
      }
      
      if (cell.type === 'tile') {
        hasSegmentTiles = true;
        const tile = cell.tile;
        if (tile.type === 'resource') {
          currentSum += hasDragon ? 0 : tile.value;
        } else if (tile.type === 'hazard') {
          currentSum += tile.value;
        } else if (tile.type === 'dragon') {
          hasDragon = true;
          // Retroactively strip resources
          currentSum = row.slice(c - (c % 6), c + 1).reduce((acc, currentCell) => {
            if (currentCell.type === 'tile' && currentCell.tile.type === 'resource') return acc;
            if (currentCell.type === 'tile' && currentCell.tile.type === 'hazard') return acc + currentCell.tile.value;
            return acc;
          }, 0);
        } else if (tile.type === 'goldmine') {
          hasGoldMine = true;
        }
      }
    }
    if (hasGoldMine) currentSum *= 2;
    segmentSums.push(currentSum);
    allRowSums.push(segmentSums);
  }
  return allRowSums;
}

function calculateColSegmentSums(board: BoardCell[][]): number[][] {
  const allColSums: number[][] = [];
  for (let c = 0; c < 6; c++) {
    const segmentSums: number[] = [];
    let currentSum = 0;
    let hasDragon = false;
    let hasGoldMine = false;
    let hasSegmentTiles = false;

    for (let r = 0; r < 5; r++) {
      const cell = board[r][c];
      if (cell.type === 'tile' && cell.tile.type === 'mountain') {
        if (hasSegmentTiles) {
          if (hasGoldMine) currentSum *= 2;
          segmentSums.push(currentSum);
        } else {
          segmentSums.push(0);
        }
        currentSum = 0;
        hasDragon = false;
        hasGoldMine = false;
        hasSegmentTiles = false;
        continue;
      }
      
      if (cell.type === 'tile') {
        hasSegmentTiles = true;
        const tile = cell.tile;
        if (tile.type === 'resource') {
          currentSum += hasDragon ? 0 : tile.value;
        } else if (tile.type === 'hazard') {
          currentSum += tile.value;
        } else if (tile.type === 'dragon') {
          hasDragon = true;
          // Retroactively strip resources
          let temp = 0;
          for (let prevR = r - (r % 5); prevR <= r; prevR++) {
            const prevCell = board[prevR][c];
            if (prevCell.type === 'tile' && prevCell.tile.type === 'hazard') {
              temp += prevCell.tile.value;
            }
          }
          currentSum = temp;
        } else if (tile.type === 'goldmine') {
          hasGoldMine = true;
        }
      }
    }
    if (hasGoldMine) currentSum *= 2;
    segmentSums.push(currentSum);
    allColSums.push(segmentSums);
  }
  return allColSums;
}

const styles = {
  outerContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    minHeight: '90vh'
  },
  header: {
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  logoSec: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  logoTitle: {
    fontSize: '1.4rem',
    background: 'linear-gradient(135deg, #fff, #94a3b8)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  epochBadge: {
    background: 'rgba(99,102,241,0.15)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '20px',
    padding: '4px 12px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#a5b4fc'
  },
  bagStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  statBox: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'flex-end'
  },
  statLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em'
  },
  statValue: {
    fontSize: '1.1rem',
    fontWeight: 700
  },
  mainArea: {
    display: 'flex',
    gap: '24px',
    flex: 1
  },
  boardColumn: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  },
  statusPanel: {
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center'
  },
  statusInner: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    fontSize: '0.95rem'
  },
  highlightText: {
    fontWeight: 700,
    color: 'var(--accent)'
  },
  gridWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(0,0,0,0.1)',
    padding: '16px',
    borderRadius: '16px',
    border: '1px solid var(--border-glass)'
  },
  colIndicatorsRow: {
    display: 'flex',
    width: '100%',
    maxWidth: '680px',
    justifyContent: 'space-between'
  },
  colIndicator: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    gap: '2px'
  },
  boardLayoutRow: {
    display: 'flex',
    width: '100%',
    maxWidth: '760px',
    alignItems: 'center',
    gap: '12px'
  },
  rowIndicatorsCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    height: '100%',
    justifyContent: 'space-around'
  },
  rowIndicator: {
    height: '100%',
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    gap: '4px',
    width: '32px',
    justifyContent: 'center'
  },
  cornerSpacer: {
    width: '44px' // Matches row indicators
  },
  positiveText: {
    color: 'var(--color-resource)'
  },
  negativeText: {
    color: 'var(--color-hazard)'
  },
  deckPanel: {
    padding: '16px 20px'
  },
  panelTitle: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  deckActions: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '24px'
  },
  deckGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    flex: 1
  },
  deckLabel: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    fontWeight: 600
  },
  castleButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px'
  },
  deckItemBtn: {
    border: '1px solid var(--border-glass)',
    borderRadius: '8px',
    padding: '10px',
    color: 'var(--text-main)',
    cursor: 'pointer',
    transition: 'var(--transition-smooth)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '48px'
  },
  castleVisual: {
    fontSize: '0.9rem',
    fontWeight: 500
  },
  castleCount: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    fontWeight: 700
  },
  noSecretText: {
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    fontStyle: 'italic'
  },
  sidebar: {
    width: '320px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  },
  sidebarPanel: {
    padding: '16px'
  },
  playerScores: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px'
  },
  playerScoreRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid var(--border-glass)'
  },
  scoreRowLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  colorIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  scoreVal: {
    fontFamily: 'var(--font-title)',
    fontWeight: 700,
    fontSize: '0.95rem'
  },
  logBox: {
    height: '240px',
    overflowY: 'auto' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    fontFamily: 'monospace',
    fontSize: '0.85rem',
    padding: '8px',
    background: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
    border: '1px solid var(--border-glass)'
  },
  logLine: {
    display: 'flex',
    gap: '6px',
    color: '#cbd5e1',
    lineHeight: '1.4'
  }
};
