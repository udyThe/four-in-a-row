const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",       // ← replace with your PostgreSQL username
  host: "localhost",
  database: "four_in_a_row", // ← same name you will create next
  password: "8329",   // ← replace with your PostgreSQL password
  port: 5432,
});

async function recordWin(username) {
  await pool.query(
    `INSERT INTO leaderboard (username, wins)
     VALUES ($1, 1)
     ON CONFLICT (username)
     DO UPDATE SET wins = leaderboard.wins + 1;`,
    [username]
  );
}

async function getLeaderboard() {
  const result = await pool.query(
    `SELECT * FROM leaderboard ORDER BY wins DESC LIMIT 10`
  );
  return result.rows;
}

async function recordCompletedGame(player1, player2, winner) {
  await pool.query(
    "INSERT INTO completed_games (player1, player2, winner) VALUES ($1, $2, $3)",
    [player1, player2, winner]
  );
}

module.exports = { recordWin, getLeaderboard, recordCompletedGame };
