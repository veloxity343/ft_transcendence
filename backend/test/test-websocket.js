#!/usr/bin/env node

/**
 * WebSocket Test Client for Transcendence Backend
 * 
 * Tests all WebSocket functionality including:
 * - Connection/Authentication
 * - Game Matchmaking
 * - Tournament System
 * - Chat System
 * - AI Opponent
 */

const WebSocket = require('ws');
const readline = require('readline');

const WS_URL = 'ws://localhost:3000/ws';
const API_URL = 'http://localhost:3000';

// ANSI Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class WebSocketTestClient {
  constructor(token, username) {
    this.token = token;
    this.username = username;
    this.ws = null;
    this.gameId = null;
    this.tournamentId = null;
    this.connected = false;
  }

  log(message, color = colors.reset) {
    console.log(`${color}[${this.username}]${colors.reset} ${message}`);
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.log('Connecting to WebSocket...', colors.cyan);
      
      this.ws = new WebSocket(`${WS_URL}?token=${this.token}`);

      this.ws.on('open', () => {
        this.connected = true;
        this.log('✓ Connected to WebSocket', colors.green);
        resolve();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (err) {
          this.log(`Error parsing message: ${err.message}`, colors.red);
        }
      });

      this.ws.on('error', (error) => {
        this.log(`WebSocket error: ${error.message}`, colors.red);
        reject(error);
      });

      this.ws.on('close', () => {
        this.connected = false;
        this.log('Disconnected from WebSocket', colors.yellow);
      });
    });
  }

  handleMessage(message) {
    const { event, data } = message;

    switch (event) {
      case 'connected':
        this.log(`Connection confirmed (User ID: ${data.userId})`, colors.green);
        break;

      // ✅ ADD: Handle user status updates silently
      case 'user-statuses-updated':
        // Silently handle status updates to avoid "unhandled" messages
        break;

      // ✅ ADD: Chat events
      case 'chat:joined':
        this.log(`Joined chat room successfully`, colors.green);
        break;

      case 'chat:sent':
        this.log(`Message sent successfully`, colors.green);
        break;

      case 'chat:history':
        const msgCount = data.messages ? data.messages.length : 0;
        this.log(`Loaded ${msgCount} message(s) from chat history`, colors.cyan);
        break;

      case 'chat:message':
        this.log(`[${data.username}]: ${data.message}`, colors.cyan);
        break;

      case 'chat:system':
        this.log(`[SYSTEM]: ${data.message}`, colors.yellow);
        break;

      case 'chat:error':
        this.log(`Chat Error: ${data.message}`, colors.red);
        break;

      // ✅ ADD: Tournament events
      case 'tournament:created':
        this.tournamentId = data.tournament.id;  // ✅ FIX: Use data.tournament.id
        this.log(`Tournament created: ${data.tournament.name} (ID: ${data.tournament.id})`, colors.green);
        break;

      case 'tournament:joined':
        this.log(`Joined tournament ${data.tournamentId}`, colors.green);
        break;

      case 'tournament:player-joined':
        this.log(`Player joined tournament (${data.currentPlayers} players)`, colors.cyan);
        break;

      case 'tournament:started':
        this.log('Tournament started!', colors.green);
        break;

      case 'tournament:match-ready':
        this.log(`Your match is ready! Round ${data.round} vs ${data.opponent.name}`, colors.yellow);
        break;

      case 'tournament:match-completed':
        this.log(`Match completed in round ${data.round}`, colors.cyan);
        break;

      case 'tournament:round-started':
        this.log(`Round ${data.round} started!`, colors.yellow);
        break;

      case 'tournament:completed':
        this.log(`Tournament completed! Winner: ${data.winnerName}`, colors.green);
        break;

      case 'tournament:active-list':
        const count = data.tournaments ? data.tournaments.length : 0;
        this.log(`Found ${count} active tournament(s)`, colors.cyan);
        if (count > 0) {
          data.tournaments.forEach(t => {
            this.log(`  - ${t.name} (${t.currentPlayers}/${t.maxPlayers} players)`, colors.cyan);
          });
        }
        break;

      case 'tournament:error':
        this.log(`Tournament Error: ${data.message}`, colors.red);
        break;

      // ✅ ADD: Game events
      case 'game:joined':
        this.gameId = data.gameId;
        this.log(`Joined game ${data.gameId} as Player ${data.playerNumber}`, colors.green);
        break;

      case 'game:created':
        this.gameId = data.gameId;
        this.log(`Created private game ${data.gameId}`, colors.green);
        break;

      case 'game:ai-created':
        this.gameId = data.gameId;
        this.log(`Created AI game ${data.gameId} (difficulty: ${data.difficulty})`, colors.green);
        break;

      case 'game-starting':
        this.log('Game is starting in 3 seconds...', colors.yellow);
        this.log(`Player 1: ${data.player1.name}`, colors.cyan);
        this.log(`Player 2: ${data.player2.name}`, colors.cyan);
        break;

      case 'game-update':
        // Only log score updates, not every frame
        if (data.player1Score !== this.lastScore1 || data.player2Score !== this.lastScore2) {
          this.log(`Score: ${data.player1Score} - ${data.player2Score}`, colors.bright);
          this.lastScore1 = data.player1Score;
          this.lastScore2 = data.player2Score;
        }
        break;

      case 'game-ended':
        this.log(`Game ended! Winner: ${data.winnerId}`, colors.green);
        this.log(`Final Score: ${data.finalScore.player1} - ${data.finalScore.player2}`, colors.bright);
        this.gameId = null;
        break;

      case 'game-cancelled':
        this.log('Game was cancelled', colors.yellow);
        this.gameId = null;
        break;

      case 'game-invitation':
        this.log(`Game invitation from ${data.inviterName} (Game ID: ${data.gameId})`, colors.magenta);
        break;

      case 'game:error':
        this.log(`Game Error: ${data.message}`, colors.red);
        break;

      default:
        this.log(`Unhandled event: ${event}`, colors.yellow);
    }
  }

  send(event, data = {}) {
    if (!this.connected) {
      this.log('Not connected to WebSocket', colors.red);
      return;
    }

    this.ws.send(JSON.stringify({ event, data }));
  }

  // ==================== GAME ACTIONS ====================

  joinMatchmaking() {
    this.log('Joining matchmaking...', colors.cyan);
    this.send('game:join-matchmaking');
  }

  createPrivateGame() {
    this.log('Creating private game...', colors.cyan);
    this.send('game:create-private');
  }

  joinPrivateGame(gameId) {
    this.log(`Joining private game ${gameId}...`, colors.cyan);
    this.send('game:join-private', { gameId: parseInt(gameId) });
  }

  createAIGame(difficulty = 'medium') {
    this.log(`Creating AI game (difficulty: ${difficulty})...`, colors.cyan);
    this.send('game:create-ai', { difficulty });
  }

  movePaddle(direction) {
    if (!this.gameId) {
      this.log('Not in a game', colors.red);
      return;
    }
    this.send('game:move', { gameId: this.gameId, direction });
  }

  leaveGame() {
    this.log('Leaving game...', colors.cyan);
    this.send('game:leave');
    this.gameId = null;
  }

  // ==================== TOURNAMENT ACTIONS ====================

  createTournament(name, maxPlayers = 4) {
    this.log(`Creating tournament "${name}" (${maxPlayers} players)...`, colors.cyan);
    this.send('tournament:create', {
      name,
      maxPlayers: parseInt(maxPlayers),
      bracketType: 'single_elimination',
    });
  }

  joinTournament(tournamentId) {
    this.log(`Joining tournament ${tournamentId}...`, colors.cyan);
    this.send('tournament:join', { tournamentId: parseInt(tournamentId) });
  }

  startTournament(tournamentId) {
    this.log(`Starting tournament ${tournamentId}...`, colors.cyan);
    this.send('tournament:start', { tournamentId: parseInt(tournamentId) });
  }

  listActiveTournaments() {
    this.log('Requesting active tournaments...', colors.cyan);
    this.send('tournament:list-active');
  }

  // ==================== CHAT ACTIONS ====================

  joinChatRoom(roomId) {
    this.log(`Joining chat room ${roomId}...`, colors.cyan);
    this.send('chat:join-room', { roomId });
  }

  sendChatMessage(roomId, message) {
    this.send('chat:send-message', { roomId, message });
  }

  sendDirectMessage(targetUserId, message) {
    this.send('chat:send-dm', { targetUserId: parseInt(targetUserId), message });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// ==================== AUTHENTICATION ====================

async function authenticate(username, password) {
  try {
    const response = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.access_token) {
      return data.access_token;
    } else if (data.requires2FA) {
      throw new Error('2FA required (not supported in test client)');
    } else {
      throw new Error(data.message || 'Authentication failed');
    }
  } catch (err) {
    throw new Error(`Authentication failed: ${err.message}`);
  }
}

