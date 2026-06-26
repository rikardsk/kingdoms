import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { GameState, Player, BoardCell, TileType, Castle } from './types';
import { 
  createInitialBoard, 
  createTileBag, 
  getStartingCastles, 
  calculateScoreReport, 
  isBoardFull, 
  PLAYER_COLORS 
} from './game';
import { makeBotMove } from './bot';

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const games: Record<string, GameState> = {};
const socketToGame: Record<string, string> = {};

io.on('connection', (socket: Socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('create_game', ({ playerName }: { playerName: string }) => {
    handleCreateGame(socket, playerName);
  });

  socket.on('join_game', ({ gameId, playerName }: { gameId: string, playerName: string }) => {
    handleJoinGame(socket, gameId, playerName);
  });

  socket.on('add_bot', ({ difficulty }: { difficulty: 'easy' | 'hard' }) => {
    handleAddBot(socket, difficulty);
  });

  socket.on('start_game', () => {
    handleStartGame(socket);
  });

  socket.on('draw_tile', () => {
    handleDrawTile(socket);
  });

  socket.on('place_drawn_tile', ({ r, c }: { r: number, c: number }) => {
    handlePlaceDrawnTile(socket, r, c);
  });

  socket.on('place_secret_tile', ({ r, c }: { r: number, c: number }) => {
    handlePlaceSecretTile(socket, r, c);
  });

  socket.on('place_castle', ({ rank, r, c }: { rank: number, r: number, c: number }) => {
    handlePlaceCastle(socket, rank, r, c);
  });

  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });
});

function handleCreateGame(socket: Socket, playerName: string) {
  const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
  const host: Player = {
    id: socket.id,
    name: playerName || 'Host',
    color: PLAYER_COLORS[0],
    isBot: false,
    score: 0,
    castles: { 1: 0, 2: 0, 3: 0, 4: 0 },
    secretTile: null
  };

  games[gameId] = {
    gameId,
    players: [host],
    activePlayerIndex: 0,
    epoch: 1,
    board: createInitialBoard(),
    tileBag: [],
    gameLog: [`Lobby created. Code: ${gameId}`],
    status: 'LOBBY',
    currentTurnTile: null,
    winnerId: null
  };

  socketToGame[socket.id] = gameId;
  socket.join(gameId);
  socket.emit('game_state', sanitizeStateForPlayer(games[gameId], socket.id));
}

function handleJoinGame(socket: Socket, gameId: string, playerName: string) {
  const game = games[gameId];
  if (!game) return socket.emit('error_msg', 'Game not found.');
  if (game.status !== 'LOBBY') return socket.emit('error_msg', 'Game already started.');
  if (game.players.length >= 4) return socket.emit('error_msg', 'Lobby is full.');

  const newPlayer: Player = {
    id: socket.id,
    name: playerName || `Player ${game.players.length + 1}`,
    color: PLAYER_COLORS[game.players.length],
    isBot: false,
    score: 0,
    castles: { 1: 0, 2: 0, 3: 0, 4: 0 },
    secretTile: null
  };

  game.players.push(newPlayer);
  game.gameLog.push(`${newPlayer.name} joined the lobby.`);
  socketToGame[socket.id] = gameId;
  socket.join(gameId);

  broadcastState(gameId);
}

function handleAddBot(socket: Socket, difficulty: 'easy' | 'hard') {
  const gameId = socketToGame[socket.id];
  const game = games[gameId];
  if (!game || game.status !== 'LOBBY' || game.players.length >= 4) return;

  const botNum = game.players.filter(p => p.isBot).length + 1;
  const botPlayer: Player = {
    id: `bot-${Math.random().toString(36).substring(2, 6)}`,
    name: `${difficulty === 'easy' ? 'Easy' : 'Hard'} Bot ${botNum}`,
    color: PLAYER_COLORS[game.players.length],
    isBot: true,
    botDifficulty: difficulty,
    score: 0,
    castles: { 1: 0, 2: 0, 3: 0, 4: 0 },
    secretTile: null
  };

  game.players.push(botPlayer);
  game.gameLog.push(`${botPlayer.name} added to the lobby.`);
  broadcastState(gameId);
}

function handleStartGame(socket: Socket) {
  const gameId = socketToGame[socket.id];
  const game = games[gameId];
  if (!game || game.status !== 'LOBBY' || game.players.length < 2) return;

  // Shuffle player order
  game.players = shuffleArray(game.players);
  // Recolor according to order
  game.players.forEach((p, idx) => { p.color = PLAYER_COLORS[idx]; });

  setupEpoch(game, 1);
  game.status = 'PLAYING';
  game.gameLog.push('Game started! Epoch 1 begins.');

  broadcastState(gameId);
  triggerBotTurn(gameId);
}

