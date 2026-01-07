*This project has been created as part of the 42 curriculum by [rcheong](https://profile-v3.intra.42.fr/users/rcheong),
[nbinnazl](https://profile-v3.intra.42.fr/users/nbinnazl) and [hetan](https://profile-v3.intra.42.fr/users/hetan).*

# ft_transcendence

## Description

**ft_transcendence** is a full-stack web application.\
The project requires that a team develop a web service that meets modern
real-world architectural, security, and feature requirements.

Our project delivers a modern, modular, and scalable platform featuring
a real-time multiplayer game, Atari's Pong, alongside authentication, user
profiles, social interactions, and a responsive UI.\
The goal is to provide a polished, production-ready web service built
with a complete ecosystem of technologies: frontend, backend, database,
authentication, and container orchestration.

### Key Features

-   Real-time multiplayer gameplay
-   Secure OAuth login
-   User profiles, avatars, online status
-   Matchmaking and friend system
-   AI gameplay with difficulty settings
-   Real-time chat
-   Responsive UI
-   Fully containerised with Docker

## Table of Contents

1. [Instructions](#instructions)
2. [Resources](#resources)
3. [Technical Stack](#technical-stack)
4. [Database Schema](#database-schema)
5. [Features](#features)
6. [Modules](#modules)
7. [Team Information & Contributions](#team-information--contributions)
8. [Additional Information](#additional-information)
9. [License](#license)

## Instructions

### Pre-requisites

-   Docker & Docker Compose — we use the [Docker Engine](https://docs.docker.com/engine/install/)
 from Docker’s official upstream apt sources.list (note ```docker compose``` / ```docker-compose``` commands differ depending on the installation source)
-   Node.js LTS (for local development)
-   npm (for local development)

### Quick Commands

This project uses a [Makefile](./Makefile) as the main task runner for testing and production.

Run `make help` to see all available commands. Reconfigure rules as necessary.

### Getting Started

1. **Clone the repository**
   ```bash
   git clone git@github.com:veloxity343/ft_transcendence.git
   cd ft_transcendence
   ```

2. **Run initial setup**
   ```bash
   make setup
   ```
   This creates the required directories and generates a `.env` file from the template.

3. **Configure your environment**
   
   Open `.env` and set the required values:
   ```bash
   # Your domain or IP address (localhost for development)
   HOST_IP=yourdomain.com
   
   # Generate a secure JWT secret
   $(openssl rand -base64 64)
   JWT_SECRET=your-jwt-secret
   
   # Google OAuth credentials
   # Get these from https://console.cloud.google.com/apis/credentials
   GOOGLE_CLIENT_ID=your-client-id
   GOOGLE_CLIENT_SECRET=your-client-secret
   ```

4. **Generate SSL certificates**
   ```bash
   make ssl
   ```

<details>
<summary><strong>For local development</strong></summary>

### Development

5. Setup local environment for development
   ```bash
   make dev-setup
   ```
   This generates the required local `.env` files in backend/ and frontend/ directories.
   Open 2 terminals for development.

6. **Backend:**
   
   In Terminal 1:

   ``` bash
   cd backend
   npm install
   npx prisma migrate dev
   npm run dev
   ```

7. **Frontend:**

   In Terminal 2:

   ``` bash
   cd frontend
   npm install
   npm run dev
   ```

8. **Access at** `https://localhost:5173/`

</details>

### Production

<details>
<summary><strong>Standard ports (80/443)</strong></summary>

#### Requires sudo

5. **Update `docker-compose.yml`**

   **Ports:**   
   ```yaml
   ports:
     - "80:80"
     - "443:443"
   ```
   
   **Backend environment:**
   ```yaml
   - FRONT_URL=https://${HOST_IP}
   - SITE_URL=https://${HOST_IP}
   - FORTYTWO_CALLBACK=https://${HOST_IP}/api/auth/42/callback
   - GOOGLE_CALLBACK_URL=https://${HOST_IP}/api/oauth/google/callback
   ```
   
   **Frontend build args:**
   ```yaml
   args:
     - VITE_API_URL=https://${HOST_IP}/api
     - VITE_WS_URL=wss://${HOST_IP}/ws
   ```

6. **Update `nginx/nginx.conf`**
   ```nginx
   return 301 https://$host$request_uri;
   ```

7. **Enable privileged port binding (run once)**
   ```bash
   echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

8. **Start services**
   ```bash
   make up
   ```

9. **Access at** `https://yourdomain.com`

</details>

#### High ports (8080/8443) — No sudo required

For 42 machines by default

5. **Update `docker-compose.yml`**

   **Ports:**   
   ```yaml
   ports:
     - "8080:80"
     - "8443:443"
   ```
   
   **Backend environment:**
   ```yaml
   - FRONT_URL=https://${HOST_IP}:8443
   - SITE_URL=https://${HOST_IP}:8443
   - FORTYTWO_CALLBACK=https://${HOST_IP}:8443/api/auth/42/callback
   - GOOGLE_CALLBACK_URL=https://${HOST_IP}:8443/api/oauth/google/callback
   ```
   
   **Frontend build args:**
   ```yaml
   args:
     - VITE_API_URL=https://${HOST_IP}:8443/api
     - VITE_WS_URL=wss://${HOST_IP}:8443/ws
   ```

6. **Update `nginx/nginx.conf`**
   ```nginx
   return 301 https://$host:8443$request_uri;
   ```

7. **Start services**
   ```bash
   make up
   ```

8. **Access at** `https://yourdomain.com:8443`

## Resources

### Backend References

-   [Fastify](https://fastify.dev/docs/latest/) - High-performance web framework
-   [Prisma](https://www.prisma.io/docs) - Next-generation ORM
-   [WebSockets](https://github.com/fastify/fastify-websocket) - Real-time bidirectional communication
-   [SQLite](https://sqlite.org/docs.html) - Lightweight embedded database
-   [Argon2](https://github.com/ranisalt/node-argon2) - Password hashing algorithm
-   [otplib](https://github.com/yeojz/otplib) - TOTP two-factor authentication
-   [class-validator](https://github.com/typestack/class-validator) - DTO validation

### Frontend References

-   [Vite](https://vite.dev/guide/) - Build tool and dev server
-   [Tailwind](https://tailwindcss.com/docs/installation/using-vite) - Utility-first CSS framework

### Infrastructure

-   [Docker](https://docs.docker.com/manuals/) - Containerisation platform
-   [Nginx](https://nginx.org/en/docs/) - Reverse proxy and web server

## Technical Stack

### Frontend

-   **Build Tool**: Vite (ES modules, HMR)
-   **Styling**: TailwindCSS (utility-first CSS)
-   **Real-time**: WebSocket client (game state, chat, presence)
-   **Authentication**: OAuth 2.0 (Google), JWT tokens

### Backend

-   **Framework**: Fastify (high-performance, low-overhead)
-   **APIs**: RESTful HTTP + WebSocket (real-time events)
-   **Authentication**: 
    -   JWT (access + refresh tokens)
    -   Argon2 (password hashing)
    -   TOTP/2FA (otplib)
    -   OAuth 2.0 (Google)
-   **Validation**: class-validator (DTO validation)
-   **Real-time**: @fastify/websocket (connection management)
-   **File Upload**: @fastify/multipart (avatars)

### Database

-   **Engine**: SQLite (embedded, file-based)
-   **ORM**: Prisma (type-safe queries, migrations)
-   **Schema**: Relational with JSON fields for arrays

### Game Engine

-   **Physics**: Custom 100 FPS game loop
-   **AI**: Predictive ball trajectory with difficulty scaling
-   **Networking**: WebSocket state synchronisation
-   **Persistence**: Match history, ELO ratings, statistics

### Infrastructure

-   **Containerisation**: Docker + Docker Compose
-   **Orchestration**: Multi-container setup (backend, frontend, nginx)
-   **Reverse Proxy**: Nginx (SSL termination, routing)
-   **Security**: HTTPS/WSS, JWT, rate limiting

## Database Schema

| Table                | Purpose                                                                    | Key Relationships                                                                                                   | Notes / Constraints                                    |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **User**             | Stores accounts, OAuth, 2FA, game stats, and social links                  | `User → Tournament` (creator), `User → TournamentPlayer` (participant)                                              | `email` & `username` unique; ELO score default 1200    |
| **Game**             | Records matches between players with scores, duration, timestamps          | Optional `Game → Tournament`                                                                                        | Can exist outside tournaments; stores game type        |
| **Tournament**       | Represents tournaments with config, status, players, matches, and games    | `Tournament → TournamentPlayer`, `Tournament → TournamentMatch`, `Tournament → Game`, `Tournament → User` (creator) | Tracks winner, rounds, status; supports local mode     |
| **TournamentPlayer** | Tracks tournament participants, seed, elimination round, and snapshot info | `TournamentPlayer → Tournament`, `TournamentPlayer → User`                                                          | `[tournamentId, userId]` unique; supports virtual players |
| **TournamentMatch**  | Represents matches in tournament bracket, participants, status, result     | `TournamentMatch → Tournament`, optional `TournamentMatch → Game`                                                   | `[tournamentId, matchId]` unique; tracks ready state   |

**JSON Fields** (stored as strings in SQLite):
- `User.friends`, `User.adding`, `User.added` - Friend system state
- `User.blocks`, `User.blocking`, `User.blocked` - Block system state  
- `User.gameHistory` - Array of game IDs (last 100 matches)

**Key Features**:
- ELO rating system with K-factor adjustment based on experience
- Tournament bracket generation (single elimination)
- OAuth integration (Google)
- 2FA with TOTP secrets

## Features

| Feature              | Description                                      | Implementation Details                              | Member         |
|----------------------|--------------------------------------------------|-----------------------------------------------------|----------------|
| Authentication       | JWT, OAuth, 2FA                                  | Argon2 hashing, refresh tokens, TOTP              | rcheong        |
| Profiles             | User info, stats, avatars                        | File uploads, ELO rankings, match history          | nbinnazl       |
| Chat                 | Real-time communication                          | Global, DM, whispers, ignore, DND mode             | rcheong + nbinnazl |
| AI Opponent          | Algorithmic gameplay                             | 3 difficulty levels, predictive trajectory         | rcheong        |
| Game Engine          | Real-time Pong gameplay                          | 100 FPS physics, reconnection, forfeit support     | rcheong        |
| ELO System           | Skill-based matchmaking                          | K-factor scaling, tournament multipliers           | rcheong        |
| Match History        | Statistics and replays                           | Win/loss tracking, detailed game records           | rcheong + nbinnazl |
| Friends              | Social connections                               | Pending requests, mutual acceptance                | rcheong + nbinnazl |
| Tournaments          | Bracket competitions                             | Online and local modes, ready system               | rcheong        |
| Leaderboard          | Global rankings                                  | ELO-based, rank titles and colors                  | rcheong + nbinnazl |
| Containerisation     | Docker infrastructure                            | Multi-container orchestration, health checks       | hetan          |
| Deployment           | Production networking                            | Nginx reverse proxy, SSL/TLS, port mapping         | hetan          |

## Modules

### Major (2 pts)

-   **Real-time features (WebSockets)** - Connection management, presence tracking, event broadcasting
-   **Chat system** - Global chat, private messages, whispers, ignore/block, do-not-disturb mode
-   **Public API** - RESTful HTTP endpoints for user, game, tournament, history data
-   **User management & authentication** - User profiles, friend requests, mutual acceptance, blocking, JWT (access + refresh), Argon2, 2FA/TOTP, OAuth
-   **AI opponent** - Predictive trajectory algorithm, 3 difficulty levels, adaptive behaviour
-   **Web-based game (Pong)** - Custom physics engine, 100 FPS game loop, collision detection
-   **Remote play** - Real-time state synchronisation, reconnection support, forfeit handling
-   **Multiplayer** - Matchmaking queue, private games, local play

### Minor (1 pt)

-   **Backend framework (Fastify)** - High-performance async server with plugin architecture
-   **ORM for database (Prisma)** - Type-safe queries, automated migrations, relation loading
-   **Notifications (toast system)** - Non-blocking UI notifications for game events, friend requests, errors
-   **Custom design system** - Retro-styled UI components, consistent theming
-   **Multiple browsers** - Web standards compliance, responsive design
-   **Game statistics & match history** - Win/loss records, ELO tracking, leaderboard rankings
-   **OAuth** - OAuth 2.0 authorisation flow, account linking
-   **2FA** - TOTP with QR code generation, authenticator app support
-   **Analytics dashboard** - User stats, match history, performance metrics
-   **Advanced chat features** - Command interface, rich messaging
-   **Tournament system** - Bracket generation, ready system, local and online modes, match progression

### Total: 27 points

## Team Information & Contributions

### [rcheong](https://github.com/veloxity343) | Project Manager (PM) & Developer

-   Backend Developer, Support Developer
-   Backend architecture, authentication, WebSockets, DB logic,
    debugging

### [nbinnazl](https://github.com/nizarsyahmi37) | Product Owner (PO) & Developer

-   Frontend Developer
-   UI/UX, components, pages, game UI, chat UI, integration

### [hetan](https://github.com/ninetendo59) | Technical Lead / Architect

-   DevOps / Infrastructure
-   Dockerisation, networking, deployment, debugging support

## Project Management

-   Domain-based work split
-   GitHub Issues & Projects
-   Discord for communication
-   Docker Compose for workflows

## Additional Information

-   Known issues (to be added)
-   Future improvements (to be added)

### AI Usage & Disclosure Statement

> [!IMPORTANT]
> As per the 42 curriculum rules regarding AI, AI tools were strictly limited to the following approved tasks:
> - Debugging assistance - understanding and breaking down error messages
> - Documentation refinement and clarification
> - Researching patterns and best practices
> - Providing refactoring suggestions for readability
>
> **AI was not used for writing code, generating solutions, or implementing any project features.**  
> All architectural decisions, code, and implementations were developed and validated entirely by the team.

## License

This project is licensed under the [MIT License](LICENSE).
