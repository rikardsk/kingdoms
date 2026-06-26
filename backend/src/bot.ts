import { GameState, TileType, BoardCell, Player, Castle } from './types';
import { 
  calculateScoreReport, 
  getEffectiveCastleRank, 
  getRowSegments, 
  getColSegments 
} from './game';

interface BotMove {
  action: 'draw_tile' | 'place_secret_tile' | 'place_castle' | 'place_drawn_tile';
  rank?: number;
  r: number;
  c: number;
  score: number;
}

// Check adjacent cells for wizards to apply to castle rank
function getTempEffectiveRank(board: BoardCell[][], r: number, c: number, rank: number): number {
  return getEffectiveCastleRank(board, r, c, rank);
}

// Evaluate putting a castle on the board
function evaluateCastlePlacement(
  board: BoardCell[][], 
  r: number, 
  c: number, 
  rank: number, 
  botId: string, 
  players: Player[]
): number {
  // Check net row and column values
  const rowSegs = getRowSegments(board, r);
  const colSegs = getColSegments(board, c);
  
  // Find which segment this cell would fall into
  const rowSeg = rowSegs.find(s => c >= s.startIndex && c <= s.endIndex);
  const colSeg = colSegs.find(s => r >= s.startIndex && r <= s.endIndex);

  const rowVal = rowSeg ? rowSeg.sum : 0;
  const colVal = colSeg ? colSeg.sum : 0;
  const effRank = getTempEffectiveRank(board, r, c, rank);

  return (rowVal + colVal) * effRank;
}

// Evaluates a tile placement based on existing castles and future potential
export function evaluateTilePlacement(
  board: BoardCell[][],
  r: number,
  c: number,
  tile: TileType,
  botId: string,
  players: Player[]
): number {
  let score = 0;
  const rowSegs = getRowSegments(board, r);
  const colSegs = getColSegments(board, c);
  const rowSeg = rowSegs.find(s => c >= s.startIndex && c <= s.endIndex);
  const colSeg = colSegs.find(s => r >= s.startIndex && r <= s.endIndex);

  if (tile.type === 'resource' || tile.type === 'hazard') {
    const val = tile.value;
    score += evaluateTileImpactOnSegment(rowSeg, val, botId);
    score += evaluateTileImpactOnSegment(colSeg, val, botId);
  } else if (tile.type === 'dragon') {
    score += evaluateDragonImpact(rowSeg, botId);
    score += evaluateDragonImpact(colSeg, botId);
  } else if (tile.type === 'goldmine') {
    score += evaluateGoldMineImpact(rowSeg, botId);
    score += evaluateGoldMineImpact(colSeg, botId);
  } else if (tile.type === 'wizard') {
    score += evaluateWizardImpact(board, r, c, botId);
  } else if (tile.type === 'mountain') {
    score += evaluateMountainImpact(board, r, c, botId, players);
  }

  return score;
}

function evaluateTileImpactOnSegment(seg: any, val: number, botId: string): number {
  if (!seg) return 0;
  let score = 0;
  
  // If there are castles in this segment
  if (seg.castles.length > 0) {
    for (const cas of seg.castles) {
      const mult = cas.effectiveRank;
      if (cas.playerId === botId) {
        score += val * mult;
      } else {
        score -= val * mult;
      }
    }
    return score;
  }

  // No castles: small positional potential
  return val > 0 ? 0.5 : -0.5;
}

function evaluateDragonImpact(seg: any, botId: string): number {
  if (!seg) return 0;
  let score = 0;
  const posSum = seg.tiles
    .filter((t: TileType) => t.type === 'resource')
    .reduce((acc: number, t: any) => acc + t.value, 0);

  for (const cas of seg.castles) {
    const penalty = posSum * cas.effectiveRank;
    if (cas.playerId === botId) {
      score -= penalty;
    } else {
      score += penalty; // Hurts opponent, which is good
    }
  }
  return score;
}

