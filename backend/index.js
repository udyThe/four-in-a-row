const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8080 });

// Waiting player queue
let waitingPlayer = null;

// Active games: { gameId: { board, players, currentPlayer, disconnected } }
let games = {};
let gameIdCounter = 1;

// Create empty 7x6 board
function createEmptyBoard() {
  const rows = 6;
  const cols = 7;
  return Array(rows).fill(null).map(() => Array(cols).fill(null));
}

// Check if player has won or draw
function checkGameResult(board, player) {
  const rows = board.length;
  const cols = board[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (board[r][c] !== player) continue;

      // Horizontal
      if (
        c + 3 < cols &&
        board[r][c + 1] === player &&
        board[r][c + 2] === player &&
        board[r][c + 3] === player
      )
        return "win";

      // Vertical
      if (
        r + 3 < rows &&
        board[r + 1][c] === player &&
        board[r + 2][c] === player &&
        board[r + 3][c] === player
      )
        return "win";

      // Diagonal /
      if (
        r - 3 >= 0 &&
        c + 3 < cols &&
        board[r - 1][c + 1] === player &&
        board[r - 2][c + 2] === player &&
        board[r - 3][c + 3] === player
      )
        return "win";

      // Diagonal \
      if (
        r + 3 < rows &&
        c + 3 < cols &&
        board[r + 1][c + 1] === player &&
        board[r + 2][c + 2] === player &&
        board[r + 3][c + 3] === player
      )
        return "win";
    }
  }

  if (board.every((row) => row.every((cell) => cell))) return "draw";
  return "ongoing";
}

// Check if placing a disc in column results in a win for given player
function canWinNext(board, col, player) {
  const tempBoard = board.map((row) => [...row]);
  for (let row = tempBoard.length - 1; row >= 0; row--) {
    if (!tempBoard[row][col]) {
      tempBoard[row][col] = player;
      const result = checkGameResult(tempBoard, player);
      return result === "win";
    }
  }
  return false;
}

// Get all available columns
function availableColumns(board) {
  const cols = [];
  for (let c = 0; c < 7; c++) {
    if (board[0][c] === null) cols.push(c);
  }
  return cols;
}

// Function to create a new game
function startGame(player1, player2) {
  const gameId = gameIdCounter++;
  const board = createEmptyBoard();

  games[gameId] = {
    board,
    players: [player1, player2],
    currentPlayer: "R",
    disconnected: {},
    usernames: [player1.username, player2 ? player2.username : null],
  };

  // Notify players that game has started -- assign colors
  if (player1)
    player1.send(
      JSON.stringify({
        type: "start",
        gameId,
        board,
        currentPlayer: "R",
        color: "R",
        opponent:
          player2?.username || "bot",
      })
    );
  if (player2)
    player2.send(
      JSON.stringify({
        type: "start",
        gameId,
        board,
        currentPlayer: "R",
        color: "Y",
        opponent: player1.username,
      })
    );

  console.log("Game started:", gameId);

  // If player2 is null → start bot moves after player1
  if (!player2) {
    setTimeout(() => botMove(gameId), 1000);
  }
}

// Improved bot logic
function botMove(gameId) {
  const game = games[gameId];
  if (!game || game.players[1]) return; // Only bot if player2 is null
  const board = game.board;
  const botPlayer = "Y";
  const humanPlayer = "R";

  let chosenCol = null;
  const cols = availableColumns(board);

  // 1️⃣ Bot can win?
  for (const col of cols) {
    if (canWinNext(board, col, botPlayer)) {
      chosenCol = col;
      break;
    }
  }

  // 2️⃣ Block human win
  if (chosenCol === null) {
    for (const col of cols) {
      if (canWinNext(board, col, humanPlayer)) {
        chosenCol = col;
        break;
      }
    }
  }

  // 3️⃣ Otherwise pick center or random
  if (chosenCol === null) {
    if (cols.includes(3)) chosenCol = 3;
    else chosenCol = cols[Math.floor(Math.random() * cols.length)];
  }

  // Place disc
  for (let row = board.length - 1; row >= 0; row--) {
    if (!board[row][chosenCol]) {
      board[row][chosenCol] = botPlayer;
      const result = checkGameResult(board, botPlayer);
      game.currentPlayer = "R";

      game.players[0]?.send(
        JSON.stringify({
          type: "update",
          board,
          currentPlayer: game.currentPlayer,
          result,
        })
      );
      return;
    }
  }
}

