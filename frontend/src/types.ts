export type TileType = 
  | { type: 'resource'; value: number }
  | { type: 'hazard'; value: number }
  | { type: 'dragon' }
  | { type: 'mountain' }
  | { type: 'goldmine' }
  | { type: 'wizard' };

export interface Castle {
  playerId: string;
  rank: number; // 1, 2, 3, or 4
}

export type BoardCell = 
  | { type: 'empty' }
  | { type: 'tile'; tile: TileType }
  | { type: 'castle'; castle: Castle };

export interface PlayerCastles {
  1: number;
  2: number;
  3: number;
  4: number;
}

export interface Player {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  botDifficulty?: 'easy' | 'hard';
  score: number;
  castles: PlayerCastles;
  secretTile: TileType | null;
}

export interface GameState {
  gameId: string;
  players: Player[];
  activePlayerIndex: number;
  epoch: number; // 1, 2, or 3
  board: BoardCell[][]; // 5 rows x 6 columns
  tileBag: TileType[]; // Shuffled tiles remaining in bag (or mock empty array for other players)
  gameLog: string[];
  status: 'LOBBY' | 'PLAYING' | 'FINISHED';
  currentTurnTile: TileType | null;
  winnerId: string | null;
}
