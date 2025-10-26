const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const { recordWin, getLeaderboard, recordCompletedGame } = require("./db");

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let waitingPlayer = null;
let games = {};
let gameIdCounter = 1;

// Create empty 7x6 board
function createEmptyBoard() {
  const rows = 6, cols = 7;
  return Array(rows).fill(null).map(() => Array(cols).fill(null));
}

// Return {result, cells: winningCells or []}
function checkGameResult(board, player) {
  const rows = board.length, cols = board[0].length;
  const directions = [
    { dr: 0, dc: 1 },  // Horizontal
    { dr: 1, dc: 0 },  // Vertical
    { dr: 1, dc: 1 },  // Diagonal \
    { dr: -1, dc: 1 }, // Diagonal /
  ];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== player) continue;
      for (const { dr, dc } of directions) {
        let cells = [[r, c]];
        for (let k = 1; k < 4; k++) {
          const nr = r + dr * k, nc = c + dc * k;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || board[nr][nc] !== player) break;
          cells.push([nr, nc]);
        }
        if (cells.length === 4) return { result: "win", cells };
      }
    }
  }
  if (board.every(row => row.every(cell => cell))) return { result: "draw", cells: [] };
  return { result: "ongoing", cells: [] };
}

function canWinNext(board, col, player) {
  const temp = board.map(r => [...r]);
  for (let r = temp.length - 1; r >= 0; r--) {
    if (!temp[r][col]) {
      temp[r][col] = player;
      const { result } = checkGameResult(temp, player);
      return result === "win";
    }
  }
  return false;
}

function availableColumns(board) {
  const cols = [];
  for (let c = 0; c < 7; c++) if (board[0][c] === null) cols.push(c);
  return cols;
}

function startGame(p1, p2) {
  const id = gameIdCounter++;
  const board = createEmptyBoard();
  games[id] = {
    id, board,
    players: [p1, p2],
    usernames: [p1.username, p2 ? p2.username : null],
    currentPlayer: "R",
    disconnected: {},
    status: "active",
    winner: null,
    winCells: []
  };
  if (p1) p1.send(JSON.stringify({ type: "start", gameId: id, board, currentPlayer: "R", color: "R", opponent: p2?.username || "bot" }));
  if (p2) p2.send(JSON.stringify({ type: "start", gameId: id, board, currentPlayer: "R", color: "Y", opponent: p1.username }));
  if (!p2) setTimeout(() => botMove(id), 1000);
}

function botMove(id) {
  const game = games[id];
  if (!game || game.status !== "active") return;
  const { board } = game;
  const bot = "Y", human = "R";
  let chosen = null, cols = availableColumns(board);
  for (const c of cols) if (canWinNext(board, c, bot)) chosen = c;
  if (chosen === null) for (const c of cols) if (canWinNext(board, c, human)) chosen = c;
  if (chosen === null) chosen = cols.includes(3) ? 3 : cols[Math.floor(Math.random() * cols.length)];
  for (let r = board.length - 1; r >= 0; r--) {
    if (!board[r][chosen]) {
      board[r][chosen] = bot;
      const { result, cells } = checkGameResult(board, bot);
      if (result === "win" || result === "draw") {
        endGame(id, result === "win" ? "bot" : "draw", cells);
      }
      game.currentPlayer = "R";
      game.players[0]?.send(JSON.stringify({ type: "update", board, currentPlayer: game.currentPlayer, result, winner: result === "win" ? "bot" : null, winCells: cells }));
      break;
    }
  }
}

function endGame(id, winner, winCells = []) {
  const game = games[id];
  if (!game) return;
  game.status = "ended";
  game.winner = winner;
  game.winCells = winCells;
  console.log("ENDING GAME:", id, "WINNER:", winner);

  if (winner !== "bot" && winner !== "draw") {
    recordWin(winner).catch(console.error);
  }

  const player1 = game.usernames[0];
  const player2 = game.usernames[1] || "bot";
  recordCompletedGame(player1, player2, winner).catch(console.error);

  game.players.forEach(p => {
    if (p && p.readyState === p.OPEN) {
      p.send(JSON.stringify({ type: "game_over", winner, winCells }));
    }
  });

  setTimeout(() => { delete games[id]; }, 1000);
}

