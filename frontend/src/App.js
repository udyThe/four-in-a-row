import React, { useState } from "react";
import './App.css';
import Leaderboard from "./Leaderboard";

function App() {
  const [ws, setWs] = useState(null);
  const [username, setUsername] = useState("");
  const [gameId, setGameId] = useState(null);
  const [board, setBoard] = useState(Array(6).fill(Array(7).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState("R");
  const [result, setResult] = useState("ongoing");
  const [myColor, setMyColor] = useState("");
  const [opponent, setOpponent] = useState("");
  const [winner, setWinner] = useState(null);
  const [winCells, setWinCells] = useState([]);

  const WS_URL =
  process.env.REACT_APP_WS_URL ||
  (process.env.NODE_ENV === "production"
    ? "wss://four-in-a-row-backend-mwjq.onrender.com"
    : "ws://localhost:3001");

  const connect = () => {
    if (!username) return alert("Enter username first");
    const socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "join", username }));
    };

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.type === "start" || data.type === "resume") {
        setGameId(data.gameId);
        setBoard(data.board);
        setCurrentPlayer(data.currentPlayer);
        setResult("ongoing");
        setMyColor(data.color);
        setOpponent(data.opponent || "");
        setWinner(null);
        setWinCells(data.winCells || []);
      }
      if (data.type === "update") {
        setBoard(data.board);
        setCurrentPlayer(data.currentPlayer);
        setResult(data.result);
        setWinner(data.winner || null);
        setWinCells(data.winCells || []);
      }
      if (data.type === "game_over") {
        setWinner(data.winner);
        setResult("ended");
        setWinCells(data.winCells || []);
      }
      if (data.type === "forfeit") {
        setResult("forfeit - " + data.winner + " wins");
        setWinCells([]);
      }
    };

    setWs(socket);
  };

  const handleClick = (colIndex) => {
    if (!ws || result !== "ongoing" || currentPlayer !== myColor) return;
    ws.send(
      JSON.stringify({
        type: "move",
        gameId,
        colIndex,
        player: myColor,
      })
    );
  };

  const winCellKeys =
    winCells && Array.isArray(winCells)
      ? winCells.map(([r, c]) => r + "," + c)
      : [];

  return (
    <div style={{ padding: 20, textAlign: "center" }}>
      {!ws && (
        <div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            style={{
              padding: 5,
              marginRight: 10,
            }}
          />
          <button onClick={connect} style={{ padding: 5 }}>
            Start Game
          </button>
        </div>
      )}

      {ws && (
        <div>
          <h2>User: {username}</h2>
          <h3>
            Your color:{" "}
            {myColor === "R" ? "Red" : myColor === "Y" ? "Yellow" : ""}
          </h3>
          <h3>Opponent: {opponent}</h3>
          <h3>Status: {result}</h3>

          {result === "ongoing" && (
            <h3 style={{ color: "#007bff" }}>
              Current Turn: {currentPlayer === "R" ? "Red" : "Yellow"}
            </h3>
          )}

          {winner && (
            <h2 style={{ color: "green" }}>
              {winner === "draw" ? "It’s a draw!" : "Winner: " + winner}
            </h2>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 60px)",
              gap: 5,
              justifyContent: "center",
              marginTop: 20,
            }}
          >
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => {
                const key = `${rIdx},${cIdx}`;
                const highlight = winCellKeys.includes(key);
                return (
                  <div
                    key={key}
                    onClick={() => handleClick(cIdx)}
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "10px",
                      border: highlight
                        ? "4px solid #00E676"
                        : "1px solid black",
                      backgroundColor:
                        cell === "R"
                          ? "red"
                          : cell === "Y"
                          ? "yellow"
                          : "#eee",
                      cursor:
                        currentPlayer === myColor && result === "ongoing"
                          ? "pointer"
                          : "not-allowed",
                    }}
                  ></div>
                );
              })
            )}
          </div>

          {/* Pass winner as refreshTrigger to reload leaderboard on game finish */}
          <Leaderboard refreshTrigger={winner} ws={ws} />
        </div>
      )}
    </div>
  );
}

export default App;
