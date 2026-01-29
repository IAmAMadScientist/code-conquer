# 🎲 Code & Conquer  
### A Hybrid Board Game with Real-Time Digital Minigames

🌐 **Live Demo / Deployment**  
👉 **https://code-and-conquer.com**

---

## 🧠 What is Code & Conquer?

**Code & Conquer** is a **hybrid board game** that combines a **physical game board** with a **fully digital web application**.

Players move real tokens on a physical board and resolve challenges, events, and decisions through **mobile-friendly digital minigames** opened via QR codes or direct interaction.

The goal is to make **algorithmic thinking and data-structure concepts** accessible, social, and fun — without feeling like school or a coding tutorial.

---

## 🎮 Core Gameplay Loop

1. One player creates a **Match**
2. Other players join via **6-digit code** or **QR**
3. Each player rolls a **D20** to determine turn order  
   - Ties are clearly communicated
   - Tied players re-roll until resolved
4. Players take turns:
   - Roll a **D6**
   - Move their physical token
   - Resolve the landed field digitally
5. Challenges, forks, and special cards affect the match
6. Scores are tracked live
7. The match ends on the final board node → **Endscreen + Leaderboard**

---

## 🗺️ Board & Field Types

| Field Type | Behavior |
|-----------|---------|
| START | Entry point |
| EASY | Easy Minigame |
| MEDIUM | Medium Minigame |
| HARD | Hard Minigame |
| SPECIAL | Draw & resolve a Special Card |
| FORK (passing) | Choose path |
| FORK (landing) | Medium Challenge |

---

## 🧩 Minigames

- Queue Panic  
- Bit Jumper  
- Graph Pathfinder  
- BST Insert  
- Stack Maze  

All minigames are fullscreen, mobile-optimized and spectator-friendly.

---

## 🧮 Scoring System

- Difficulty-based base points
- Time bonus
- Error penalties
- Bonus collectibles

Scores are session-scoped and shown live in the leaderboard.

---

## 🚀 Tech Stack

### Frontend
- React
- Vite
- React Router
- Custom mobile-first UI

### Backend
- Java 19
- Spring Boot
- Maven
- Spring Data JPA

---

## 📁 Project Structure

```
code-conquer/
├── server/        # Spring Boot backend
└── frontend/      # React / Vite frontend
```

---

## ▶️ Local Development

### Backend
```bash
cd server
./mvnw spring-boot:run
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

---

## 📜 License

To be defined.
