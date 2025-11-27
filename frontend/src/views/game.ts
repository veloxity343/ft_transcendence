import { wsClient } from '../websocket/client';
import { router } from '../router';
import { GameRenderer } from '../game/renderer';
import { GameController } from '../game/controller';
import { showToast } from '../utils/toast';
import { storage } from '../utils/storage';
import type { WSMessage } from '../types';

export function GameView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen p-8';

  const user = storage.getUserData();

  container.innerHTML = `
    <div class="max-w-7xl mx-auto">
      <!-- Game Mode Selection -->
      <div id="gameModeSelection" class="space-y-6">
        <h1 class="text-4xl font-bold text-center mb-8">
          <span class="text-game-accent">Choose</span> Your Mode
        </h1>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Quick Play -->
          <button id="quickPlayBtn" class="card hover:border-game-accent transition-all duration-300 text-center p-8">
            <div class="text-6xl mb-4">⚡</div>
            <h2 class="text-2xl font-bold mb-2" style="color: var(--color-retro-dark)">Quick Play</h2>
            <p style="color: var(--color-retro-brown)">Find a random opponent</p>
          </button>

          <!-- AI Opponent -->
          <button id="aiGameBtn" class="card hover:border-game-accent transition-all duration-300 text-center p-8">
            <div class="text-6xl mb-4">🤖</div>
            <h2 class="text-2xl font-bold mb-2" style="color: var(--color-retro-dark)">AI Opponent</h2>
            <p style="color: var(--color-retro-brown)">Play against the computer</p>
          </button>

          <!-- Private Game -->
          <button id="privateGameBtn" class="card hover:border-game-accent transition-all duration-300 text-center p-8">
            <div class="text-6xl mb-4">🔒</div>
            <h2 class="text-2xl font-bold mb-2" style="color: var(--color-retro-dark)">Private Game</h2>
            <p style="color: var(--color-retro-brown)">Create a game for friends</p>
          </button>
        </div>
      </div>

      <!-- AI Difficulty Selection (hidden by default) -->
      <div id="aiDifficultySelection" class="hidden space-y-6">
        <h1 class="text-4xl font-bold text-center mb-8">
          <span class="text-game-accent">Select</span> Difficulty
        </h1>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <button data-difficulty="easy" class="difficulty-btn card hover:border-game-accent transition-all duration-300 text-center p-8">
            <div class="text-6xl mb-4">😊</div>
            <h2 class="text-2xl font-bold mb-2" style="color: var(--color-retro-dark)">Easy</h2>
            <p style="color: var(--color-retro-brown)">Perfect for beginners</p>
          </button>

          <button data-difficulty="medium" class="difficulty-btn card hover:border-game-accent transition-all duration-300 text-center p-8">
            <div class="text-6xl mb-4">😐</div>
            <h2 class="text-2xl font-bold mb-2" style="color: var(--color-retro-dark)">Medium</h2>
            <p style="color: var(--color-retro-brown)">A fair challenge</p>
          </button>

          <button data-difficulty="hard" class="difficulty-btn card hover:border-game-accent transition-all duration-300 text-center p-8">
            <div class="text-6xl mb-4">😈</div>
            <h2 class="text-2xl font-bold mb-2" style="color: var(--color-retro-dark)">Hard</h2>
            <p style="color: var(--color-retro-brown)">For the skilled</p>
          </button>
        </div>

        <div class="text-center">
          <button id="backFromAIBtn" class="btn-outline">Back</button>
        </div>
      </div>

      <!-- Game Container (hidden by default) -->
      <div id="gameContainer" class="hidden">
        <div class="card">
          <!-- Game Info -->
          <div id="gameInfo" class="mb-4 text-center">
            <div class="flex justify-between items-center mb-4">
              <div class="flex-1">
                <div id="player1Name" class="text-xl font-bold" style="color: var(--color-retro-dark)">Player 1</div>
                <div id="player1Score" class="text-4xl font-bold text-game-accent">0</div>
              </div>
              <div class="text-2xl" style="color: var(--color-retro-brown)">VS</div>
              <div class="flex-1">
                <div id="player2Name" class="text-xl font-bold" style="color: var(--color-retro-dark)">Player 2</div>
                <div id="player2Score" class="text-4xl font-bold" style="color: var(--color-amber)">0</div>
              </div>
            </div>
            <div id="gameStatus" class="text-lg" style="color: var(--color-retro-brown)"></div>
          </div>

          <!-- Canvas -->
          <div class="flex justify-center">
            <canvas id="gameCanvas" class="border-2 rounded-lg" style="border-color: var(--color-retro-tan)"></canvas>
          </div>

          <!-- Controls Info -->
          <div class="mt-4 text-center text-sm" style="color: var(--color-retro-brown)">
            <p>Use <kbd class="px-2 py-1 rounded" style="background-color: var(--color-retro-tan)">W</kbd> / <kbd class="px-2 py-1 rounded" style="background-color: var(--color-retro-tan)">S</kbd> or <kbd class="px-2 py-1 rounded" style="background-color: var(--color-retro-tan)">↑</kbd> / <kbd class="px-2 py-1 rounded" style="background-color: var(--color-retro-tan)">↓</kbd> to move</p>
          </div>

          <!-- Leave Game Button -->
          <div class="mt-4 text-center">
            <button id="leaveGameBtn" class="btn-outline">Leave Game</button>
          </div>
        </div>
      </div>

      <!-- Waiting Screen -->
      <div id="waitingScreen" class="hidden">
        <div class="card text-center p-12">
          <div class="text-6xl mb-4 animate-pulse">⏳</div>
          <h2 class="text-3xl font-bold mb-4" style="color: var(--color-retro-dark)">Waiting for opponent...</h2>
          <p style="color: var(--color-retro-brown)" class="mb-6">You'll be matched with another player soon</p>
          <div id="gameIdDisplay" class="text-sm mb-4" style="color: var(--color-retro-brown)"></div>
          <button id="cancelWaitBtn" class="btn-outline">Cancel</button>
        </div>
      </div>

      <!-- Private Game Invite -->
      <div id="privateGameInvite" class="hidden">
        <div class="card text-center p-12">
          <div class="text-6xl mb-4">🔗</div>
          <h2 class="text-3xl font-bold mb-4" style="color: var(--color-retro-dark)">Private Game Created</h2>
          <p style="color: var(--color-retro-brown)" class="mb-4">Share this Game ID with your friend:</p>
          <div class="p-4 rounded-lg mb-6" style="background-color: var(--color-retro-tan)">
            <div id="privateGameId" class="text-3xl font-bold text-game-accent font-mono"></div>
          </div>
          <button id="copyGameIdBtn" class="btn-primary mb-4">Copy Game ID</button>
          <p class="text-sm mb-4" style="color: var(--color-retro-brown)">Waiting for opponent to join...</p>
          <button id="cancelPrivateBtn" class="btn-outline">Cancel</button>
        </div>
      </div>
    </div>
  `;

  // State
  let currentGameId: number | null = null;
  let currentPlayerNumber: 1 | 2 | null = null;
  let renderer: GameRenderer | null = null;
  let controller: GameController | null = null;

  // Elements
  const gameModeSelection = container.querySelector('#gameModeSelection') as HTMLElement;
  const aiDifficultySelection = container.querySelector('#aiDifficultySelection') as HTMLElement;
  const gameContainer = container.querySelector('#gameContainer') as HTMLElement;
  const waitingScreen = container.querySelector('#waitingScreen') as HTMLElement;
  const privateGameInvite = container.querySelector('#privateGameInvite') as HTMLElement;

  const canvas = container.querySelector('#gameCanvas') as HTMLCanvasElement;
  const player1Name = container.querySelector('#player1Name') as HTMLElement;
  const player2Name = container.querySelector('#player2Name') as HTMLElement;
  const player1Score = container.querySelector('#player1Score') as HTMLElement;
  const player2Score = container.querySelector('#player2Score') as HTMLElement;
  const gameStatus = container.querySelector('#gameStatus') as HTMLElement;
  const gameIdDisplay = container.querySelector('#gameIdDisplay') as HTMLElement;
  const privateGameId = container.querySelector('#privateGameId') as HTMLElement;

  // Show/Hide helpers
  const showScreen = (screen: 'menu' | 'aiSelect' | 'waiting' | 'game' | 'private') => {
    gameModeSelection.classList.add('hidden');
    aiDifficultySelection.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    gameContainer.classList.add('hidden');
    privateGameInvite.classList.add('hidden');

    switch (screen) {
      case 'menu':
        gameModeSelection.classList.remove('hidden');
        break;
      case 'aiSelect':
        aiDifficultySelection.classList.remove('hidden');
        break;
      case 'waiting':
        waitingScreen.classList.remove('hidden');
        break;
      case 'game':
        gameContainer.classList.remove('hidden');
        initializeGame();
        break;
      case 'private':
        privateGameInvite.classList.remove('hidden');
        break;
    }
  };

  // Initialize game canvas and controller
  const initializeGame = () => {
    if (!renderer) {
      renderer = new GameRenderer(canvas);
    }
    if (!controller) {
      controller = new GameController();
      controller.setPaddleMoveHandler((direction) => {
        if (currentGameId) {
          // Map direction to backend format: 0 = stop, 1 = up, 2 = down
          let directionCode = 0;
          if (direction === 'up') directionCode = 1;
          else if (direction === 'down') directionCode = 2;

          wsClient.send('game:move', {
            gameId: currentGameId,
            direction: directionCode,
          });
        }
      });
    }
  };

  // WebSocket Event Handlers
  const handleGameJoined = (message: WSMessage) => {
    const data = message.payload;
    currentGameId = data.gameId;
    currentPlayerNumber = data.playerNumber;
    
    showScreen('waiting');
    gameIdDisplay.textContent = `Game ID: ${data.gameId}`;
    
    showToast(`Joined as Player ${data.playerNumber}`, 'success');
  };

  const handleGameCreated = (message: WSMessage) => {
    const data = message.payload;
    currentGameId = data.gameId;
    currentPlayerNumber = data.playerNumber;
    
    showScreen('private');
    privateGameId.textContent = data.gameId.toString();
  };

  const handleGameStarting = (message: WSMessage) => {
    const data = message.payload;
    player1Name.textContent = data.player1.name;
    player2Name.textContent = data.player2.name;
    player1Score.textContent = '0';
    player2Score.textContent = '0';
    
    showScreen('game');
    gameStatus.textContent = 'Game starting...';
  };

  const handleGameUpdate = (message: WSMessage) => {
    if (!renderer) return;
    
    const data = message.payload;

    // Update scores - backend uses score1/score2, not player1Score/player2Score
    player1Score.textContent = data.player1Score.toString();
    player2Score.textContent = data.player2Score.toString();

    // Update status
    if (data.status === 'waiting') {
      gameStatus.textContent = 'Waiting for opponent...';
    } else if (data.status === 'countdown') {
      gameStatus.textContent = `Starting in ${data.countdownValue || 3}...`;
    } else if (data.status === 'playing') {
      gameStatus.textContent = 'Playing';
    } else if (data.status === 'paused') {
      gameStatus.textContent = 'Paused';
    } else if (data.status === 'finished') {
      gameStatus.textContent = 'Game Finished';
    }

    // Convert backend format to frontend GameState format
    const gameState = {
      ball: {
        x: data.ballX,
        y: data.ballY,
        vx: 0, // Not provided by backend
        vy: 0, // Not provided by backend
        radius: 8,
      },
      paddle1: {
        x: 3, // Left side
        y: data.paddleLeft,
        width: 10,
        height: 10,
        vy: 0,
      },
      paddle2: {
        x: 97, // Right side
        y: data.paddleRight,
        width: 10,
        height: 10,
        vy: 0,
      },
      score1: data.player1Score,
      score2: data.player2Score,
      status: data.status,
      countdownValue: data.countdownValue,
    };

    // Render game state
    renderer.drawGameState(gameState);
  };

  const handleGameEnded = (message: WSMessage) => {
    const data = message.payload;
    gameStatus.textContent = 'Game Over!';
    
    const winnerText = data.winnerId === user?.id ? 'You Won!' : 'You Lost!';
    showToast(winnerText, data.winnerId === user?.id ? 'success' : 'error');

    setTimeout(() => {
      cleanup();
      showScreen('menu');
    }, 5000);
  };

  const handleGameCancelled = () => {
    showToast('Game was cancelled', 'info');
    cleanup();
    showScreen('menu');
  };

  const handleGameError = (message: WSMessage) => {
    const data = message.payload;
    showToast(data.message || 'Game error occurred', 'error');
    cleanup();
    showScreen('menu');
  };

  // Register WebSocket handlers
  const unsubscribers: (() => void)[] = [];

  unsubscribers.push(wsClient.on('game:joined', handleGameJoined));
  unsubscribers.push(wsClient.on('game:created', handleGameCreated));
  unsubscribers.push(wsClient.on('game:ai-created', handleGameJoined));
  unsubscribers.push(wsClient.on('game-starting', handleGameStarting));
  unsubscribers.push(wsClient.on('game-update', handleGameUpdate));
  unsubscribers.push(wsClient.on('game-ended', handleGameEnded));
  unsubscribers.push(wsClient.on('game-cancelled', handleGameCancelled));
  unsubscribers.push(wsClient.on('game:error', handleGameError));

  // Button Handlers
  container.querySelector('#quickPlayBtn')?.addEventListener('click', () => {
    wsClient.send('game:join-matchmaking', {});
  });

  container.querySelector('#aiGameBtn')?.addEventListener('click', () => {
    showScreen('aiSelect');
  });

  container.querySelector('#privateGameBtn')?.addEventListener('click', () => {
    wsClient.send('game:create-private', {});
  });

  container.querySelector('#backFromAIBtn')?.addEventListener('click', () => {
    showScreen('menu');
  });

  // AI Difficulty buttons
  container.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const difficulty = (e.currentTarget as HTMLElement).dataset.difficulty;
      wsClient.send('game:create-ai', { difficulty });
    });
  });

  container.querySelector('#cancelWaitBtn')?.addEventListener('click', () => {
    wsClient.send('game:leave', {});
    cleanup();
    showScreen('menu');
  });

  container.querySelector('#cancelPrivateBtn')?.addEventListener('click', () => {
    wsClient.send('game:leave', {});
    cleanup();
    showScreen('menu');
  });

  container.querySelector('#copyGameIdBtn')?.addEventListener('click', () => {
    const gameId = privateGameId.textContent;
    if (gameId) {
      navigator.clipboard.writeText(gameId);
      showToast('Game ID copied to clipboard!', 'success');
    }
  });

  container.querySelector('#leaveGameBtn')?.addEventListener('click', () => {
    wsClient.send('game:leave', {});
    cleanup();
    showScreen('menu');
  });

  // Cleanup function
  const cleanup = () => {
    currentGameId = null;
    currentPlayerNumber = null;
    
    if (controller) {
      controller.destroy();
      controller = null;
    }

    // Unsubscribe from WebSocket events
    unsubscribers.forEach(unsub => unsub());
  };

  // Connect to WebSocket if not connected
  if (!wsClient.isConnected()) {
    wsClient.connect();
  }

  return container;
}
