# Kingdoms Game Mechanics

Summary of the core mechanics for Reiner Knizia's board game **Kingdoms** (originally published as *Auf Heller und Pfennig*).

## Objective
Players compete over **three epochs (rounds)** to amass the most gold. Gold is earned by placing castles in high-value rows and columns on a grid, while avoiding hazardous tiles.

---

## Components & Setup
*   **The Grid:** A $5 \times 6$ board representing the kingdom.
*   **Castles:** Each player has a set of castles of varying ranks:
    *   Rank 1 (1 tower) — *Returned to the player's pool at the end of each epoch.*
    *   Rank 2 (2 towers), Rank 3 (3 towers), Rank 4 (4 towers) — *Discarded/spent after being played and cannot be reused in subsequent epochs.*
*   **Tiles:** A shared draw-bag of tiles containing resources (positive values $+1$ to $+6$), hazards (negative values $-1$ to $-6$), and special tiles.
*   **Starting Hand:** Each player begins the game with their set of castles and one face-down "secret" tile drawn from the bag.

---

## Turn Actions
On your turn, you must perform exactly **one** of the following three actions:
1.  **Draw and Place a Tile:** Draw a random tile from the bag and place it face-up on any empty space on the grid.
2.  **Place Your Secret Tile:** Place your face-down secret tile onto any empty space on the grid, then draw a new tile to replace it.
3.  **Place a Castle:** Place one of your available castles from your pool onto any empty space on the grid.

---

## Special Tiles
*   **Dragon:** Negates all positive resource tiles in its row and column (hazards still apply).
*   **Mountain:** Blocks scoring by splitting its row and column into two separate segments that are scored independently.
*   **Gold Mine:** Doubles the final net score of its row and column.
*   **Wizard:** Boosts the rank of all orthogonally adjacent castles by $+1$.

---

## Scoring & Epoch End
An epoch ends immediately when the entire $5 \times 6$ grid is filled. 

1.  **Calculate Net Line Value:** For each of the 5 rows and 6 columns, calculate the sum of all tiles in that line (accounting for Gold Mines, Dragons, and Mountains).
2.  **Apply Multipliers:** For each player's castle in a line:
    $$\text{Points Earned} = \text{Net Line Value} \times \text{Castle Rank}$$
    *Note: Since every castle is at the intersection of a row and a column, it scores twice (once for its row, once for its column).*
3.  **End of Epoch Reset:** 
    *   Players collect gold coins equal to their score (or pay if their score is negative).
    *   All tiles and all castles on the board are cleared.
    *   Rank 1 castles return to their owners. Castles of Rank 2, 3, and 4 are permanently discarded.
    *   The board is cleared, and the next epoch begins.

The player with the most gold at the end of the third epoch wins.
