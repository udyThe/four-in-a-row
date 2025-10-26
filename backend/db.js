const { Pool } = require("pg");

// Use DATABASE_URL for production, fallback to local settings for development
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://postgres:8329@localhost:5432/four_in_a_row",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

// Record a win for a player
async function recordWin(username) {
  await pool.query(
    `INSERT INTO leaderboard (username, wins)
     VALUES ($1, 1)
     ON CONFLICT (username)
     DO UPDATE SET wins = leaderboard.wins + 1;`,
    [username]
  );
}

// Get top 10 leaderboard
async function getLeaderboard() {
  const result = await pool.query(
    `SELECT * FROM leaderboard ORDER BY wins DESC LIMIT 10`
  );
  return result.rows;
}

// Record a completed game
async function recordCompletedGame(player1, player2, winner) {
  await pool.query(
    "INSERT INTO completed_games (player1, player2, winner) VALUES ($1, $2, $3)",
    [player1, player2, winner]
  );
}

module.exports = { recordWin, getLeaderboard, recordCompletedGame };