async function signup(email, username, password) {
  try {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, username, password }),
    });

    const data = await response.json();

    if (data.access_token) {
      return data.access_token;
    } else {
      throw new Error(data.message || 'Signup failed');
    }
  } catch (err) {
    throw new Error(`Signup failed: ${err.message}`);
  }
}

// ==================== INTERACTIVE CLI ====================

async function interactiveCLI() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const question = (query) => new Promise((resolve) => rl.question(query, resolve));

  console.log(`${colors.bright}${colors.blue}╔════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║  WebSocket Test Client for Transcendence  ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════╝${colors.reset}\n`);

  // Authentication
  const authChoice = await question('Do you want to (1) Sign In or (2) Sign Up? ');

  let token;
  let username;

  if (authChoice === '2') {
    const email = await question('Email: ');
    username = await question('Username: ');
    const password = await question('Password: ');

    try {
      token = await signup(email, username, password);
      console.log(`${colors.green}✓ Signed up successfully${colors.reset}\n`);
    } catch (err) {
      console.log(`${colors.red}✗ ${err.message}${colors.reset}`);
      rl.close();
      return;
    }
  } else {
    username = await question('Username: ');
    const password = await question('Password: ');

    try {
      token = await authenticate(username, password);
      console.log(`${colors.green}✓ Authenticated successfully${colors.reset}\n`);
    } catch (err) {
      console.log(`${colors.red}✗ ${err.message}${colors.reset}`);
      rl.close();
      return;
    }
  }

  // Create client and connect
  const client = new WebSocketTestClient(token, username);

  try {
    await client.connect();
  } catch (err) {
    console.log(`${colors.red}✗ Failed to connect: ${err.message}${colors.reset}`);
    rl.close();
    return;
  }

  // Interactive command loop
  console.log(`\n${colors.bright}Available commands:${colors.reset}`);
  console.log('  ${colors.cyan}game${colors.reset}       - Game commands');
  console.log('  ${colors.cyan}tournament${colors.reset} - Tournament commands');
  console.log('  ${colors.cyan}chat${colors.reset}       - Chat commands');
  console.log('  ${colors.cyan}help${colors.reset}       - Show help');
  console.log('  ${colors.cyan}quit${colors.reset}       - Exit\n');

  let running = true;

  while (running) {
    const command = await question('> ');
    const [cmd, ...args] = command.trim().split(' ');

    switch (cmd.toLowerCase()) {
      case 'game':
        await handleGameCommands(client, args, question);
        break;

      case 'tournament':
        await handleTournamentCommands(client, args, question);
        break;

      case 'chat':
        await handleChatCommands(client, args, question);
        break;

      case 'help':
        showHelp();
        break;

      case 'quit':
      case 'exit':
        running = false;
        break;

      default:
        console.log(`${colors.red}Unknown command. Type 'help' for available commands.${colors.reset}`);
    }
  }

  client.disconnect();
  rl.close();
}

