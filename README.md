🎲 Code & Conquer – Hybrid Board Game Platform

Code & Conquer ist ein hybrides Lern-Boardgame mit digitaler Komponente, das algorithmisches Denken, Datenstrukturen und Programmierkonzepte durch soziale Minigames vermittelt.

Spieler bewegen sich auf einem physischen Spielbrett und lösen bei Challenge-Feldern digitale Minigames, die per QR-Code gestartet werden.
Ein zentrales Backend verwaltet Spielrunden (Sessions), Spieler, Scores und ein Leaderboard.

🧠 Core Game Concept

Spieler starten eine Match / Session

Jeder Spieler setzt einmal seinen Namen für diese Session

Spieler landet auf einem Challenge-Feld

Scannt einen von 3 QR-Codes:

Easy

Medium

Hard

Backend wählt zufällig ein Minigame

Spieler spielt das Minigame

Punkte werden berechnet aus:

Difficulty

Zeit

Fehler

Ergebnis wird gespeichert

Leaderboard zeigt den aktuellen Stand aller Spieler im Match

🚀 Tech Stack
Backend

Java 19

Spring Boot 4.0

Maven

Spring Web (REST)

Spring Data JPA / Hibernate

H2 Database (In-Memory, Development)

Lombok

Frontend

React

Vite

React Router

Custom UI Components

📁 Project Structure
code-conquer/
│
├── server/        # Spring Boot Backend
│   ├── controller # REST API Controllers
│   ├── service    # Business Logic
│   ├── model      # JPA Entities
│   ├── repository # JPA Repositories
│   └── dto        # API DTOs
│
└── frontend/      # React / Vite App
    ├── pages      # Routes (Home, QR, Minigames, Leaderboard, ...)
    ├── components # UI + Game Components
    └── lib        # Session, Player, Scoring logic

🔧 Backend Features (Current)
🎮 Match / Session System

Create a new match

Join match via 6-digit code

All scores are scoped to a session

One backend = multiple parallel matches possible

👤 Player System (per Session)

Each player registers once per session

Player identity stored via playerId

Prevents duplicate names / typos

Prepared for future extensions (color/avatar)

🎯 Challenge Routing

Backend selects a random Minigame

Based on:

Difficulty (Easy / Medium / Hard)

Optional category

Returns a Minigame Descriptor:

route

category

difficulty

parameters (future difficulty scaling)

🧩 Minigames (Frontend)

Current Minigames:

Stack Maze

Graph Pathfinder

BST Insert

Queue Commander

🧮 Scoring System

Points are based on:

Difficulty (Base Points)

Time taken

Number of errors

Score calculation is consistent across all Minigames.

🏆 Leaderboard

Aggregated per session

Shows:

Total points per player

Number of attempts

Average time

Total errors

Auto-refreshing leaderboard view

🌐 REST API Overview (Backend)
Sessions
POST   /api/sessions
GET    /api/sessions/{id}
GET    /api/sessions/code/{code}

Players
POST   /api/sessions/{sessionId}/players
GET    /api/sessions/{sessionId}/players

Challenges
GET    /api/challenges/random?difficulty=EASY|MEDIUM|HARD

Scores
POST   /api/scores
GET    /api/scores?sessionId=...
GET    /api/scores/top?sessionId=...

Leaderboard
GET    /api/leaderboard?sessionId=...

▶️ Running the Project
Backend
cd server
./mvnw spring-boot:run


Runs on:

http://localhost:8080

Frontend
cd frontend
npm install
npm run dev


Runs on:

http://localhost:5173

📱 QR Codes (Gameplay)

You only need 3 QR Codes:

/qr/easy
/qr/medium
/qr/hard


They automatically:

Validate session

Validate player

Route to a random Minigame

🧱 Design Goals

Hybrid physical + digital gameplay

Minimal setup at the table

Mobile-friendly

Fair scoring

Extensible architecture

🔮 Planned Improvements

Persistent database (file-based H2 / PostgreSQL)

Player colors / avatars

Server-side score calculation

Match end / lock

Difficulty scaling per Minigame

Big-screen leaderboard mode

📜 License

To be defined.