wss.on("connection", (ws) => {
  ws.on("message", (msg) => {
    const data = JSON.parse(msg);

    if (data.type === "join") {
      ws.username = data.username;
      let reconnected = false;
      for (const [id, game] of Object.entries(games)) {
        const idx = game.usernames.indexOf(ws.username);
        if (
          idx !== -1 &&
          game.status === "active" &&
          game.disconnected[ws.username] &&
          Date.now() - game.disconnected[ws.username] < 30000
        ) {
          game.players[idx] = ws;
          delete game.disconnected[ws.username];
          ws.send(JSON.stringify({
            type: "resume",
            gameId: id, board: game.board,
            currentPlayer: game.currentPlayer,
            result: "ongoing",
            color: idx === 0 ? "R" : "Y",
            opponent: game.usernames[idx === 0 ? 1 : 0] || "bot",
            winCells: game.winCells
          }));
          reconnected = true;
          break;
        }
      }
      if (reconnected) return;

      if (!waitingPlayer) {
        waitingPlayer = ws;
        setTimeout(() => {
          if (waitingPlayer === ws) {
            startGame(ws, null);
            waitingPlayer = null;
          }
        }, 10000);
      } else {
        startGame(waitingPlayer, ws);
        waitingPlayer = null;
      }
    }

    if (data.type === "move") {
      const game = games[data.gameId];
      if (!game || game.status !== "active") return;
      if (game.currentPlayer !== data.player) return;
      const { result: r1 } = checkGameResult(game.board, "R");
      const { result: r2 } = checkGameResult(game.board, "Y");
      if (["win", "draw"].includes(r1) || ["win", "draw"].includes(r2)) return;

      let placed = false, rowPlaced = -1;
      for (let r = game.board.length - 1; r >= 0; r--) {
        if (!game.board[r][data.colIndex]) {
          game.board[r][data.colIndex] = data.player;
          placed = true;
          rowPlaced = r;
          break;
        }
      }
      if (!placed) return;

      const { result, cells } = checkGameResult(game.board, data.player);
      if (result === "win") {
        const winner = data.player === "R" ? game.usernames[0] : game.usernames[1];
        game.players.forEach(p =>
          p?.send(JSON.stringify({
            type: "update", board: game.board, currentPlayer: game.currentPlayer,
            result, winner, winCells: cells
          }))
        );
        endGame(data.gameId, winner, cells);
        return;
      }
      if (result === "draw") {
        game.players.forEach(p =>
          p?.send(JSON.stringify({
            type: "update", board: game.board, currentPlayer: game.currentPlayer,
            result, winner: "draw", winCells: []
          }))
        );
        endGame(data.gameId, "draw");
        return;
      }

      game.currentPlayer = data.player === "R" ? "Y" : "R";
      game.players.forEach(p =>
        p?.send(JSON.stringify({
          type: "update", board: game.board,
          currentPlayer: game.currentPlayer, result, winCells: []
        }))
      );
      if (!game.players[1] && game.currentPlayer === "Y") setTimeout(() => botMove(data.gameId), 500);
    }
  });

  ws.on("close", () => {
    for (const [id, g] of Object.entries(games)) {
      const idx = g.players.indexOf(ws);
      if (idx !== -1 && g.status === "active") {
        g.disconnected[ws.username] = Date.now();
        setTimeout(() => {
          if (g.disconnected[ws.username] && g.status === "active") {
            const otherIdx = idx === 0 ? 1 : 0;
            const winner = g.usernames[otherIdx] || "bot";
            endGame(id, winner);
          }
        }, 30000);
      }
    }
  });
});

app.get("/leaderboard", async (req, res) => {
  try {
    const data = await getLeaderboard();
    res.json(data);
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server (HTTP + WS) running on port ${PORT}`));