async function handleGameCommands(client, args, question) {
  const [subCmd, ...subArgs] = args;

  switch (subCmd) {
    case 'matchmaking':
    case 'mm':
      client.joinMatchmaking();
      break;

    case 'private':
      if (subArgs[0] === 'create') {
        client.createPrivateGame();
      } else if (subArgs[0] === 'join') {
        const gameId = subArgs[1] || await question('Game ID: ');
        client.joinPrivateGame(gameId);
      } else {
        console.log('Usage: game private [create|join <gameId>]');
      }
      break;

    case 'ai':
      const difficulty = subArgs[0] || 'medium';
      client.createAIGame(difficulty);
      break;

    case 'move':
      const direction = subArgs[0];
      if (direction === 'up') {
        client.movePaddle(1);
      } else if (direction === 'down') {
        client.movePaddle(2);
      } else if (direction === 'stop') {
        client.movePaddle(0);
      } else {
        console.log('Usage: game move [up|down|stop]');
      }
      break;

    case 'leave':
      client.leaveGame();
      break;

    default:
      console.log('Game commands:');
      console.log('  game matchmaking          - Join matchmaking');
      console.log('  game private create       - Create private game');
      console.log('  game private join <id>    - Join private game');
      console.log('  game ai [difficulty]      - Play vs AI (easy/medium/hard)');
      console.log('  game move [up|down|stop]  - Move paddle');
      console.log('  game leave                - Leave current game');
  }
}

