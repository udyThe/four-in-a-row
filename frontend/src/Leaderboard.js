import React, { useEffect, useState } from "react";

function Leaderboard({ refreshTrigger }) {
  const [data, setData] = useState([]);
  const API_BASE =
    process.env.NODE_ENV === "production"
      ? "https://four-in-a-row-backend-mwjq.onrender.com"
      : "http://localhost:3001";

  useEffect(() => {
    fetch(`${API_BASE}/leaderboard`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [refreshTrigger]);

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
