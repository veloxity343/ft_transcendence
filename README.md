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

-   Docker & Docker Compose
-   Node.js LTS (for local development)
-   npm (for local development)

### Quick Commands

This project uses a [Makefile](./Makefile) as the main task runner for testing and production.

Run `make help` to see all available commands

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
   # Your domain or IP address
   HOST_IP=your.domain.com
   
   # Generate a secure JWT secret
   JWT_SECRET=$(openssl rand -base64 64)
   
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
npx prisma migrate dev
npm run dev
```
</details>

### Production

<details>
<summary><strong>Standard ports (80/443)</strong></summary>

#### Requires sudo

5. **Enable privileged port binding (run once)**
```bash
   echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
```

6. **Start services**
```bash
   make up
```

7. **Access at** `https://your.domain.com`

</details>

#### High Ports (8080/8443) — For 42 Machines (no sudo required)

5. **Update `docker-compose.yml`**

Ports:   
```yaml
   ports:
     - "8080:80"
     - "8443:443"
```
   
   Backend environment:
```yaml
   - FRONT_URL=https://${HOST_IP}:8443
   - SITE_URL=https://${HOST_IP}:8443
   - FORTYTWO_CALLBACK=https://${HOST_IP}:8443/api/auth/42/callback
   - GOOGLE_CALLBACK_URL=https://${HOST_IP}:8443/api/oauth/google/callback
```
   
   Frontend build args:
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

### References

-   [WebSockets](https://websockets.readthedocs.io/en/stable/)
-   [Fastify](https://fastify.dev/docs/latest/)
-   [SQLite](https://sqlite.org/docs.html)
-   [Prisma](https://www.prisma.io/docs)
-   [Vite](https://vite.dev/guide/)
-   [Tailwind](https://tailwindcss.com/docs/installation/using-vite)
-   [Docker](https://docs.docker.com/manuals/)

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
