# 🎮 Four in a Row

A real-time multiplayer Connect Four game built with React, Node.js, WebSockets, and PostgreSQL. Players can compete against each other or challenge a bot, with live leaderboard tracking and automatic matchmaking.

## ✨ Features

- **Real-time Multiplayer**: Play against other online players using WebSocket connections
- **Bot Mode**: Automatically matched with an AI bot if no players are available within 10 seconds
- **Smart AI**: The bot uses strategic logic to block player wins and attempt its own winning moves
- **Live Leaderboard**: Real-time leaderboard updates showing top 10 players
- **Reconnection Support**: Rejoin ongoing games within 30 seconds if disconnected
- **Game History**: Tracks all completed games in the database
- **Responsive UI**: Clean, intuitive interface with visual win highlighting

## 🏗️ Architecture

### Backend (Node.js + Express + WebSocket)
- Express server for REST API endpoints
- WebSocket server for real-time game communication
- PostgreSQL database for leaderboard and game history
- Smart matchmaking system with bot fallback

### Frontend (React)
- React-based user interface
- WebSocket client for real-time updates
- Dynamic board rendering with win cell highlighting
- Live leaderboard component

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **PostgreSQL** (v12 or higher)

## 🚀 Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/udyThe/four-in-a-row.git
cd four-in-a-row
```

### 2. Database Setup

#### Install PostgreSQL
If you don't have PostgreSQL installed:

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

**On macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**On Windows:**
Download and install from [postgresql.org](https://www.postgresql.org/download/windows/)

#### Create Database and Tables

```bash
# Access PostgreSQL
sudo -u postgres psql

# Or on Windows/macOS:
psql -U postgres
```

Run the following SQL commands:

```sql
-- Create database
CREATE DATABASE four_in_a_row;

-- Connect to the database
\c four_in_a_row

-- Create leaderboard table
CREATE TABLE leaderboard (
    username VARCHAR(255) PRIMARY KEY,
    wins INTEGER DEFAULT 0
);

-- Create completed games table
CREATE TABLE completed_games (
    id SERIAL PRIMARY KEY,
    player1 VARCHAR(255) NOT NULL,
    player2 VARCHAR(255) NOT NULL,
    winner VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Exit PostgreSQL
\q
```

#### Configure Database Connection

Update the database credentials in `backend/db.js` if your PostgreSQL setup differs:

```javascript
const pool = new Pool({
  connectionString: "postgresql://postgres:YOUR_PASSWORD@localhost:5432/four_in_a_row",
  ssl: false
});
```

Replace `YOUR_PASSWORD` with your PostgreSQL password.

### 3. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start the backend server
node index.js
```

The backend server will start on **http://localhost:3001**

### 4. Frontend Setup

Open a new terminal window:

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install dependencies
npm install

# Start the React development server
npm start
```

The frontend will automatically open in your browser at **http://localhost:3000**

## 🎮 How to Play

1. **Enter Username**: Type your username in the input field and click "Start Game"
2. **Wait for Match**: The system will match you with another player or a bot after 10 seconds
3. **Play**: 
   - You'll be assigned either Red or Yellow
   - Click on any column to drop your piece
   - Get four in a row (horizontally, vertically, or diagonally) to win
4. **View Stats**: Check the leaderboard to see top players

## 🎯 Game Rules

- Players alternate turns dropping colored pieces into a 7-column, 6-row grid
- Pieces fall to the lowest available position in the selected column
- First player to connect four pieces in a row wins
- The game ends in a draw if the board fills up with no winner
- Disconnecting for more than 30 seconds results in an automatic forfeit

## 🤖 Bot Strategy

The AI bot uses the following decision logic:
1. **Win Detection**: If the bot can win on the next move, it takes that move
2. **Block Player**: If the player can win on their next move, the bot blocks them
3. **Center Priority**: Prefers the center column (column 3) if available
4. **Random Placement**: Otherwise, chooses a random available column

## 📁 Project Structure

```
four-in-a-row/
├── backend/
│   ├── db.js              # Database connection and queries
│   ├── index.js           # Express + WebSocket server
│   └── package.json       # Backend dependencies
├── frontend/
│   ├── public/
│   │   ├── favicon.ico
│   │   └── index.html
│   ├── src/
│   │   ├── App.js         # Main game component
│   │   ├── App.css        # Game styles
│   │   ├── Leaderboard.js # Leaderboard component
│   │   └── index.js       # React entry point
│   └── package.json       # Frontend dependencies
└── README.md
```

## 🔧 Environment Variables

### Backend
Set these in your environment or create a `.env` file:
- `DATABASE_URL`: PostgreSQL connection string (defaults to local)
- `PORT`: Server port (defaults to 3001)

### Frontend
- `REACT_APP_WS_URL`: WebSocket URL (auto-detects in development/production)

## 🌐 Deployment

### Backend (Render/Heroku)
1. Push your code to GitHub
2. Connect your repository to Render/Heroku
3. Set environment variable: `DATABASE_URL` with your production database connection string
4. Deploy

### Frontend (Vercel/Netlify)
1. Connect your repository
2. Set build command: `cd frontend && npm install && npm run build`
3. Set publish directory: `frontend/build`
4. Deploy

**Note**: Update `WS_URL` in `frontend/src/App.js` with your production WebSocket URL.

## 🛠️ Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express** - Web framework
- **ws** - WebSocket library
- **PostgreSQL** - Database
- **pg** - PostgreSQL client for Node.js
- **cors** - Enable CORS

### Frontend
- **React** - UI library
- **WebSocket API** - Real-time communication
- **CSS** - Styling

## 🐛 Troubleshooting

### Database Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
brew services list                # macOS

# Verify database exists
psql -U postgres -l
```

### Port Already in Use
```bash
# Kill process on port 3001 (backend)
sudo kill -9 $(sudo lsof -t -i:3001)

# Kill process on port 3000 (frontend)
sudo kill -9 $(sudo lsof -t -i:3000)
```

### WebSocket Connection Failed
- Ensure backend is running on port 3001
- Check firewall settings
- Verify `WS_URL` in `App.js` matches your backend URL

## 📝 API Endpoints

### REST API
- `GET /leaderboard` - Fetch top 10 players

### WebSocket Events

**Client → Server:**
- `join` - Join game queue with username
- `move` - Make a move in the game

**Server → Client:**
- `start` - Game started
- `resume` - Resume disconnected game
- `update` - Board state update
- `game_over` - Game ended
- `forfeit` - Player forfeited


## 👨‍💻 Author

Created by Uday

---

Enjoy playing Four in a Row! 🎉
