# Implementation Plan - Kingdoms Web Board Game

Create a web-based, multiplayer and solo implementation of Reiner Knizia's board game **Kingdoms** with a responsive React (TypeScript) frontend and a Node.js + Socket.io backend.

---

## Technical Decisions
1. **Styling:** Standard CSS (with custom CSS variables, flexbox/grid, and transitions for premium visuals).
2. **Bot Game Loop:** Bots will execute moves with a randomized delay of 800ms–1500ms to allow human players to follow the gameplay visually.

---

## Proposed Changes

We will organize the project in a single repository with two subdirectories:
*   `/backend` - TypeScript Node.js server using Express and Socket.io.
*   `/frontend` - React + TypeScript application built with Vite.

---

### Backend Component

We will create a Node.js server that manages game sessions, validates moves, and runs the bot logic.

#### [NEW] [package.json](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/backend/package.json)
- Define dependencies: `express`, `socket.io`, `typescript`, `ts-node-dev`, `cors`, `@types/express`, `@types/node`, `@types/cors`.

#### [NEW] [tsconfig.json](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/backend/tsconfig.json)
- TypeScript configuration for the backend.

#### [NEW] [types.ts](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/backend/src/types.ts)
- Common types shared between server, client, and bots (e.g., `GameState`, `Player`, `Tile`, `BoardCell`).

#### [NEW] [game.ts](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/backend/src/game.ts)
- Pure function game mechanics: scoring calculations, tile bag setup, move validation, epoch resets, and board population check.

#### [NEW] [bot.ts](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/backend/src/bot.ts)
- AI bot implementation. Evaluates board spaces to choose the best available move (easy/hard heuristic decision-making).

#### [NEW] [server.ts](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/backend/src/server.ts)
- Express server and Socket.io event handlers. Manages active lobbies and triggers bot moves when it is a bot's turn.

---

### Frontend Component

We will create a React + TypeScript application with a premium theme, interactive grid board, and live score recalculations.

#### [NEW] [package.json](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/frontend/package.json)
- Define dependencies: `react`, `react-dom`, `socket.io-client`, `lucide-react`.

#### [NEW] [vite.config.ts](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/frontend/vite.config.ts)
- Vite configuration with local server proxy rules.

#### [NEW] [App.tsx](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/frontend/src/App.tsx)
- Root container. Manages application screens (Lobby Screen vs. Game Board Screen).

#### [NEW] [index.css](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/frontend/src/index.css)
- Core design system: layout, typography (Inter/Outfit), dark mode palette, custom animations (tile drawing, score popups).

#### [NEW] [GameBoard.tsx](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/frontend/src/components/GameBoard.tsx)
- Responsive $5 \times 6$ interactive board. Renders current tile states, castle ranks, mountain barriers, and row/column score summaries.

#### [NEW] [Lobby.tsx](file:///c:/Users/rikar/OneDrive/Skrivbord/Kingdoms/frontend/src/components/Lobby.tsx)
- Interface to create/join lobbies, select player count, add bots, and set nicknames.

---

## Verification Plan

### Automated Tests
- Run validation tests for core scoring rules (multipliers, dragons, mountains, wizards).
- Verify server-side action validation (e.g. check that players cannot place a castle rank they don't have).

### Manual Verification
1. Open multiple browser tabs (simulating multiple human players) to verify WebSocket lobby connections and state syncing.
2. Play a full 3-epoch solo game against Easy and Hard bots to verify AI logic, epoch transitions, castle returns, and final score calculations.
