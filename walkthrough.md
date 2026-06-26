# Walkthrough - Kingdoms Board Game Implementation

I have successfully implemented a web-based, real-time multiplayer and solo-play version of Reiner Knizia's board game **Kingdoms**.

---

## 1. Project Structure

```
/backend
  ├── src/
  │    ├── types.ts      # Shared data models for board, players, and state
  │    ├── game.ts       # Pure rule logic: split lines by mountains, calculate dragon & goldmine, wizard adjacency
  │    ├── bot.ts        # AI heuristics for placing/drawing tiles and castles (Easy & Hard difficulties)
  │    └── server.ts     # Express server & Socket.io handlers managing game lobbies and turns
  ├── package.json
  └── tsconfig.json

/frontend
  ├── src/
  │    ├── components/
  │    │    ├── Lobby.tsx       # Player name input, lobby creation/joining, adding bots, host controls
  │    │    └── GameBoard.tsx   # Interactive 5x6 board, edge indicator sums, player deck, scoreboard, and logs
  │    ├── App.tsx              # Coordinator that establishes Socket.io connection and toggles screens
  │    ├── index.css            # Glassmorphism dark-theme styling, animations, tile coloring
  │    ├── main.tsx             # Entry point
  │    └── types.ts             # Client-side type definitions matching backend models
  ├── index.html
  ├── vite.config.ts
  └── package.json
```

---

## 2. Implemented Features

### **Real-time Lobby Sync**
*   Create a room with a random 6-character code.
*   Join a room using the code.
*   The lobby shows all connected human players with distinct colors.
*   Hosts can add **Easy** or **Hard** bots to fill remaining slots (up to 4 players total).

### **Core Game Loop & Turn Management**
*   **Initial Deck Setup:** Castles are dealt dynamically depending on the player count.
*   **Turn Actions:** Click to select a castle or your secret tile, then click a cell to place it. Or click "Draw Tile" from the bag.
*   **Status Indicators:** Prominent turn bars detailing what tiles you drew, when it's your turn, or who is currently thinking.
*   **Automatic Scoring Reports:** When the board is full, the server runs the scoring rules (handling mountains, dragons, gold mines, and wizard bonuses) and automatically tallies scores, starts the next epoch, and returns Rank-1 castles.

### **Polished Visuals & UI**
*   **Sleek Dark Mode:** Dark blue radial background paired with semi-transparent card panels.
*   **Interactive Hover Indicators:** Cells show a dashed glow when you are hovering with a tile/castle ready to place.
*   **Live Scoring Totals:** Badges at the margins of the board dynamically recalculate the net sum of each row and column segment, saving players from tedious math.
*   **Smooth Bot Simulation:** Bots execute their moves with a 800ms–1500ms delay. When a bot draws a tile, they wait another 1000ms before placing it, allowing human players to see what tile the bot drew.

---

## 3. How to Start and Verify

Both servers are configured and running in the background:
*   **Backend Server:** Running on port `3001`
*   **Frontend Server:** Running on `http://localhost:5174/`

### **Manual Verification Steps:**
1. Open your browser and navigate to `http://localhost:5174/`.
2. Enter your nickname and click **Create Room**.
3. Under the player list, click **Add Easy Bot** or **Add Hard Bot** to fill the lobby.
4. Click **Start Kingdoms Game**.
5. Observe the bot actions, try placing your castles, draw resource/hazard tiles, and watch the edge indicators update automatically in real-time.
