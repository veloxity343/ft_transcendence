*This project has been created as part of the 42 curriculum by rcheong,
nbinnazl, hetan.*

# ft_transcendence

## Description

**ft_transcendence** is a full-stack web application built as part of
the 42 curriculum's final project.\
The project requires that each team develop a web service that meets standard modern,
real-world architectural, security, and feature requirements.

Our project delivers a modern, modular, and scalable platform featuring
a real-time multiplayer game, Atari's Pong, alongside authentication, user
profiles, social interactions, and a responsive UI.\
The goal is to provide a polished, production-ready web service built
with a complete ecosystem of technologies: frontend, backend, database,
authentication, and container orchestration.

### Key Features

-   Real-time multiplayer gameplay\
-   Secure OAuth login\
-   User profiles, avatars, online status\
-   Matchmaking and friend system\
-   AI gameplay with difficulty settings\
-   Real-time chat\
-   Responsive UI\
-   Fully containerised with Docker

## Instructions

### Prerequisites

-   Docker & Docker Compose\
-   Node.js LTS\
-   npm or yarn\
-   Required .env files

### Installation

``` bash
git clone <your-repo-url>
cd ft_transcendence
docker compose up --build
```

Then visit `http://localhost:5173`.

### Development

Frontend:

``` bash
cd frontend
npm install
npm run dev
```

Backend:

``` bash
cd backend
npm install
npm run dev
```

## Resources

### References

-   WebSockets documentation\
-   Fastify docs\
-   Vite / Tailwind docs\
-   SQLite / Prisma docs\
-   Docker documentation

### AI Usage Statement

AI was used for:
- Debugging assistance\
- Documentation refinement\
- Researching patterns\
- Refactoring suggestions

All code and decisions were implemented manually.

## Team Information

### rcheong | Project Manager (PM) & Developer

-   Backend Developer, Support Developer\
-   Backend architecture, authentication, WebSockets, DB logic,
    debugging

### nbinnazl | Product Owner (PO)

-   Frontend Developer\
-   UI/UX, components, pages, game UI, chat UI, integration

### hetan | Technical Lead / Architect

-   DevOps / Infrastructure\
-   Dockerisation, networking, deployment, debugging support

## Project Management

-   Domain-based work split\
-   GitHub Issues & Projects\
-   Discord for communication\
-   Docker Compose for workflows

## Technical Stack

### Frontend

-   Vite\
-   TailwindCSS\
-   WebSockets\
-   OAuth 2.0

### Backend

-   Fastify\
-   REST & WebSocket APIs\
-   Validation, JWT, guards

### Database

-   SQLite\
-   Prisma ORM

### Other

-   Docker / Docker Compose\
-   JWT\
-   Reverse proxy (if used)

## Database Schema

Tables:
- users\
- matches\
- friends\
- messages\
- tokens/sessions\
- settings

Relationships:
- users 1---N matches\
- users M---M friends\
- users 1---N messages

## Features List

  Feature            Description            Member
  ------------------ ---------------------- --------------------
  Authentication     OAuth, login           rcheong
  Profiles           User info, status      nbinnazl
  Chat               Real-time comms        rcheong + nbinnazl
  AI Player          Algorithmic gameplay   rcheong
  Game               Real-time gameplay     rcheong
  Friends            Add/remove, presence   rcheong + nbinnazl
  Containerisation   Docker infra           hetan
  Deployment         Networking & infra     hetan

## Modules

### Major (2 pts)

-   Real-time multiplayer\
-   OAuth authentication\
-   Containerised architecture\
-   AI Player

### Minor (1 pt)

-   Chat\
-   Profiles\
-   Notifications\
-   Match history

## Individual Contributions

### rcheong

-   Backend architecture, auth, DB, WS game logic, AI game logic, debugging

### nbinnazl

-   Frontend UI/UX, components, game UI, chat UI

### hetan

-   Docker, networking, deployment, debugging

## Additional Information

-   Known issues (to be added)\
-   Future improvements (to be added)\
-   License (if applicable)