wss.on("connection", (ws) => {
  console.log("Player connected");

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      ws.username = data.username;

      // Check for reconnection
      let reconnected = false;
      for (const [id, game] of Object.entries(games)) {
        const idx = game.usernames.findIndex((u) => u === ws.username);
        // If username matches, player was in this game
        if (
          idx !== -1 &&
          game.disconnected[ws.username] &&
          Date.now() - game.disconnected[ws.username] < 30000
        ) {
          game.players[idx] = ws;
          delete game.disconnected[ws.username];
          ws.send(
            JSON.stringify({
              type: "resume",
              gameId: id,
              board: game.board,
              currentPlayer: game.currentPlayer,
              result: checkGameResult(game.board, "R"),
              color: idx === 0 ? "R" : "Y",
              opponent:
                game.usernames[idx === 0 ? 1 : 0] || "bot",
            })
          );
          reconnected = true;
          break;
        }
      }
      if (reconnected) return;

      // Normal matchmaking
      if (!waitingPlayer) {
        waitingPlayer = ws;

        // 10-second bot timer
        setTimeout(() => {
          if (waitingPlayer === ws) {
            console.log("Starting game with bot for", ws.username);
            startGame(ws, null);
            waitingPlayer = null;
          }
        }, 10000);
      } else {
        const player1 = waitingPlayer;
        const player2 = ws;
        waitingPlayer = null;
        startGame(player1, player2);
      }
    }

    if (data.type === "move") {
      const { gameId, colIndex, player } = data;
      const game = games[gameId];
      if (!game) return;
      if (game.currentPlayer !== player) return; // Prevent move out of turn

      // Prevent moves after win/draw
      if (["win", "draw"].includes(checkGameResult(game.board, "R")) ||
        ["win", "draw"].includes(checkGameResult(game.board, "Y"))
      ) return;

      const board = game.board;

      let placed = false;
      for (let row = board.length - 1; row >= 0; row--) {
        if (!board[row][colIndex]) {
          board[row][colIndex] = player;
          placed = true;
          break;
        }
      }

      if (!placed) return;

      const result = checkGameResult(board, player);
      game.currentPlayer = player === "R" ? "Y" : "R";

      // Broadcast update to both players
      game.players.forEach((p) => {
        if (p) {
          p.send(
            JSON.stringify({
              type: "update",
              board,
              currentPlayer: game.currentPlayer,
              result,
            })
          );
        }
      });

      // If bot turn
      if (
        !game.players[1] &&
        game.currentPlayer === "Y" &&
        result === "ongoing"
      ) {
        setTimeout(() => botMove(gameId), 500);
      }
    }
  });

  ws.on("close", () => {
    console.log("Player disconnected");

    // Find the player in any game
    for (const [id, game] of Object.entries(games)) {
      const idx = game.players.indexOf(ws);
      if (idx !== -1) {
        const username = ws.username;
        if (username) {
          game.disconnected[username] = Date.now();
          setTimeout(() => {
            // After 30s, if not reconnected, forfeit
            if (
              game.disconnected[username] &&
              Date.now() - game.disconnected[username] >= 30000
            ) {
              const otherPlayerIdx = idx === 0 ? 1 : 0;
              const winner =
                (game.players[otherPlayerIdx] &&
                  game.players[otherPlayerIdx].username) ||
                "bot";
              // Notify both players if connected
              game.players.forEach((p) => {
                if (p && p.readyState === p.OPEN) {
                  p.send(
                    JSON.stringify({ type: "forfeit", winner })
                  );
                }
              });
              delete games[id];
            }
          }, 30000);
        }
        break;
      }
    }
  });
});

console.log("WebSocket server running on ws://localhost:8080");