function handleDrawTile(socket: Socket) {
  const gameId = socketToGame[socket.id];
  const game = games[gameId];
  if (!isPlayerTurn(game, socket.id) || game.currentTurnTile) return;

  if (game.tileBag.length === 0) return socket.emit('error_msg', 'Tile bag is empty!');

  const tile = game.tileBag.pop()!;
  game.currentTurnTile = tile;
  const activePlayer = game.players[game.activePlayerIndex];
  game.gameLog.push(`${activePlayer.name} drew a tile.`);

  broadcastState(gameId);
}

function handlePlaceDrawnTile(socket: Socket, r: number, c: number) {
  const gameId = socketToGame[socket.id];
  const game = games[gameId];
  if (!isPlayerTurn(game, socket.id) || !game.currentTurnTile) return;
  if (game.board[r][c].type !== 'empty') return;

  const tile = game.currentTurnTile;
  game.board[r][c] = { type: 'tile', tile };
  game.currentTurnTile = null;

  const activePlayer = game.players[game.activePlayerIndex];
  game.gameLog.push(`${activePlayer.name} placed a ${formatTileName(tile)} at [${r + 1}, ${c + 1}].`);

  advanceTurn(game);
  broadcastState(gameId);
  triggerBotTurn(gameId);
}

function handlePlaceSecretTile(socket: Socket, r: number, c: number) {
  const gameId = socketToGame[socket.id];
  const game = games[gameId];
  if (!isPlayerTurn(game, socket.id) || game.currentTurnTile) return;
  if (game.board[r][c].type !== 'empty') return;

  const activePlayer = game.players[game.activePlayerIndex];
  if (!activePlayer.secretTile) return;

  const tile = activePlayer.secretTile;
  game.board[r][c] = { type: 'tile', tile };
  game.gameLog.push(`${activePlayer.name} placed their secret tile.`);

  // Draw replacement
  activePlayer.secretTile = game.tileBag.length > 0 ? game.tileBag.pop()! : null;

  advanceTurn(game);
  broadcastState(gameId);
  triggerBotTurn(gameId);
}

function handlePlaceCastle(socket: Socket, rank: number, r: number, c: number) {
  const gameId = socketToGame[socket.id];
  const game = games[gameId];
  if (!isPlayerTurn(game, socket.id) || game.currentTurnTile) return;
  if (game.board[r][c].type !== 'empty') return;

  const activePlayer = game.players[game.activePlayerIndex];
  const castlesLeft = activePlayer.castles[rank as keyof typeof activePlayer.castles];
  if (!castlesLeft || castlesLeft <= 0) return;

  activePlayer.castles[rank as keyof typeof activePlayer.castles]--;
  game.board[r][c] = { type: 'castle', castle: { playerId: activePlayer.id, rank } };
  game.gameLog.push(`${activePlayer.name} placed a Rank ${rank} castle at [${r + 1}, ${c + 1}].`);

  advanceTurn(game);
  broadcastState(gameId);
  triggerBotTurn(gameId);
}

function handleDisconnect(socket: Socket) {
  const gameId = socketToGame[socket.id];
  if (!gameId) return;

  const game = games[gameId];
  if (!game) return;

  delete socketToGame[socket.id];

  if (game.status === 'LOBBY') {
    game.players = game.players.filter(p => p.id !== socket.id);
    if (game.players.length === 0) {
      delete games[gameId];
    } else {
      broadcastState(gameId);
    }
  }
}

function isPlayerTurn(game: GameState | undefined, socketId: string): boolean {
  if (!game || game.status !== 'PLAYING') return false;
  const activePlayer = game.players[game.activePlayerIndex];
  return activePlayer.id === socketId;
}

function advanceTurn(game: GameState) {
  if (isBoardFull(game.board)) {
    endEpoch(game);
    return;
  }

  // Check if anyone can make a move. If not, end epoch
  let anyMovesPossible = false;
  for (const p of game.players) {
    const hasCastles = Object.values(p.castles).some(count => count > 0);
    const hasSecret = !!p.secretTile;
    const canDraw = game.tileBag.length > 0;
    if (hasCastles || hasSecret || canDraw) {
      anyMovesPossible = true;
      break;
    }
  }

  if (!anyMovesPossible) {
    endEpoch(game);
    return;
  }

  game.activePlayerIndex = (game.activePlayerIndex + 1) % game.players.length;
}

function setupEpoch(game: GameState, epoch: number) {
  game.epoch = epoch;
  game.board = createInitialBoard();
  game.tileBag = createTileBag();
  game.currentTurnTile = null;

  // Set up castles
  const startingCastles = getStartingCastles(game.players.length);
  game.players.forEach(p => {
    if (epoch === 1) {
      p.castles = { ...startingCastles };
    } else {
      // Return Rank 1 castles
      p.castles[1] = startingCastles[1];
    }
    // Deal secret tile
    p.secretTile = game.tileBag.pop()!;
  });
}

