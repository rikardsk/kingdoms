import { TileType, BoardCell, Player, PlayerCastles, GameState, Castle } from './types';

// Premium player colors
export const PLAYER_COLORS = ['#ff4757', '#2ed573', '#1e90ff', '#ffa502'];

export function createInitialBoard(): BoardCell[][] {
  const board: BoardCell[][] = [];
  for (let r = 0; r < 5; r++) {
    const row: BoardCell[] = [];
    for (let c = 0; c < 6; c++) {
      row.push({ type: 'empty' });
    }
    board.push(row);
  }
  return board;
}

export function createTileBag(): TileType[] {
  const bag: TileType[] = [];
  
  // Resource tiles
  const resources = [
    { val: 1, qty: 2 },
    { val: 2, qty: 3 },
    { val: 3, qty: 3 },
    { val: 4, qty: 2 },
    { val: 5, qty: 1 },
    { val: 6, qty: 1 }
  ];
  resources.forEach(r => {
    for (let i = 0; i < r.qty; i++) {
      bag.push({ type: 'resource', value: r.val });
    }
  });

  // Hazard tiles
  const hazards = [
    { val: -1, qty: 1 },
    { val: -2, qty: 2 },
    { val: -3, qty: 2 },
    { val: -4, qty: 1 },
    { val: -5, qty: 1 },
    { val: -6, qty: 1 }
  ];
  hazards.forEach(h => {
    for (let i = 0; i < h.qty; i++) {
      bag.push({ type: 'hazard', value: h.val });
    }
  });

  // Special tiles
  bag.push({ type: 'dragon' });
  bag.push({ type: 'mountain' });
  bag.push({ type: 'mountain' });
  bag.push({ type: 'goldmine' });
  bag.push({ type: 'wizard' });

  return shuffle(bag);
}

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getStartingCastles(playerCount: number): PlayerCastles {
  if (playerCount === 2) {
    return { 1: 4, 2: 3, 3: 2, 4: 1 };
  }
  if (playerCount === 3) {
    return { 1: 3, 2: 2, 3: 2, 4: 1 };
  }
  // 4 players
  return { 1: 2, 2: 2, 3: 1, 4: 1 };
}

export function getEffectiveCastleRank(board: BoardCell[][], r: number, c: number, baseRank: number): number {
  let bonus = 0;
  const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of dirs) {
    const nr = r + dr;
    const nc = c + dc;
    if (nr >= 0 && nr < 5 && nc >= 0 && nc < 6) {
      const neighbor = board[nr][nc];
      if (neighbor.type === 'tile' && neighbor.tile.type === 'wizard') {
        bonus += 1;
      }
    }
  }
  return baseRank + bonus;
}

export interface Segment {
  startIndex: number;
  endIndex: number;
  tiles: TileType[];
  castles: { playerId: string; rank: number; effectiveRank: number; r: number; c: number }[];
  hasDragon: boolean;
  hasGoldMine: boolean;
  sum: number;
}

export interface LineScoreBreakdown {
  index: number;
  type: 'row' | 'col';
  segments: Segment[];
}

export function getRowSegments(board: BoardCell[][], r: number): Segment[] {
  const segments: Segment[] = [];
  let currentSegment: Omit<Segment, 'sum'> = {
    startIndex: 0,
    endIndex: -1,
    tiles: [],
    castles: [],
    hasDragon: false,
    hasGoldMine: false
  };

  for (let c = 0; c < 6; c++) {
    const cell = board[r][c];
    if (cell.type === 'tile' && cell.tile.type === 'mountain') {
      if (c > currentSegment.startIndex) {
        currentSegment.endIndex = c - 1;
        segments.push(finalizeSegment(board, currentSegment));
      }
      currentSegment = { startIndex: c + 1, endIndex: -1, tiles: [], castles: [], hasDragon: false, hasGoldMine: false };
      continue;
    }
    addCellToSegment(cell, currentSegment, r, c);
  }
  currentSegment.endIndex = 5;
  segments.push(finalizeSegment(board, currentSegment));
  return segments;
}

export function getColSegments(board: BoardCell[][], c: number): Segment[] {
  const segments: Segment[] = [];
  let currentSegment: Omit<Segment, 'sum'> = {
    startIndex: 0,
    endIndex: -1,
    tiles: [],
    castles: [],
    hasDragon: false,
    hasGoldMine: false
  };

  for (let r = 0; r < 5; r++) {
    const cell = board[r][c];
    if (cell.type === 'tile' && cell.tile.type === 'mountain') {
      if (r > currentSegment.startIndex) {
        currentSegment.endIndex = r - 1;
        segments.push(finalizeSegment(board, currentSegment));
      }
      currentSegment = { startIndex: r + 1, endIndex: -1, tiles: [], castles: [], hasDragon: false, hasGoldMine: false };
      continue;
    }
    addCellToSegment(cell, currentSegment, r, c);
  }
  currentSegment.endIndex = 4;
  segments.push(finalizeSegment(board, currentSegment));
  return segments;
}

function addCellToSegment(cell: BoardCell, seg: Omit<Segment, 'sum'>, r: number, c: number): void {
  if (cell.type === 'tile') {
    seg.tiles.push(cell.tile);
    if (cell.tile.type === 'dragon') seg.hasDragon = true;
    if (cell.tile.type === 'goldmine') seg.hasGoldMine = true;
  } else if (cell.type === 'castle') {
    seg.castles.push({
      playerId: cell.castle.playerId,
      rank: cell.castle.rank,
      effectiveRank: 0, // Calculated in finalize
      r,
      c
    });
  }
}

function finalizeSegment(board: BoardCell[][], seg: Omit<Segment, 'sum'>): Segment {
  // Update effective ranks
  const updatedCastles = seg.castles.map(cas => ({
    ...cas,
    effectiveRank: getEffectiveCastleRank(board, cas.r, cas.c, cas.rank)
  }));

  // Calculate sum
  let sum = 0;
  for (const tile of seg.tiles) {
    if (tile.type === 'resource') {
      sum += seg.hasDragon ? 0 : tile.value;
    } else if (tile.type === 'hazard') {
      sum += tile.value;
    }
  }

  if (seg.hasGoldMine) {
    sum *= 2;
  }

  return {
    ...seg,
    castles: updatedCastles,
    sum
  };
}

export interface ScoreReport {
  epochScores: Record<string, number>;
  breakdowns: LineScoreBreakdown[];
}

export function calculateScoreReport(board: BoardCell[][], playerIds: string[]): ScoreReport {
  const epochScores: Record<string, number> = {};
  playerIds.forEach(id => { epochScores[id] = 0; });
  const breakdowns: LineScoreBreakdown[] = [];

  // Score rows
  for (let r = 0; r < 5; r++) {
    const rowSegs = getRowSegments(board, r);
    breakdowns.push({ index: r, type: 'row', segments: rowSegs });
    rowSegs.forEach(seg => {
      seg.castles.forEach(cas => {
        epochScores[cas.playerId] += seg.sum * cas.effectiveRank;
      });
    });
  }

  // Score columns
  for (let c = 0; c < 6; c++) {
    const colSegs = getColSegments(board, c);
    breakdowns.push({ index: c, type: 'col', segments: colSegs });
    colSegs.forEach(seg => {
      seg.castles.forEach(cas => {
        epochScores[cas.playerId] += seg.sum * cas.effectiveRank;
      });
    });
  }

  return { epochScores, breakdowns };
}

export function isBoardFull(board: BoardCell[][]): boolean {
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 6; c++) {
      if (board[r][c].type === 'empty') {
        return false;
      }
    }
  }
  return true;
}
