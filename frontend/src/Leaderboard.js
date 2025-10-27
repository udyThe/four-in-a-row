import React, { useEffect, useState } from "react";

function Leaderboard({ refreshTrigger, ws }) {
  const [data, setData] = useState([]);
  const API_BASE =
    process.env.NODE_ENV === "production"
      ? "https://four-in-a-row-backend-mwjq.onrender.com"
      : "http://localhost:3001";

  // Fetch initially
  useEffect(() => {
    fetch(`${API_BASE}/leaderboard`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [refreshTrigger]);

  // Listen for WebSocket leaderboard updates
  useEffect(() => {
    if (!ws) return;
    const handler = (msg) => {
      const dataMsg = JSON.parse(msg.data);
      if (dataMsg.type === "game_over" && dataMsg.leaderboard) {
        setData(dataMsg.leaderboard);
      }
    };
    ws.addEventListener("message", handler);
    return () => ws.removeEventListener("message", handler);
  }, [ws]);

  return (
    <div style={{ marginTop: 30 }}>
      <h2>🏅 Leaderboard</h2>
      <table style={{ margin: "0 auto", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid black", padding: "4px 10px" }}>Rank</th>
            <th style={{ border: "1px solid black", padding: "4px 10px" }}>Player</th>
            <th style={{ border: "1px solid black", padding: "4px 10px" }}>Wins</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.username}>
              <td style={{ border: "1px solid #ccc", padding: "4px 10px" }}>{idx + 1}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px 10px" }}>{row.username}</td>
              <td style={{ border: "1px solid #ccc", padding: "4px 10px" }}>{row.wins}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Leaderboard;
