import { wsClient } from '../websocket/client';
import { GameRenderer } from '../game/renderer';
import { GAME_THEMES } from '../game/themes';
import { showToast } from '../utils/toast';
import { storage } from '../utils/storage';
import { soundManager } from '../utils/sound';
import { router } from '../router';

// SVG Icons
const icons = {
  quickPlay: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
  ai: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="10" rx="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path></svg>`,
  private: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`,
  local: `<svg class="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
  back: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"></path></svg>`,
  copy: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`,
  spinner: `<svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg>`,
  forfeit: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path><line x1="4" y1="22" x2="4" y2="15"></line></svg>`,
  reconnect: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"></polyline><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path></svg>`,
};

// Helper to wait for WebSocket connection
async function waitForConnection(timeout = 5000): Promise<boolean> {
  if (wsClient.isConnected()) {
    return true;
  }
  
  const connected = await wsClient.connect();
  return connected;
}

export function GameView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 p-4 md:p-8 flex flex-col items-center';

  // Check for tournament theme preference first, then fall back to saved game theme
  const tournamentTheme = localStorage.getItem('tournamentTheme');
  const savedGameTheme = localStorage.getItem('gameTheme') || 'atari';
  const initialTheme = tournamentTheme || savedGameTheme;

  const themeOptions = Object.entries(GAME_THEMES).map(([key, theme]) => 
    `<option value="${key}" ${key === initialTheme ? 'selected' : ''}>${theme.name}</option>`
  ).join('');

  container.innerHTML = `
    <!-- Reconnect Banner -->
    <div id="reconnectBanner" class="hidden fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 max-w-lg w-full px-4">
      <div class="glass-card p-4 border-2 border-yellow-500 shadow-xl bg-yellow-50/95">
        <div class="flex items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
            <div>
              <div class="font-bold text-yellow-700">You still have a game in progress</div>
              <div class="text-sm text-yellow-600">Time remaining: <span id="reconnectTimer" class="font-mono font-bold">30s</span></div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button id="reconnectBtn" class="btn-primary flex items-center gap-2 text-sm">${icons.reconnect} Rejoin</button>
            <button id="dismissReconnectBtn" class="btn-outline text-sm px-2 py-1 hover:bg-red-50 hover:text-red-500" title="Forfeit game">✕</button>
          </div>
        </div>
      </div>
    </div>

    <div id="gameModeSelection" class="max-w-4xl w-full">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-2">
          <span class="text-blue animate-glow">SELECT</span> <span class="text-navy">MODE</span>
        </h1>
        <div id="connectionStatus" class="text-sm mt-2"></div>
      </div>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button id="quickPlayBtn" class="game-mode-btn">${icons.quickPlay}<div class="game-mode-label">Quick Play</div></button>
        <button id="aiGameBtn" class="game-mode-btn">${icons.ai}<div class="game-mode-label">vs AI</div></button>
        <button id="privateGameBtn" class="game-mode-btn">${icons.private}<div class="game-mode-label">Private</div></button>
        <button id="localGameBtn" class="game-mode-btn">${icons.local}<div class="game-mode-label">Local 2P</div></button>
      </div>
      <div class="mt-8 flex justify-center">
        <div class="glass-card p-4 flex items-center gap-4">
          <label class="text-navy font-semibold">Theme:</label>
          <select id="themeSelect" class="input-glass px-4 py-2">${themeOptions}</select>
        </div>
      </div>
    </div>

    <div id="waitingScreen" class="hidden max-w-2xl w-full">
      <div class="glass-card p-8 text-center">
        <div class="flex justify-center mb-4">${icons.spinner}</div>
        <h2 id="waitingTitle" class="text-2xl font-bold text-navy mb-2">Searching for opponent...</h2>
        <p id="waitingMessage" class="text-navy-muted mb-4">Please wait while we find you a match</p>
        <div id="privateGameInfo" class="hidden mb-4 p-4 bg-white/50 rounded-lg">
          <p class="text-sm text-navy-muted mb-2">Share this Game ID with your friend:</p>
          <div class="flex items-center justify-center gap-2">
            <span id="gameIdDisplay" class="text-2xl font-mono font-bold text-blue"></span>
            <button id="copyGameIdBtn" class="btn-outline p-2">${icons.copy}</button>
          </div>
        </div>
        <button id="cancelWaitingBtn" class="btn-outline">${icons.back} Cancel</button>
      </div>
    </div>

    <div id="joinPrivateScreen" class="hidden max-w-md w-full">
      <div class="glass-card p-8">
        <h2 class="text-2xl font-bold text-navy text-center mb-6">Join Private Game</h2>
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2 text-navy">Game ID</label>
          <input type="number" id="joinGameIdInput" class="input-glass w-full" placeholder="Enter Game ID">
        </div>
        <div class="flex gap-4">
          <button id="joinPrivateBtn" class="btn-primary flex-1">Join Game</button>
          <button id="backFromJoinBtn" class="btn-outline">${icons.back}</button>
        </div>
        <div class="divider-glass my-4"></div>
        <button id="createPrivateBtn" class="btn-outline w-full">Or Create New Private Game</button>
      </div>
    </div>

    <div id="aiDifficultySelection" class="hidden max-w-2xl w-full">
      <div class="text-center mb-8"><h1 class="text-3xl font-bold"><span class="text-blue">SELECT</span> <span class="text-navy">DIFFICULTY</span></h1></div>
      <div class="grid grid-cols-3 gap-4">
        <button data-difficulty="easy" class="difficulty-btn glass-card p-6 text-center cursor-pointer hover:border-green-500 transition-all"><div class="text-4xl mb-2 text-green-500">I</div><div class="font-bold text-navy">Easy</div><p class="text-xs text-navy-muted mt-1">Relaxed gameplay</p></button>
        <button data-difficulty="medium" class="difficulty-btn glass-card p-6 text-center cursor-pointer hover:border-blue transition-all"><div class="text-4xl mb-2 text-blue">II</div><div class="font-bold text-navy">Medium</div><p class="text-xs text-navy-muted mt-1">Balanced challenge</p></button>
        <button data-difficulty="hard" class="difficulty-btn glass-card p-6 text-center cursor-pointer hover:border-red-500 transition-all"><div class="text-4xl mb-2 text-red-500">III</div><div class="font-bold text-navy">Hard</div><p class="text-xs text-navy-muted mt-1">Expert level</p></button>
      </div>
      <div class="text-center mt-6"><button id="backFromAIBtn" class="btn-outline">${icons.back} Back</button></div>
    </div>

    <div id="gameContainer" class="hidden max-w-4xl w-full">
      <div class="arcade-cabinet">
        <div class="arcade-bezel">
        <div class="arcade-controls-info"><div id="controlsDisplay" class="flex justify-center gap-8"><div class="control-group"><kbd>W</kbd><kbd>S</kbd><span class="control-label">or</span><kbd>↑</kbd><kbd>↓</kbd></div></div></div>
          <div class="arcade-marquee">
            <div class="flex justify-between items-center px-8">
              <div class="text-center"><div id="player1Label" class="text-xs text-gray-400 uppercase">Player 1</div><div id="player1Score" class="text-4xl font-bold text-white font-mono">0</div></div>
              <div class="text-lg text-gray-500">VS</div>
              <div class="text-center"><div id="player2Label" class="text-xs text-gray-400 uppercase">Player 2</div><div id="player2Score" class="text-4xl font-bold text-white font-mono">0</div></div>
            </div>
          </div>
          <div class="arcade-screen-frame">
            <div id="canvasContainer" class="arcade-screen relative" tabindex="0">
              <canvas id="gameCanvas"></canvas>
              <!-- Opponent Disconnected Overlay -->
              <div id="opponentDisconnectedOverlay" class="hidden absolute inset-0 bg-black/60 flex items-center justify-center z-40">
                <div class="glass-card p-6 text-center bg-white/90">
                  <h3 class="text-xl font-bold text-yellow-600 mb-2">⚠️ Opponent Disconnected</h3>
                  <p class="text-navy-muted mb-2">Waiting for them to reconnect...</p>
                  <div id="opponentReconnectTimer" class="text-3xl font-mono font-bold text-navy">30</div>
                  <p class="text-xs text-navy-muted mt-2">Auto-win if they don't return</p>
                </div>
              </div>
            </div>
          </div>
          <div id="gameStatusBar" class="arcade-status"><span class="status-text">Ready</span></div>
        </div>
        <div class="arcade-controls">
          <button id="leaveGameBtn" class="btn-outline">${icons.back} Leave</button>
          <button id="forfeitGameBtn" class="btn-outline text-red-500 hover:bg-red-50">${icons.forfeit} Forfeit</button>
        </div>
      </div>
    </div>

    <style>
      .game-mode-btn{background:rgba(255,255,255,0.4);backdrop-filter:blur(10px);border:2px solid rgba(255,255,255,0.5);border-radius:20px;padding:1.5rem;text-align:center;cursor:pointer;transition:all 0.3s;display:flex;flex-direction:column;align-items:center;gap:0.5rem}
      .game-mode-btn:hover{transform:translateY(-4px);border-color:var(--color-blue);box-shadow:0 8px 24px rgba(74,124,201,0.2)}
      .game-mode-btn:disabled{opacity:0.5;cursor:not-allowed;transform:none}
      .game-mode-btn svg{color:var(--color-blue)}
      .game-mode-label{font-weight:600;color:var(--color-navy);font-size:0.875rem}
      .arcade-cabinet{background:linear-gradient(180deg,#2a2a35 0%,#1a1a22 100%);border-radius:24px;padding:1.5rem;box-shadow:0 20px 60px rgba(0,0,0,0.4)}
      .arcade-bezel{background:linear-gradient(180deg,#1a1a22 0%,#0a0a0f 100%);border-radius:16px;padding:1rem;border:3px solid #3a3a45}
      .arcade-marquee{background:#0a0a0f;border-radius:8px 8px 0 0;padding:0.75rem;margin-bottom:0.5rem}
      .arcade-screen-frame{background:#000;border-radius:8px;padding:4px}
      .arcade-screen{background:#000;border-radius:6px;overflow:hidden;position:relative}
      .arcade-screen:focus{outline:none;box-shadow:0 0 0 2px #4A7CC9}
      .arcade-screen canvas{display:block;width:100%;height:auto}
      .arcade-status{background:#0a0a0f;border-radius:0 0 8px 8px;padding:0.5rem;text-align:center;margin-top:0.5rem}
      .status-text{color:#4a4a5a;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.1em}
      .status-text.playing{color:#4ade80}
      .status-text.waiting{color:#fbbf24}
      .status-text.disconnected{color:#ef4444}
      .arcade-controls-info{padding:1rem;text-align:center}
      .control-group{display:flex;align-items:center;gap:0.25rem}
      .control-group kbd{background:#3a3a45;color:#9a9aaa;padding:0.25rem 0.5rem;border-radius:4px;font-size:0.75rem;border:1px solid #4a4a55}
      .control-label{color:#5a5a6a;font-size:0.75rem;margin:0 0.25rem}
      .arcade-controls{display:flex;justify-content:center;gap:1rem;padding:1rem}
      @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      .animate-spin{animation:spin 1s linear infinite}
    </style>
  `;

  // State
  let gameId: number | null = null;
  let gameEnded = false;
  let playerNumber: 1 | 2 | null = null;
  let renderer: GameRenderer | null = null;
  let currentTheme = initialTheme;
  let isLocalGame = false;
  let currentDirection = 0;
  let currentDirectionP1 = 0;
  let currentDirectionP2 = 0;
  const keysPressed = new Set<string>();
  const unsubscribers: (() => void)[] = [];
  let lastScore1 = 0;
  let lastScore2 = 0;
  let tournamentContext: {
    tournamentId: number;
    tournamentName?: string;
    round: number;
    matchId: string;
    isLocalTournament: boolean;
  } | null = null;
  let hasCheckedActiveGame = false;

  // Reconnection state
  let reconnectableGameId: number | null = null;
  let reconnectDeadline: Date | null = null;
  let reconnectTimerInterval: ReturnType<typeof setInterval> | null = null;
  let opponentReconnectTimerInterval: ReturnType<typeof setInterval> | null = null;

  // Elements
  const gameModeSelection = container.querySelector('#gameModeSelection') as HTMLElement;
  const waitingScreen = container.querySelector('#waitingScreen') as HTMLElement;
  const joinPrivateScreen = container.querySelector('#joinPrivateScreen') as HTMLElement;
  const aiDifficultySelection = container.querySelector('#aiDifficultySelection') as HTMLElement;
  const gameContainer = container.querySelector('#gameContainer') as HTMLElement;
  const connectionStatus = container.querySelector('#connectionStatus') as HTMLElement;
  const themeSelect = container.querySelector('#themeSelect') as HTMLSelectElement;
  const canvas = container.querySelector('#gameCanvas') as HTMLCanvasElement;
  const canvasContainer = container.querySelector('#canvasContainer') as HTMLElement;
  const player1Score = container.querySelector('#player1Score') as HTMLElement;
  const player2Score = container.querySelector('#player2Score') as HTMLElement;
  const player1Label = container.querySelector('#player1Label') as HTMLElement;
  const player2Label = container.querySelector('#player2Label') as HTMLElement;
  const gameStatusBar = container.querySelector('#gameStatusBar') as HTMLElement;
  const controlsDisplay = container.querySelector('#controlsDisplay') as HTMLElement;
  const waitingTitle = container.querySelector('#waitingTitle') as HTMLElement;
  const waitingMessage = container.querySelector('#waitingMessage') as HTMLElement;
  const privateGameInfo = container.querySelector('#privateGameInfo') as HTMLElement;
  const gameIdDisplay = container.querySelector('#gameIdDisplay') as HTMLElement;
  const joinGameIdInput = container.querySelector('#joinGameIdInput') as HTMLInputElement;
  
  // Reconnection elements
  const reconnectBanner = container.querySelector('#reconnectBanner') as HTMLElement;
  const reconnectTimer = container.querySelector('#reconnectTimer') as HTMLElement;
  const opponentDisconnectedOverlay = container.querySelector('#opponentDisconnectedOverlay') as HTMLElement;
  const opponentReconnectTimer = container.querySelector('#opponentReconnectTimer') as HTMLElement;

  // Reconnection helper functions
  const showReconnectBanner = (gameIdToReconnect: number, deadline: Date) => {
    reconnectableGameId = gameIdToReconnect;
    reconnectDeadline = deadline;
    reconnectBanner.classList.remove('hidden');
    
    updateReconnectTimer();
    if (reconnectTimerInterval) clearInterval(reconnectTimerInterval);
    reconnectTimerInterval = setInterval(updateReconnectTimer, 1000);
  };

  const hideReconnectBanner = () => {
    reconnectBanner.classList.add('hidden');
    reconnectableGameId = null;
    reconnectDeadline = null;
    if (reconnectTimerInterval) {
      clearInterval(reconnectTimerInterval);
      reconnectTimerInterval = null;
    }
  };

  const updateReconnectTimer = () => {
    if (!reconnectDeadline) return;
    
    const remaining = Math.max(0, reconnectDeadline.getTime() - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    
    reconnectTimer.textContent = `${seconds}s`;
    
    if (remaining <= 0) {
      hideReconnectBanner();
      showToast('Reconnection window expired', 'error');
    }
  };

  const showOpponentDisconnected = (deadline: Date) => {
    opponentDisconnectedOverlay.classList.remove('hidden');
    updateStatus('Opponent disconnected', 'disconnected');
    
    const updateTimer = () => {
      const remaining = Math.max(0, deadline.getTime() - Date.now());
      const seconds = Math.ceil(remaining / 1000);
      opponentReconnectTimer.textContent = seconds.toString();
      
      if (remaining <= 0) {
        hideOpponentDisconnected();
      }
    };
    
    updateTimer();
    if (opponentReconnectTimerInterval) clearInterval(opponentReconnectTimerInterval);
    opponentReconnectTimerInterval = setInterval(updateTimer, 1000);
  };

  const hideOpponentDisconnected = () => {
    opponentDisconnectedOverlay.classList.add('hidden');
    if (opponentReconnectTimerInterval) {
      clearInterval(opponentReconnectTimerInterval);
      opponentReconnectTimerInterval = null;
    }
    updateStatus('Playing', 'playing');
  };

  // Update connection status display
  const updateConnectionStatus = () => {
    if (wsClient.isConnected()) {
      connectionStatus.innerHTML = '<span style="color: #22c55e;">● Connected</span>';
      enableButtons(true);
    } else {
      connectionStatus.innerHTML = '<span style="color: #ef4444;">○ Connecting...</span>';
      enableButtons(false);
    }
  };

  // Enable/disable mode buttons
  const enableButtons = (enabled: boolean) => {
    const buttons = container.querySelectorAll('.game-mode-btn');
    buttons.forEach(btn => {
      (btn as HTMLButtonElement).disabled = !enabled;
    });
  };

  // Show screen helper
  const showScreen = (screen: 'menu' | 'waiting' | 'joinPrivate' | 'aiSelect' | 'game') => {
    gameModeSelection.classList.add('hidden');
    waitingScreen.classList.add('hidden');
    joinPrivateScreen.classList.add('hidden');
    aiDifficultySelection.classList.add('hidden');
    gameContainer.classList.add('hidden');
    
    switch (screen) {
      case 'menu':
        gameModeSelection.classList.remove('hidden');
        break;
      case 'waiting':
        waitingScreen.classList.remove('hidden');
        break;
      case 'joinPrivate':
        joinPrivateScreen.classList.remove('hidden');
        break;
      case 'aiSelect':
        aiDifficultySelection.classList.remove('hidden');
        break;
      case 'game':
        gameContainer.classList.remove('hidden');
        initRenderer();
        setTimeout(() => canvasContainer.focus(), 100);
        break;
    }
  };

  // Show waiting screen with custom message
  const showWaiting = (title: string, message: string, showPrivateInfo = false, gameIdToShow?: number) => {
    waitingTitle.textContent = title;
    waitingMessage.textContent = message;
    if (showPrivateInfo && gameIdToShow) {
      privateGameInfo.classList.remove('hidden');
      gameIdDisplay.textContent = gameIdToShow.toString();
    } else {
      privateGameInfo.classList.add('hidden');
    }
    showScreen('waiting');
  };

  // Initialize renderer
  const initRenderer = () => {
    if (!renderer) {
      renderer = new GameRenderer(canvas, currentTheme);
    }
    renderer.setTheme(currentTheme);
    renderer.drawIdleScreen();
    
    if (isLocalGame) {
      controlsDisplay.innerHTML = `<div class="control-group"><span class="control-label">P1:</span><kbd>W</kbd><kbd>S</kbd></div><div class="control-group"><span class="control-label">P2:</span><kbd>↑</kbd><kbd>↓</kbd></div>`;
    } else {
      controlsDisplay.innerHTML = `<div class="control-group"><kbd>W</kbd><kbd>S</kbd><span class="control-label">or</span><kbd>↑</kbd><kbd>↓</kbd></div>`;
    }
  };

  // Update status bar
  const updateStatus = (text: string, type: string = '') => {
    const statusText = gameStatusBar.querySelector('.status-text') as HTMLElement;
    statusText.textContent = text;
    statusText.className = `status-text ${type}`;
  };

  // Paddle movement
  const movePaddle = (direction: number, playerNum?: number) => {
    if (!gameId || gameEnded) return;
    
    if (isLocalGame && playerNum !== undefined) {
      const currentDir = playerNum === 1 ? currentDirectionP1 : currentDirectionP2;
      if (direction !== currentDir) {
        if (playerNum === 1) currentDirectionP1 = direction;
        else currentDirectionP2 = direction;
        wsClient.send('game:move', { gameId, direction, playerNumber: playerNum });
      }
    } else if (!isLocalGame) {
      if (direction !== currentDirection) {
        currentDirection = direction;
        wsClient.send('game:move', { gameId, direction });
      }
    }
  };

  // Keyboard handlers
  const handleKeyDown = (e: KeyboardEvent) => {
    if (gameId && ['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(e.key)) {
        e.preventDefault();
    }
    if ((document.activeElement as HTMLElement)?.tagName === 'INPUT') return;
    if (!gameId) return;
    
    keysPressed.add(e.key);
    
    if (isLocalGame) {
      if (e.key === 'w' || e.key === 'W') movePaddle(1, 1);
      else if (e.key === 's' || e.key === 'S') movePaddle(2, 1);
      else if (e.key === 'ArrowUp') movePaddle(1, 2);
      else if (e.key === 'ArrowDown') movePaddle(2, 2);
    } else {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') movePaddle(1);
      else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') movePaddle(2);
    }
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    if ((document.activeElement as HTMLElement)?.tagName === 'INPUT') return;
    if (!gameId) return;
    
    keysPressed.delete(e.key);
    
    if (isLocalGame) {
      if (['w', 'W', 's', 'S'].includes(e.key)) {
        if (!keysPressed.has('w') && !keysPressed.has('W') && !keysPressed.has('s') && !keysPressed.has('S')) movePaddle(0, 1);
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        if (!keysPressed.has('ArrowUp') && !keysPressed.has('ArrowDown')) movePaddle(0, 2);
      }
    } else {
      if (!keysPressed.has('ArrowUp') && !keysPressed.has('ArrowDown') && !keysPressed.has('w') && !keysPressed.has('W') && !keysPressed.has('s') && !keysPressed.has('S')) {
        movePaddle(0);
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown, { passive: false } as AddEventListenerOptions);
  document.addEventListener('keyup', handleKeyUp, { passive: false } as AddEventListenerOptions);

  // Reset game state
  const resetGame = () => {
    gameId = null;
    gameEnded = false;
    playerNumber = null;
    isLocalGame = false;
    tournamentContext = null;
    currentDirection = 0;
    currentDirectionP1 = 0;
    currentDirectionP2 = 0;
    keysPressed.clear();
    lastScore1 = 0;
    lastScore2 = 0;
    player1Label.style.color = '';
    player2Label.style.color = '';
    player1Label.textContent = 'Player 1';
    player2Label.textContent = 'Player 2';
    player1Score.textContent = '0';
    player2Score.textContent = '0';
    hideOpponentDisconnected();
    
    // Clear tournament theme preference after game ends
    localStorage.removeItem('tournamentTheme');
  };

  // Helper to send message with connection check
  const sendMessage = async (event: string, data: any = {}) => {
    if (!wsClient.isConnected()) {
      showToast('Connecting to server...', 'info');
      const connected = await waitForConnection();
      if (!connected) {
        showToast('Failed to connect. Please try again.', 'error');
        return false;
      }
    }
    wsClient.send(event, data);
    return true;
  };

  // Restore game from active state (used when navigating from tournament)
  const restoreFromActiveState = (data: any) => {
    console.log('Restoring game from active state:', data);
    
    gameId = data.gameId;
    playerNumber = data.playerNumber;
    isLocalGame = data.isLocal || false;
    
    // Set up player labels
    player1Label.textContent = data.player1Name || data.player1?.name || 'Player 1';
    player2Label.textContent = data.player2Name || data.player2?.name || 'Player 2';
    
    // Highlight current player's name
    if (!isLocalGame) {
      if (playerNumber === 1) player1Label.style.color = '#4A7CC9';
      else if (playerNumber === 2) player2Label.style.color = '#4A7CC9';
    }
    
    // Update controls display
    if (isLocalGame) {
      controlsDisplay.innerHTML = `<div class="control-group"><span class="control-label">P1:</span><kbd>W</kbd><kbd>S</kbd></div><div class="control-group"><span class="control-label">P2:</span><kbd>↑</kbd><kbd>↓</kbd></div>`;
    }
    
    // Show game screen
    showScreen('game');
    
    // If we have game state, render it
    if (data.gameState) {
      player1Score.textContent = data.gameState.player1Score?.toString() || '0';
      player2Score.textContent = data.gameState.player2Score?.toString() || '0';
      
      if (renderer) {
        renderer.drawFromBackendState({
          paddleLeft: data.gameState.paddleLeft || 45,
          paddleRight: data.gameState.paddleRight || 45,
          ballX: data.gameState.ballX || 50,
          ballY: data.gameState.ballY || 50,
          player1Score: data.gameState.player1Score || 0,
          player2Score: data.gameState.player2Score || 0,
          status: data.status === 'in_progress' ? 'playing' : data.status || 'waiting'
        }, playerNumber);
      }
    }
    
    // Update status based on game state
    if (data.status === 'in_progress') {
      updateStatus('Playing', 'playing');
    } else if (data.status === 'starting') {
      updateStatus('Starting...', 'waiting');
    } else if (data.status === 'waiting') {
      updateStatus('Waiting...', 'waiting');
    }
    
    showToast('Rejoined game!', 'success');
  };

  // WebSocket message handlers
  const setupWSHandlers = () => {
    console.log('Setting up WebSocket handlers...');
    
    // Handle active game state response (for restoring game when navigating from tournament)
    unsubscribers.push(wsClient.on('game:active-state', (msg) => {
      console.log('game:active-state', msg.data);
      
      if (msg.data.inGame && msg.data.gameId) {
        // User is in an active game - restore it
        restoreFromActiveState(msg.data);
      } else if (msg.data.reconnectable && msg.data.reconnectable.gameId) {
        // User has a reconnectable game
        const deadline = new Date(Date.now() + msg.data.reconnectable.timeRemainingMs);
        showReconnectBanner(msg.data.reconnectable.gameId, deadline);
      }
    }));
    
    // Handle matchmaking join - only show waiting if player 1 waiting for opponent
    unsubscribers.push(wsClient.on('game:joined', (msg) => {
      console.log('game:joined', msg.data);
      gameId = msg.data.gameId;
      playerNumber = msg.data.playerNumber;
      isLocalGame = msg.data.isLocal || false;
      
      // Only show waiting if we're player 1 in matchmaking waiting for opponent
      if (!isLocalGame && playerNumber === 1) {
        showWaiting('Waiting for opponent...', 'You will be matched soon');
      } else if (!isLocalGame && playerNumber === 2) {
        showToast(`Joined game as Player ${playerNumber}`, 'success');
      }
    }));

    // Handle private/local game creation
    unsubscribers.push(wsClient.on('game:created', (msg) => {
      console.log('game:created', msg.data);
      gameId = msg.data.gameId;
      playerNumber = msg.data.playerNumber;
      isLocalGame = msg.data.isLocal || false;
      
      if (isLocalGame) {
        showToast('Local game created!', 'success');
      } else {
        showToast('Private game created!', 'success');
        showWaiting('Waiting for opponent...', 'Share the Game ID with your friend', true, gameId!);
      }
    }));

    // Handle AI game creation
    unsubscribers.push(wsClient.on('game:ai-created', (msg) => {
      console.log('game:ai-created', msg.data);
      gameId = msg.data.gameId;
      playerNumber = msg.data.playerNumber;
      isLocalGame = false;
      showToast(`AI game created (${msg.data.difficulty})!`, 'success');
    }));

    // Handle game starting (countdown phase)
    unsubscribers.push(wsClient.on('game-starting', (msg) => {
      console.log('game-starting', msg.data);
      
      if (msg.data.gameId) gameId = msg.data.gameId;
      
      const user = storage.getUserData();
      if (!playerNumber && user) {
        const userId = parseInt(user.id);
        if (msg.data.player1?.id === userId) playerNumber = 1;
        else if (msg.data.player2?.id === userId) playerNumber = 2;
      }
      
      player1Label.textContent = msg.data.player1?.name || 'Player 1';
      player2Label.textContent = msg.data.player2?.name || 'Player 2';
      player1Score.textContent = '0';
      player2Score.textContent = '0';
      
      if (msg.data.isLocal) isLocalGame = true;
      if (msg.data.vsAI) isLocalGame = false;

      if (msg.data.tournamentId) {
        tournamentContext = {
          tournamentId: msg.data.tournamentId,
          tournamentName: msg.data.tournamentName,
          round: msg.data.round,
          matchId: msg.data.matchId,
          isLocalTournament: msg.data.isLocalTournament || false,  // Add this
        };
        updateStatus(`Tournament Round ${msg.data.round}`, 'waiting');
      } else {
        tournamentContext = null;
      }
      
      if (!isLocalGame) {
        if (playerNumber === 1) player1Label.style.color = '#4A7CC9';
        else if (playerNumber === 2) player2Label.style.color = '#4A7CC9';
      }
      
      // Hide reconnect banner if shown
      hideReconnectBanner();
      
      showScreen('game');
      updateStatus('Starting...', 'waiting');
    }));

    // Handle game state updates
    unsubscribers.push(wsClient.on('game-update', (msg) => {
      if (!renderer) return;
      const data = msg.data;
      
      player1Score.textContent = data.player1Score.toString();
      player2Score.textContent = data.player2Score.toString();
      
      if (data.status === 'in_progress') {
        updateStatus('Playing', 'playing');
      } else if (data.status === 'starting') {
        updateStatus('Get Ready!', 'waiting');
      } else if (data.status === 'waiting') {
        updateStatus('Waiting...', 'waiting');
      }
      
      if (data.player1Score !== lastScore1 || data.player2Score !== lastScore2) {
        console.log(`Score: ${data.player1Score} - ${data.player2Score}`);
        lastScore1 = data.player1Score;
        lastScore2 = data.player2Score;
      }
      
      renderer.drawFromBackendState({
        paddleLeft: data.paddleLeft,
        paddleRight: data.paddleRight,
        ballX: data.ballX,
        ballY: data.ballY,
        player1Score: data.player1Score,
        player2Score: data.player2Score,
        status: data.status === 'in_progress' ? 'playing' : data.status
      }, playerNumber);
    }));

    // Handle game end
    unsubscribers.push(wsClient.on('game-ended', (msg) => {
      gameEnded = true;
      console.log('game-ended', msg.data);
      updateStatus('Game Over!', '');
      hideOpponentDisconnected();
      
      const user = storage.getUserData();
      const finalScore = msg.data.finalScore;
      
      // Determine if this is a local tournament game
      const isLocalTournament = tournamentContext && msg.data.isLocal;
      
      if (msg.data.isLocal && !isLocalTournament) {
        // Regular local game
        const winner = finalScore.player1 > finalScore.player2 ? 'Player 1' : 'Player 2';
        showToast(`${winner} Wins!`, 'info');
        soundManager.gameWin();
      } else if (isLocalTournament) {
        // Local tournament game
        const winnerNum = finalScore.player1 > finalScore.player2 ? 1 : 2;
        const winnerName = winnerNum === 1 ? player1Label.textContent : player2Label.textContent;
        showToast(`${winnerName} Wins!`, 'success');
        soundManager.gameWin();
        
        // Return to tournament view after delay
        setTimeout(() => {
          resetGame();
          router.navigateTo('/tournament');
        }, 2500);
        return;
      } else {
        // Online game
        const won = msg.data.winnerId?.toString() === user?.id?.toString();
        
        if (msg.data.forfeit) {
          if (msg.data.forfeitedBy?.toString() === user?.id?.toString()) {
            showToast('You forfeited the match', 'info');
            soundManager.gameLose();
          } else {
            showToast('Opponent forfeited - You Win!', 'success');
            soundManager.gameWin();
          }
        } else {
          showToast(won ? 'You Won!' : 'You Lost!', won ? 'success' : 'error');
          soundManager[won ? 'gameWin' : 'gameLose']();
        }
      }
      
      // Handle tournament context (non-local)
      if (tournamentContext && !isLocalTournament) {
        const won = msg.data.winnerId?.toString() === user?.id?.toString();
        setTimeout(() => {
          const returnToTournament = confirm(
            `${won ? 'Congratulations!' : 'Game over!'}\n\nReturn to tournament bracket?`
          );
          
          resetGame();
          if (returnToTournament) {
            router.navigateTo('/tournament');
          } else {
            showScreen('menu');
          }
        }, 2000);
      } else if (!isLocalTournament) {
        setTimeout(() => { 
          resetGame(); 
          showScreen('menu'); 
        }, 3000);
      }
    }));

    // Handle game cancelled
    unsubscribers.push(wsClient.on('game-cancelled', () => {
      console.log('game-cancelled');
      showToast('Game was cancelled', 'info');
      resetGame();
      showScreen('menu');
    }));

    // Handle game left confirmation
    unsubscribers.push(wsClient.on('game:left', () => {
      console.log('game:left');
      // Note: game:left-with-reconnect will be sent for in-progress games instead
    }));

    unsubscribers.push(wsClient.on('game-sound', (msg) => {
      const { type } = msg.data;
      switch (type) {
        case 'paddleHit':
          soundManager.paddleHit();
          break;
        case 'wallHit':
          soundManager.wallHit();
          break;
        case 'score':
          soundManager.score();
          break;
        case 'gameStart':
          soundManager.gameStart();
          break;
      }
    }));

    // ==================== RECONNECTION HANDLERS ====================

    // Handle leaving with reconnection option
    unsubscribers.push(wsClient.on('game:left-with-reconnect', (msg) => {
      console.log('game:left-with-reconnect', msg.data);
      const { gameId: leftGameId, reconnectDeadline: deadlineStr } = msg.data;
      
      // Store tournament context before resetting
      const wasTournamentGame = tournamentContext !== null;
      
      showReconnectBanner(leftGameId, new Date(deadlineStr));
      resetGame();
      
      if (wasTournamentGame) {
        // Redirect to tournament page - the reconnect banner will follow
        showToast('You left the match. Rejoin within 30 seconds!', 'warning');
        router.navigateTo('/tournament');
      } else {
        showScreen('menu');
        showToast('You left the game. Rejoin within 30 seconds!', 'warning');
      }
    }));

    // Handle opponent disconnected
    unsubscribers.push(wsClient.on('game:opponent-disconnected', (msg) => {
      console.log('game:opponent-disconnected', msg.data);
      const { reconnectDeadline: deadlineStr } = msg.data;
      showOpponentDisconnected(new Date(deadlineStr));
    }));

    // Handle opponent reconnected
    unsubscribers.push(wsClient.on('game:opponent-reconnected', (msg) => {
      console.log('game:opponent-reconnected', msg.data);
      hideOpponentDisconnected();
      showToast('Opponent reconnected!', 'success');
    }));

    // Handle successful rejoin
    unsubscribers.push(wsClient.on('game:rejoined', (msg) => {
      console.log('game:rejoined', msg.data);
      hideReconnectBanner();
      
      const { gameId: rejoinedGameId, playerNumber: rejoinedPlayerNumber, gameState, player1Name, player2Name } = msg.data;
      
      gameId = rejoinedGameId;
      playerNumber = rejoinedPlayerNumber;
      
      player1Label.textContent = player1Name || 'Player 1';
      player2Label.textContent = player2Name || 'Player 2';
      
      if (gameState) {
        player1Score.textContent = gameState.player1Score?.toString() || '0';
        player2Score.textContent = gameState.player2Score?.toString() || '0';
      }
      
      if (playerNumber === 1) player1Label.style.color = '#4A7CC9';
      else if (playerNumber === 2) player2Label.style.color = '#4A7CC9';
      
      showScreen('game');
      updateStatus('Playing', 'playing');
      showToast('Rejoined game!', 'success');
    }));

    // Handle forfeit confirmation
    unsubscribers.push(wsClient.on('game:forfeited', (msg) => {
      console.log('game:forfeited', msg.data);
      // game-ended will handle the actual end
    }));

    // Handle reconnectable game info
    unsubscribers.push(wsClient.on('game:reconnectable-game', (msg) => {
      console.log('game:reconnectable-game', msg.data);
      if (msg.data.gameId) {
        const deadline = new Date(Date.now() + msg.data.timeRemainingMs);
        showReconnectBanner(msg.data.gameId, deadline);
      }
    }));

    // ==================== END NEW HANDLERS ====================

    // Handle errors
    unsubscribers.push(wsClient.on('game:error', (msg) => {
      console.error('game:error', msg.data);
      showToast(msg.data.message || 'Game error', 'error');
      resetGame();
      showScreen('menu');
    }));

    // Handle move acknowledgment
    unsubscribers.push(wsClient.on('game:move-ack', (msg) => {
      // Silent acknowledgment
    }));

    // Handle WebSocket connection status
    unsubscribers.push(wsClient.on('ws:connected', () => {
      console.log('WebSocket connected');
      updateConnectionStatus();
      
      if (!hasCheckedActiveGame) {
        hasCheckedActiveGame = true;
        setTimeout(() => {
          console.log('Checking for active game after connection...');
          wsClient.send('game:get-active-state', {});
        }, 100);
      }
    }));

    unsubscribers.push(wsClient.on('ws:disconnected', () => {
      console.log('WebSocket disconnected');
      updateConnectionStatus();
    }));
  };

  // Theme change
  themeSelect.addEventListener('change', () => {
    currentTheme = themeSelect.value;
    // Save as the general game theme preference
    localStorage.setItem('gameTheme', currentTheme);
    if (renderer) {
      renderer.setTheme(currentTheme);
      renderer.drawIdleScreen();
    }
  });

  // Button handlers
  container.querySelector('#quickPlayBtn')?.addEventListener('click', async () => {
    console.log('Quick Play clicked');
    isLocalGame = false;
    if (await sendMessage('game:join-matchmaking', {})) {
      showWaiting('Searching for opponent...', 'Please wait while we find you a match');
    }
  });

  container.querySelector('#aiGameBtn')?.addEventListener('click', () => {
    isLocalGame = false;
    showScreen('aiSelect');
  });

  container.querySelector('#privateGameBtn')?.addEventListener('click', () => {
    isLocalGame = false;
    showScreen('joinPrivate');
  });

  container.querySelector('#localGameBtn')?.addEventListener('click', async () => {
    console.log('Local Game clicked');
    isLocalGame = true;
    if (await sendMessage('game:create-local', { player1Name: 'Player 1', player2Name: 'Player 2' })) {
      showWaiting('Creating local game...', 'Game will start shortly');
    }
  });

  container.querySelector('#backFromAIBtn')?.addEventListener('click', () => showScreen('menu'));
  container.querySelector('#backFromJoinBtn')?.addEventListener('click', () => showScreen('menu'));

  container.querySelector('#cancelWaitingBtn')?.addEventListener('click', () => {
    if (gameId) {
      wsClient.send('game:leave', {});
    }
    resetGame();
    showScreen('menu');
  });

  container.querySelector('#createPrivateBtn')?.addEventListener('click', async () => {
    console.log('Create Private Game clicked');
    if (await sendMessage('game:create-private', {})) {
      showWaiting('Creating private game...', 'Please wait');
    }
  });

  container.querySelector('#joinPrivateBtn')?.addEventListener('click', async () => {
    const inputGameId = parseInt(joinGameIdInput.value);
    if (!inputGameId || isNaN(inputGameId)) {
      showToast('Please enter a valid Game ID', 'error');
      return;
    }
    console.log('Joining private game:', inputGameId);
    if (await sendMessage('game:join-private', { gameId: inputGameId })) {
      showWaiting('Joining game...', 'Connecting to game');
    }
  });

  container.querySelector('#copyGameIdBtn')?.addEventListener('click', () => {
    if (gameId) {
      navigator.clipboard.writeText(gameId.toString()).then(() => {
        showToast('Game ID copied!', 'success');
      }).catch(() => {
        showToast('Failed to copy', 'error');
      });
    }
  });

  container.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const difficulty = (e.currentTarget as HTMLElement).dataset.difficulty;
      console.log('AI difficulty:', difficulty);
      if (difficulty && await sendMessage('game:create-ai', { difficulty })) {
        showWaiting(`Starting ${difficulty} AI game...`, 'Preparing opponent');
      }
    });
  });

  // ==================== LEAVE & FORFEIT HANDLERS ====================

  container.querySelector('#leaveGameBtn')?.addEventListener('click', () => {
    console.log('Leave clicked');
    
    if (!gameId) {
      showScreen('menu');
      return;
    }
    
    // Show different confirmation based on game type
    if (isLocalGame) {
      const confirmed = confirm('End the local game?');
      if (confirmed) {
        wsClient.send('game:leave', {});
        resetGame();
        showScreen('menu');
      }
    } else {
      const confirmed = confirm(
        'Leave the game?\n\n' +
        'You will have 30 seconds to rejoin.\n' +
        'If you don\'t rejoin in time, you will forfeit.'
      );
      if (confirmed) {
        wsClient.send('game:leave', {});
        // Don't reset or show menu - wait for game:left-with-reconnect
      }
    }
  });

  container.querySelector('#forfeitGameBtn')?.addEventListener('click', () => {
    console.log('Forfeit clicked');
    
    if (!gameId) return;
    
    const confirmed = confirm(
      'Are you sure you want to forfeit?\n\n' +
      '⚠️ Your opponent will win immediately.\n' +
      'This cannot be undone!'
    );
    
    if (confirmed) {
      wsClient.send('game:forfeit', {});
    }
  });

  // ==================== RECONNECT HANDLERS ====================

  container.querySelector('#reconnectBtn')?.addEventListener('click', () => {
    if (reconnectableGameId) {
      console.log('Attempting to rejoin game:', reconnectableGameId);
      wsClient.send('game:rejoin', { gameId: reconnectableGameId });
    }
  });

  container.querySelector('#dismissReconnectBtn')?.addEventListener('click', () => {
    hideReconnectBanner();
    showToast('Reconnection dismissed - you will forfeit', 'warning');
  });

  // Focus handling
  canvasContainer.addEventListener('click', () => canvasContainer.focus());

  // Initialize
  console.log('GameView initializing...');
  updateConnectionStatus();
  
  // Connect WebSocket if needed
  if (!wsClient.isConnected()) {
    console.log('WebSocket not connected, connecting...');
    wsClient.connect();
  }
  
  // Setup handlers
  setupWSHandlers();
  
  // Check for active game immediately if already connected
  if (wsClient.isConnected() && !hasCheckedActiveGame) {
    hasCheckedActiveGame = true;
    console.log('Already connected, checking for active game...');
    wsClient.send('game:get-active-state', {});
  }
  
  // Update connection status periodically
  const statusInterval = setInterval(updateConnectionStatus, 1000);
  
  // Cleanup on unmount
  (container as any).__cleanup = () => {
    console.log('GameView cleanup');
    clearInterval(statusInterval);
    if (reconnectTimerInterval) clearInterval(reconnectTimerInterval);
    if (opponentReconnectTimerInterval) clearInterval(opponentReconnectTimerInterval);
    unsubscribers.forEach(unsub => unsub());
    document.removeEventListener('keydown', handleKeyDown);
    document.removeEventListener('keyup', handleKeyUp);
  };

  return container;
}
