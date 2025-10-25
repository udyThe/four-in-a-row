import React, { useState } from "react";

function App() {
  const [ws, setWs] = useState(null);
  const [username, setUsername] = useState("");
  const [gameId, setGameId] = useState(null);
  const [board, setBoard] = useState(Array(6).fill(Array(7).fill(null)));
  const [currentPlayer, setCurrentPlayer] = useState("R");
  const [result, setResult] = useState("ongoing");

  // Connect to WebSocket and send join message
  const connect = () => {
    if (!username) return alert("Enter username first");

    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      console.log("Connected to backend");
      socket.send(JSON.stringify({ type: "join", username }));
    };

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data);

      if (data.type === "start") {
        setGameId(data.gameId);
        setBoard(data.board);
        setCurrentPlayer(data.currentPlayer);
        setResult("ongoing");
      }

      if (data.type === "update") {
        setBoard(data.board);
        setCurrentPlayer(data.currentPlayer);
        setResult(data.result);
      }
    };

    setWs(socket);
  };

  // Handle column click
  const handleClick = (colIndex) => {
    if (!ws || result !== "ongoing") return;

    ws.send(JSON.stringify({
      type: "move",
      gameId,
      colIndex,
      player: currentPlayer
    }));
  };

  return (
    <div style={{ padding: 20 }}>
      {!ws && (
        <div>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            style={{ padding: 5, marginRight: 10 }}
          />
          <button onClick={connect} style={{ padding: 5 }}>Start Game</button>
        </div>
      )}

      {ws && (
        <div>
          <h3>Username: {username}</h3>
          <h3>Current Player: {currentPlayer}</h3>
          <h3>Result: {result}</h3>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 50px)",
            gap: 2
          }}>
            {board.map((row, rIdx) =>
              row.map((cell, cIdx) => (
                <div
                  key={`${rIdx}-${cIdx}`}
                  onClick={() => handleClick(cIdx)}
                  style={{
                    width: 50,
                    height: 50,
                    border: "1px solid black",
                    borderRadius: 5,
                    backgroundColor: cell === "R" ? "red" : cell === "Y" ? "yellow" : "white",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    cursor: "pointer"
                  }}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
