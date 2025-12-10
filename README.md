*This project has been created as part of the 42 curriculum by [rcheong](https://profile-v3.intra.42.fr/users/rcheong),
[nbinnazl](https://profile-v3.intra.42.fr/users/nbinnazl) and [hetan](https://profile-v3.intra.42.fr/users/hetan).*

# ft_transcendence

## Description

**ft_transcendence** is a full-stack web application.\
The project requires that a team develop a web service that meets standard modern,
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

-   Docker & Docker Compose
-   Node.js LTS
-   npm or yarn
-   Required .env files

### Installation

``` bash
git clone <your-repo-url>
cd ft_transcendence
docker compose up --build
```

Then visit `https://localhost:5173`.

### Production

<details>
<summary><strong>View development details</strong></summary>

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
</details>

## Resources

### References

-   [WebSockets](https://websockets.readthedocs.io/en/stable/)
-   [Fastify](https://fastify.dev/docs/latest/)
-   [SQLite](https://sqlite.org/docs.html)
-   [Prisma](https://www.prisma.io/docs)
-   [Vite](https://vite.dev/guide/)
-   [Tailwind](https://tailwindcss.com/docs/installation/using-vite)
-   [Docker](https://docs.docker.com/manuals/)

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

## Technical Stack

### Frontend

-   Vite
-   TailwindCSS
-   WebSockets
-   OAuth 2.0

### Backend

-   Fastify
-   REST & WebSocket APIs
-   Validation, JWT, guards

### Database

-   SQLite
-   Prisma ORM

### Other

-   Docker / Docker Compose
-   JWT
-   Reverse proxy (if used)

## Database Schema

| Table                | Purpose                                                                    | Key Relationships                                                                                                   | Notes / Constraints               |
| -------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **User**             | Stores accounts, OAuth, 2FA, game stats, and social links                  | `User → Tournament` (creator), `User → TournamentPlayer` (participant)                                              | `email` & `username` unique       |
| **Game**             | Records matches between players with scores, duration, timestamps          | Optional `Game → Tournament`                                                                                        | Can exist outside tournaments     |
| **Tournament**       | Represents tournaments with config, status, players, matches, and games    | `Tournament → TournamentPlayer`, `Tournament → TournamentMatch`, `Tournament → Game`, `Tournament → User` (creator) | Tracks winner, rounds, and status |
| **TournamentPlayer** | Tracks tournament participants, seed, elimination round, and snapshot info | `TournamentPlayer → Tournament`, `TournamentPlayer → User`                                                          | `[tournamentId, userId]` unique   |
| **TournamentMatch**  | Represents matches in tournament bracket, participants, status, result     | `TournamentMatch → Tournament`, optional `TournamentMatch → Game`                                                   | `[tournamentId, matchId]` unique  |

## Features

| Feature           | Description                 | Member                 |
|-------------------|-----------------------------|------------------------|
| Authentication    | OAuth, login                | rcheong                |
| Profiles          | User info, status           | nbinnazl               |
| Chat              | Real-time communication     | rcheong + nbinnazl     |
| AI Player         | Algorithmic gameplay        | rcheong                |
| Game              | Real-time gameplay          | rcheong                |
| Friends           | Add/remove, presence        | rcheong + nbinnazl     |
| Containerisation  | Docker infrastructure       | hetan                  |
| Deployment        | Networking & infrastructure | hetan                  |

## Modules

### Major (2 pts)

-   Real-time multiplayer
-   OAuth authentication
-   Containerised architecture
-   AI Player

### Minor (1 pt)

-   Chat
-   Profiles
-   Notifications
-   Match history

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

## License

This project is licensed under the [MIT License](LICENSE).