async function handleTournamentCommands(client, args, question) {
  const [subCmd, ...subArgs] = args;

  switch (subCmd) {
    case 'create':
      const name = subArgs.join(' ') || await question('Tournament name: ');
      const maxPlayers = await question('Max players (4/8/16): ');
      client.createTournament(name, maxPlayers);
      break;

    case 'join':
      const tournamentId = subArgs[0] || await question('Tournament ID: ');
      client.joinTournament(tournamentId);
      break;

    case 'start':
      const startId = subArgs[0] || await question('Tournament ID: ');
      client.startTournament(startId);
      break;

    case 'list':
      client.listActiveTournaments();
      break;

    default:
      console.log('Tournament commands:');
      console.log('  tournament create          - Create tournament');
      console.log('  tournament join <id>       - Join tournament');
      console.log('  tournament start <id>      - Start tournament');
      console.log('  tournament list            - List active tournaments');
  }
}

async function handleChatCommands(client, args, question) {
  const [subCmd, ...subArgs] = args;

  switch (subCmd) {
    case 'join':
      const roomId = subArgs[0] || await question('Room ID: ');
      client.joinChatRoom(roomId);
      break;

    case 'send':
      const chatRoomId = subArgs[0] || await question('Room ID: ');
      const message = subArgs.slice(1).join(' ') || await question('Message: ');
      client.sendChatMessage(chatRoomId, message);
      break;

    case 'dm':
      const targetId = subArgs[0] || await question('User ID: ');
      const dmMessage = subArgs.slice(1).join(' ') || await question('Message: ');
      client.sendDirectMessage(targetId, dmMessage);
      break;

    default:
      console.log('Chat commands:');
      console.log('  chat join <roomId>         - Join chat room');
      console.log('  chat send <roomId> <msg>   - Send message');
      console.log('  chat dm <userId> <msg>     - Send direct message');
  }
}

function showHelp() {
  console.log(`\n${colors.bright}Available commands:${colors.reset}`);
  console.log('\nGame:');
  console.log('  game matchmaking          - Join matchmaking');
  console.log('  game private create       - Create private game');
  console.log('  game private join <id>    - Join private game');
  console.log('  game ai [difficulty]      - Play vs AI');
  console.log('  game move [up|down|stop]  - Move paddle');
  console.log('  game leave                - Leave current game');
  console.log('\nTournament:');
  console.log('  tournament create          - Create tournament');
  console.log('  tournament join <id>       - Join tournament');
  console.log('  tournament start <id>      - Start tournament');
  console.log('  tournament list            - List active tournaments');
  console.log('\nChat:');
  console.log('  chat join <roomId>         - Join chat room');
  console.log('  chat send <roomId> <msg>   - Send message');
  console.log('  chat dm <userId> <msg>     - Send DM');
  console.log('\nOther:');
  console.log('  help                       - Show this help');
  console.log('  quit                       - Exit\n');
}

// ==================== MAIN ====================

if (require.main === module) {
  interactiveCLI().catch((err) => {
    console.error(`${colors.red}Fatal error: ${err.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = { WebSocketTestClient, authenticate, signup };