function evaluateGoldMineImpact(seg: any, botId: string): number {
  if (!seg) return 0;
  let score = 0;
  const currentSum = seg.sum; // Segment sum before gold mine

  for (const cas of seg.castles) {
    const delta = currentSum * cas.effectiveRank;
    if (cas.playerId === botId) {
      score += delta; // Doubles bot score (could be negative if currentSum is negative)
    } else {
      score -= delta; // Doubles opponent score (helps bot if opponent loses more)
    }
  }
  return score;
}

function evaluateWizardImpact(board: BoardCell[][], r: number, c: number, botId: string): number {
  let score = 0;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 6) {
      const cell = board[nr][nc];
      if (cell.type === 'castle') {
        const rowSegs = getRowSegments(board, nr);
        const colSegs = getColSegments(board, nc);
        const rowSeg = rowSegs.find(s => nc >= s.startIndex && nc <= s.endIndex);
        const colSeg = colSegs.find(s => nr >= s.startIndex && s.endIndex >= nr);
        const netLineValue = (rowSeg?.sum || 0) + (colSeg?.sum || 0);

        if (cell.castle.playerId === botId) {
          score += netLineValue;
        } else {
          score -= netLineValue;
        }
      }
    }
  }
  return score;
}

function evaluateMountainImpact(board: BoardCell[][], r: number, c: number, botId: string, players: Player[]): number {
  // Full board evaluation before vs after
  const pIds = players.map(p => p.id);
  const before = calculateScoreReport(board, pIds);
  
  const tempBoard = board.map(row => row.map(cell => ({ ...cell })));
  tempBoard[r][c] = { type: 'tile', tile: { type: 'mountain' } };
  const after = calculateScoreReport(tempBoard, pIds);

  const botBefore = before.epochScores[botId] || 0;
  const botAfter = after.epochScores[botId] || 0;
  
  let oppBefore = 0;
  let oppAfter = 0;
  players.forEach(p => {
    if (p.id !== botId) {
      oppBefore += before.epochScores[p.id] || 0;
      oppAfter += after.epochScores[p.id] || 0;
    }
  });

  return (botAfter - botBefore) - (oppAfter - oppBefore) / Math.max(1, players.length - 1);
}

// Get all possible empty spaces on board
function getEmptyCells(board: BoardCell[][]): { r: number, c: number }[] {
  const cells: { r: number, c: number }[] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      if (board[r][c].type === 'empty') {
        cells.push({ r, c });
      }
    }
  }
  return cells;
}

// Finds the absolute best tile placement on the board
export function getBestTilePlacement(
  board: BoardCell[][],
  tile: TileType,
  botId: string,
  players: Player[]
): { r: number; c: number; score: number } {
  const empty = getEmptyCells(board);
  if (empty.length === 0) return { r: 0, c: 0, score: -9999 };

  let bestMove = { r: empty[0].r, c: empty[0].c, score: -9999 };
  for (const cell of empty) {
    const score = evaluateTilePlacement(board, cell.r, cell.c, tile, botId, players);
    if (score > bestMove.score) {
      bestMove = { r: cell.r, c: cell.c, score };
    }
  }
  return bestMove;
}

// Find best placement for available castles
function getBestCastlePlacement(
  board: BoardCell[][],
  player: Player,
  players: Player[]
): BotMove | null {
  const empty = getEmptyCells(board);
  const ranks = [4, 3, 2, 1].filter(rank => player.castles[rank as keyof typeof player.castles] > 0);
  if (empty.length === 0 || ranks.length === 0) return null;

  let best: BotMove = { action: 'place_castle', rank: ranks[0], r: empty[0].r, c: empty[0].c, score: -9999 };
  for (const rank of ranks) {
    for (const cell of empty) {
      const score = evaluateCastlePlacement(board, cell.r, cell.c, rank, player.id, players);
      if (score > best.score) {
        best = { action: 'place_castle', rank, r: cell.r, c: cell.c, score };
      }
    }
  }
  return best;
}