function endEpoch(game: GameState) {
  const pIds = game.players.map(p => p.id);
  const report = calculateScoreReport(game.board, pIds);

  game.players.forEach(p => {
    const earned = report.epochScores[p.id] || 0;
    p.score += earned;
    game.gameLog.push(`${p.name} earned ${earned} gold in Epoch ${game.epoch}. Total: ${p.score}.`);
  });

  if (game.epoch >= 3) {
    game.status = 'FINISHED';
    const sorted = [...game.players].sort((a, b) => b.score - a.score);
    game.winnerId = sorted[0].id;
    game.gameLog.push(`Game Over! ${sorted[0].name} wins with ${sorted[0].score} gold!`);
  } else {
    game.gameLog.push(`Epoch ${game.epoch} completed!`);
    setupEpoch(game, game.epoch + 1);
    game.gameLog.push(`Epoch ${game.epoch} starts.`);
  }
}

function triggerBotTurn(gameId: string) {
  const game = games[gameId];
  if (!game || game.status !== 'PLAYING') return;

  const activePlayer = game.players[game.activePlayerIndex];
  if (!activePlayer.isBot) return;

  // Add random turn delay for natural game speed (800ms to 1500ms)
  const delay = 800 + Math.floor(Math.random() * 700);
  setTimeout(() => {
    executeBotAction(gameId, activePlayer.id);
  }, delay);
}

function executeBotAction(gameId: string, botId: string) {
  const game = games[gameId];
  if (!game || game.status !== 'PLAYING') return;

  const activePlayer = game.players[game.activePlayerIndex];
  if (activePlayer.id !== botId) return; // Verify turn state hasn't changed

  const decision = makeBotMove(game, botId);
  if (!decision) {
    // Force pass/advance
    advanceTurn(game);
    broadcastState(gameId);
    triggerBotTurn(gameId);
    return;
  }

  processBotDecision(game, activePlayer, decision, gameId);
}

function processBotDecision(game: GameState, bot: Player, decision: any, gameId: string) {
  if (decision.action === 'draw_tile') {
    game.currentTurnTile = game.tileBag.pop()!;
    game.gameLog.push(`${bot.name} drew a tile.`);
    broadcastState(gameId);

    // Schedule placement after another 1000ms so humans can see what was drawn
    setTimeout(() => {
      executeBotAction(gameId, bot.id);
    }, 1000);
  } else if (decision.action === 'place_drawn_tile') {
    const tile = game.currentTurnTile!;
    game.board[decision.r][decision.c] = { type: 'tile', tile };
    game.currentTurnTile = null;
    game.gameLog.push(`${bot.name} placed a ${formatTileName(tile)} at [${decision.r + 1}, ${decision.c + 1}].`);
    finalizeBotMove(game, gameId);
  } else if (decision.action === 'place_secret_tile') {
    const tile = bot.secretTile!;
    game.board[decision.r][decision.c] = { type: 'tile', tile };
    bot.secretTile = game.tileBag.length > 0 ? game.tileBag.pop()! : null;
    game.gameLog.push(`${bot.name} placed their secret tile.`);
    finalizeBotMove(game, gameId);
  } else if (decision.action === 'place_castle') {
    bot.castles[decision.rank as keyof typeof bot.castles]--;
    game.board[decision.r][decision.c] = { type: 'castle', castle: { playerId: bot.id, rank: decision.rank } };
    game.gameLog.push(`${bot.name} placed a Rank ${decision.rank} castle at [${decision.r + 1}, ${decision.c + 1}].`);
    finalizeBotMove(game, gameId);
  }
}

function finalizeBotMove(game: GameState, gameId: string) {
  advanceTurn(game);
  broadcastState(gameId);
  triggerBotTurn(gameId);
}

function sanitizeStateForPlayer(state: GameState, socketId: string): GameState {
  // Hide other players' secret tiles
  const sanitizedPlayers = state.players.map(p => {
    if (p.id === socketId || p.isBot) {
      return p;
    }
    return { ...p, secretTile: null };
  });

  return {
    ...state,
    players: sanitizedPlayers,
    tileBag: new Array(state.tileBag.length).fill({ type: 'resource', value: 0 }) // Hide bag tiles
  };
}

function broadcastState(gameId: string) {
  const game = games[gameId];
  if (!game) return;

  game.players.forEach(p => {
    if (!p.isBot) {
      io.to(p.id).emit('game_state', sanitizeStateForPlayer(game, p.id));
    }
  });
}

function formatTileName(tile: TileType): string {
  if (tile.type === 'resource') return `+${tile.value} Resource`;
  if (tile.type === 'hazard') return `${tile.value} Hazard`;
  return tile.type.charAt(0).toUpperCase() + tile.type.slice(1);
}

function shuffleArray<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