// Core Bot logic to decide the next move
export function makeBotMove(gameState: GameState, botId: string): any {
  const player = gameState.players.find(p => p.id === botId);
  if (!player) return null;

  const difficulty = player.botDifficulty || 'easy';

  // If bot drew a tile and MUST place it
  if (gameState.currentTurnTile) {
    const bestPlacement = getBestTilePlacement(gameState.board, gameState.currentTurnTile, botId, gameState.players);
    if (difficulty === 'easy' && Math.random() < 0.3) {
      const empty = getEmptyCells(gameState.board);
      const rand = empty[Math.floor(Math.random() * empty.length)];
      return { action: 'place_drawn_tile', r: rand.r, c: rand.c };
    }
    return { action: 'place_drawn_tile', r: bestPlacement.r, c: bestPlacement.c };
  }

  return decideInitialAction(gameState, player, difficulty);
}

function decideInitialAction(gameState: GameState, player: Player, difficulty: 'easy' | 'hard'): any {
  const botId = player.id;
  const empty = getEmptyCells(gameState.board);

  // Easy bot random action
  if (difficulty === 'easy' && Math.random() < 0.35) {
    return makeRandomInitialAction(player, empty);
  }

  // 1. Evaluate Castle Placements
  const bestCastle = getBestCastlePlacement(gameState.board, player, gameState.players);

  // 2. Evaluate Secret Tile Placement (if present)
  let bestSecret: BotMove | null = null;
  if (player.secretTile) {
    const tilePlace = getBestTilePlacement(gameState.board, player.secretTile, botId, gameState.players);
    bestSecret = { action: 'place_secret_tile', r: tilePlace.r, c: tilePlace.c, score: tilePlace.score };
  }

  // Deciding logic:
  // - If we have a castle placement with high payoff (e.g. > 10 points), build it!
  // - If we have a secret tile placement with decent payoff (e.g. > 6 points), play it!
  // - Otherwise, draw a tile.
  if (bestCastle && bestCastle.score >= 12) {
    return { action: 'place_castle', rank: bestCastle.rank, r: bestCastle.r, c: bestCastle.c };
  }
  if (bestSecret && bestSecret.score >= 8) {
    return { action: 'place_secret_tile', r: bestSecret.r, c: bestSecret.c };
  }

  // Default to drawing a tile if bag is not empty, otherwise force castle or secret
  if (gameState.tileBag.length > 0) {
    return { action: 'draw_tile' };
  }
  if (bestSecret) {
    return { action: 'place_secret_tile', r: bestSecret.r, c: bestSecret.c };
  }
  if (bestCastle) {
    return { action: 'place_castle', rank: bestCastle.rank, r: bestCastle.r, c: bestCastle.c };
  }

  // No options left
  return null;
}

function makeRandomInitialAction(player: Player, empty: { r: number, c: number }[]): any {
  const options: string[] = [];
  if (empty.length > 0) {
    const ranks = [1, 2, 3, 4].filter(r => player.castles[r as keyof typeof player.castles] > 0);
    if (ranks.length > 0) options.push('castle');
    if (player.secretTile) options.push('secret');
    options.push('draw');
  }

  const choice = options[Math.floor(Math.random() * options.length)];
  const randCell = empty[Math.floor(Math.random() * empty.length)];

  if (choice === 'castle') {
    const ranks = [1, 2, 3, 4].filter(r => player.castles[r as keyof typeof player.castles] > 0);
    const randRank = ranks[Math.floor(Math.random() * ranks.length)];
    return { action: 'place_castle', rank: randRank, r: randCell.r, c: randCell.c };
  }
  if (choice === 'secret') {
    return { action: 'place_secret_tile', r: randCell.r, c: randCell.c };
  }
  return { action: 'draw_tile' };
}
