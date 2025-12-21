import { wsClient } from '../websocket/client';
import { router } from '../router';
import { showToast } from '../utils/toast';
import { storage } from '../utils/storage';
import { GAME_THEMES } from '../game/themes';

// SVG Icons
const icons = {
  trophy: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>`,
  users: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>`,
  local: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>`,
  clock: `<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>`,
  play: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polygon points="5 3 19 12 5 21 5 3"></polygon>
  </svg>`,
  plus: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>`,
  back: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M19 12H5M12 19l-7-7 7-7"></path>
  </svg>`,
  crown: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M2 12l5-5 5 5 5-5 5 5v7H2v-7z"></path>
    <path d="M12 12v7"></path>
  </svg>`,
  refresh: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="23 4 23 10 17 10"></polyline>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
  </svg>`,
  spinner: `<svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
  </svg>`,
  eye: `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>`,
  check: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>`,
  palette: `<svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="13.5" cy="6.5" r=".5"></circle>
    <circle cx="17.5" cy="10.5" r=".5"></circle>
    <circle cx="8.5" cy="7.5" r=".5"></circle>
    <circle cx="6.5" cy="12.5" r=".5"></circle>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.555C21.965 6.012 17.461 2 12 2z"></path>
  </svg>`
};

interface Tournament {
  id: number;
  name: string;
  maxPlayers: number;
  currentPlayers: number;
  status: string;
  creatorId: number;
  players?: TournamentPlayer[];
  matches?: TournamentMatch[];
  currentRound?: number;
  totalRounds?: number;
  winnerId?: number;
  winnerName?: string;
}

interface TournamentPlayer {
  userId: number;
  username: string;
  avatar?: string;
  seed?: number;
  eliminated?: boolean;
  eliminatedInRound?: number;
  isReady?: boolean;
}

interface TournamentMatch {
  matchId: string;
  round: number;
  matchNumber: number;
  player1?: { id: number; name: string; isWinner?: boolean; isReady?: boolean } | null;
  player2?: { id: number; name: string; isWinner?: boolean; isReady?: boolean } | null;
  winnerId?: number;
  status: string;
  gameId?: number;
  canSpectate?: boolean;
}

interface BracketViewData {
  tournament: {
    id: number;
    name: string;
    status: string;
    currentRound: number;
    totalRounds: number;
    currentPlayers: number;
    maxPlayers: number;
    creatorId: number;
    winnerId?: number;
    winnerName?: string;
    isLocal: boolean;
  };
  players: TournamentPlayer[];
  rounds: {
    roundNumber: number;
    roundName: string;
    completed: boolean;
    matches: TournamentMatch[];
  }[];
  myMatches: {
    matchId: string;
    round: number;
    status: string;
    opponentId?: number;
    opponentName?: string;
    gameId?: number;
    isWinner?: boolean;
    iAmReady?: boolean;
    opponentReady?: boolean;
  }[];
}

export function TournamentView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 p-4 md:p-8 flex flex-col items-center';

  // State
  let isLocalMode = false;
  let localPlayerNames: string[] = [];
  let currentView: 'list' | 'create' | 'bracket' = 'list';
  let tournaments: Tournament[] = [];
  let selectedTournamentId: number | null = null;
  let bracketData: BracketViewData | null = null;
  let selectedTheme = localStorage.getItem('tournamentTheme') || 'atari';
  let myReadyState: Record<string, boolean> = {}; // matchId -> ready state
  const unsubscribers: (() => void)[] = [];

  // Get current user
  const currentUser = storage.getUserData();
  const currentUserId = currentUser ? parseInt(currentUser.id) : 0;

  // Generate theme options HTML
  const themeOptions = Object.entries(GAME_THEMES).map(([key, theme]) => 
    `<option value="${key}" ${key === selectedTheme ? 'selected' : ''}>${theme.name}</option>`
  ).join('');

  // Initial HTML
  container.innerHTML = `
    <div class="w-full max-w-7xl mx-auto flex flex-col items-center">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-2">
          <span class="text-blue animate-glow">TOURNAMENTS</span>
        </h1>
        <p class="text-navy-muted">Compete in bracket-style tournaments</p>
      </div>

      <!-- Tournament List View -->
      <div id="tournamentList" class="space-y-6 w-full max-w-4xl">
        <div class="flex justify-center gap-4 mb-6">
          <button id="createTournamentBtn" class="btn-primary px-6 py-3">
            ${icons.plus}
            <span>Create Tournament</span>
          </button>
          <button id="refreshListBtn" class="btn-outline px-4 py-3">
            ${icons.refresh}
          </button>
        </div>

        <div id="loadingState" class="glass-card p-12 text-center">
          <div class="flex justify-center mb-4">${icons.spinner}</div>
          <p class="text-navy-muted">Loading tournaments...</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 hidden" id="tournamentCards">
          <!-- Tournament cards will be inserted here -->
        </div>

        <div id="emptyState" class="hidden glass-card p-12 text-center">
          <div class="text-6xl mb-4 flex justify-center">${icons.trophy}</div>
          <h3 class="text-xl font-bold text-navy mb-2">No Active Tournaments</h3>
          <p class="text-navy-muted mb-6">Be the first to create a tournament!</p>
          <button id="createFirstBtn" class="btn-primary">
            ${icons.plus} Create Tournament
          </button>
        </div>
      </div>

      <!-- Create Tournament View -->
      <div id="createTournament" class="hidden w-full max-w-2xl">
        <div class="glass-card p-8">
          <h2 class="text-2xl font-bold text-navy mb-6">Create Tournament</h2>
          
          <!-- Mode Toggle -->
          <div class="flex gap-4 mb-6">
            <button type="button" id="onlineModeBtn" class="mode-toggle-btn active flex-1 py-3 rounded-lg font-semibold transition-all">
              ${icons.users} Online
            </button>
            <button type="button" id="localModeBtn" class="mode-toggle-btn flex-1 py-3 rounded-lg font-semibold transition-all">
              ${icons.local || icons.users} Local (Same Keyboard)
            </button>
          </div>
          
          <form id="createTournamentForm" class="space-y-6">
            <div>
              <label class="block text-sm font-medium mb-2 text-navy">Tournament Name</label>
              <input 
                type="text" 
                id="tournamentName" 
                class="input-glass w-full" 
                placeholder="Enter tournament name"
                required
                maxlength="50"
                minlength="3"
              />
            </div>

            <div>
              <label class="block text-sm font-medium mb-2 text-navy">Number of Players</label>
              <select id="maxPlayers" class="input-glass w-full">
                <option value="2">2 Players (1 round - Finals only)</option>
                <option value="4" selected>4 Players (2 rounds)</option>
                <option value="8">8 Players (3 rounds)</option>
                <option value="16">16 Players (4 rounds)</option>
              </select>
              <p id="onlineModeHint" class="text-xs text-navy-muted mt-2">Tournament will start when full or manually by creator</p>
              <p id="localModeHint" class="text-xs text-navy-muted mt-2 hidden">All matches played on same keyboard (W/S vs ↑/↓)</p>
            </div>

            <!-- Local Player Names (shown only in local mode) -->
            <div id="localPlayersSection" class="hidden space-y-3">
              <label class="block text-sm font-medium text-navy">Player Names</label>
              <div id="localPlayerInputs" class="space-y-2">
                <!-- Dynamic inputs will be added here -->
              </div>
            </div>

            <div id="createError" class="text-red-500 text-sm hidden"></div>

            <div class="flex gap-4">
              <button type="submit" class="btn-primary flex-1">Create Tournament</button>
              <button type="button" id="cancelCreateBtn" class="btn-outline">
                ${icons.back} Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Tournament Bracket View -->
      <div id="bracketView" class="hidden">
        <div class="glass-card p-6 mb-6">
          <div class="flex items-center justify-between mb-4">
            <button id="backToBrowseBtn" class="btn-outline">
              ${icons.back} Back to Tournaments
            </button>
            <div class="flex items-center gap-4">
              <button id="refreshBracketBtn" class="btn-outline px-3 py-2">
                ${icons.refresh}
              </button>
              <div id="tournamentStatus" class="text-sm font-semibold px-4 py-2 rounded-full"></div>
            </div>
          </div>
          
          <div class="text-center mb-6">
            <h2 id="bracketTitle" class="text-3xl font-bold text-navy mb-2"></h2>
            <div class="flex items-center justify-center gap-6 text-navy-muted">
              <div class="flex items-center gap-2">
                ${icons.users}
                <span id="playerCount"></span>
              </div>
              <div class="flex items-center gap-2">
                ${icons.trophy}
                <span id="roundInfo"></span>
              </div>
            </div>
          </div>

          <!-- Theme Selector -->
          <div id="themeSelector" class="flex justify-center mb-6">
            <div class="glass-card p-4 flex items-center gap-4 bg-white/50">
              <div class="flex items-center gap-2 text-navy">
                ${icons.palette}
                <label class="font-semibold">Your Theme:</label>
              </div>
              <select id="tournamentThemeSelect" class="input-glass px-4 py-2">
                ${themeOptions}
              </select>
              <span class="text-xs text-navy-muted">(Only affects your display)</span>
            </div>
          </div>

          <div id="tournamentActions" class="flex justify-center gap-4 mb-6">
            <!-- Action buttons will be inserted here -->
          </div>

          <!-- My Match Alert -->
          <div id="myMatchAlert" class="hidden bg-blue-50 border-2 border-blue rounded-xl p-4 text-center mb-6">
            <h4 class="font-bold text-blue mb-2">Your Match is Ready!</h4>
            <p id="myMatchInfo" class="text-navy-muted mb-3"></p>
            <div id="myMatchReadyStatus" class="mb-3"></div>
            <div id="myMatchActions" class="flex justify-center gap-3">
              <!-- Ready/Go to Match buttons will be inserted here -->
            </div>
          </div>

          <div id="winnerBanner" class="hidden bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400 rounded-xl p-6 text-center mb-6">
            <div class="text-4xl mb-2 flex justify-center">${icons.crown}</div>
            <h3 class="text-2xl font-bold text-yellow-900 mb-1">Tournament Champion!</h3>
            <p id="winnerName" class="text-xl text-yellow-800"></p>
          </div>
        </div>

        <!-- Bracket Display -->
        <div id="bracketContainer" class="glass-card p-6">
          <div id="bracketContent" class="overflow-x-auto">
            <!-- Bracket rounds will be inserted here -->
          </div>
        </div>

        <!-- Players List -->
        <div id="playersSection" class="glass-card p-6 mt-6">
          <h3 class="text-xl font-bold text-navy mb-4">Players</h3>
          <div id="playersList" class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <!-- Players will be inserted here -->
          </div>
        </div>
      </div>
    </div>

    <style>
      .tournament-card {
        background: rgba(255, 255, 255, 0.4);
        backdrop-filter: blur(10px);
        border: 2px solid rgba(255, 255, 255, 0.5);
        border-radius: 20px;
        padding: 1.5rem;
        cursor: pointer;
        transition: all 0.3s;
      }
      .tournament-card:hover {
        transform: translateY(-4px);
        border-color: var(--color-blue);
        box-shadow: 0 8px 24px rgba(74, 124, 201, 0.2);
      }
      .mode-toggle-btn {
        background: rgba(26, 26, 46, 0.1);
        color: var(--color-navy);
        border: 2px solid transparent;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
      }
      .mode-toggle-btn:hover {
        background: rgba(26, 26, 46, 0.2);
      }
      .mode-toggle-btn.active {
        background: var(--color-blue);
        color: white;
        border-color: var(--color-blue);
      }
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
      }
      .status-registration {
        background: rgba(16, 185, 129, 0.2);
        color: #059669;
        border: 1px solid #059669;
      }
      .status-starting {
        background: rgba(251, 191, 36, 0.2);
        color: #d97706;
        border: 1px solid #d97706;
      }
      .status-in_progress {
        background: rgba(59, 130, 246, 0.2);
        color: #2563eb;
        border: 1px solid #2563eb;
      }
      .status-finished {
        background: rgba(107, 114, 128, 0.2);
        color: #4b5563;
        border: 1px solid #4b5563;
      }
      .status-cancelled {
        background: rgba(239, 68, 68, 0.2);
        color: #dc2626;
        border: 1px solid #dc2626;
      }
      .bracket-round {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        min-width: 220px;
      }
      .bracket-match {
        background: rgba(255, 255, 255, 0.6);
        border: 2px solid rgba(212, 184, 150, 0.5);
        border-radius: 12px;
        padding: 0.75rem;
        transition: all 0.2s;
      }
      .bracket-match:hover {
        border-color: var(--color-blue);
      }
      .bracket-match.pending {
        opacity: 0.6;
      }
      .bracket-match.ready {
        border-color: #fbbf24;
        box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.1);
      }
      .bracket-match.in_progress {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        animation: pulse-border 2s infinite;
      }
      .bracket-match.completed {
        border-color: #059669;
      }
      .bracket-match.my-match {
        border-color: var(--color-blue);
        box-shadow: 0 0 0 4px rgba(74, 124, 201, 0.2);
      }
      .bracket-player {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.5rem;
        border-radius: 6px;
        transition: background 0.2s;
      }
      .bracket-player.winner {
        background: rgba(16, 185, 129, 0.15);
        font-weight: 600;
      }
      .bracket-player.loser {
        opacity: 0.5;
        text-decoration: line-through;
      }
      .bracket-player.current-user {
        background: rgba(74, 124, 201, 0.1);
      }
      .bracket-connector {
        display: flex;
        align-items: center;
        width: 40px;
      }
      .bracket-connector::before {
        content: '';
        width: 100%;
        height: 2px;
        background: var(--color-tan);
      }
      .player-card {
        background: rgba(255, 255, 255, 0.5);
        border: 1px solid rgba(212, 184, 150, 0.3);
        border-radius: 8px;
        padding: 0.75rem;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .player-card.eliminated {
        opacity: 0.5;
      }
      .player-card.current-user {
        border-color: var(--color-blue);
        background: rgba(74, 124, 201, 0.1);
      }
      .player-card.ready {
        border-color: #059669;
        background: rgba(16, 185, 129, 0.1);
      }
      .player-seed {
        background: var(--color-tan);
        color: var(--color-navy);
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .ready-indicator {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        padding: 0.125rem 0.5rem;
        border-radius: 9999px;
      }
      .ready-indicator.is-ready {
        background: rgba(16, 185, 129, 0.2);
        color: #059669;
      }
      .ready-indicator.not-ready {
        background: rgba(251, 191, 36, 0.2);
        color: #d97706;
      }
      .btn-ready {
        background: linear-gradient(135deg, #059669, #10b981);
        color: white;
        font-weight: 600;
        padding: 0.75rem 1.5rem;
        border-radius: 12px;
        border: none;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
      }
      .btn-ready:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      }
      .btn-ready:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none;
      }
      .btn-ready.is-ready {
        background: #059669;
        cursor: default;
      }
      @keyframes pulse-border {
        0%, 100% { box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
        50% { box-shadow: 0 0 0 6px rgba(59, 130, 246, 0.2); }
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .animate-spin {
        animation: spin 1s linear infinite;
      }
    </style>
  `;

  // Elements
  const tournamentList = container.querySelector('#tournamentList') as HTMLElement;
  const createTournament = container.querySelector('#createTournament') as HTMLElement;
  const bracketView = container.querySelector('#bracketView') as HTMLElement;
  const tournamentCards = container.querySelector('#tournamentCards') as HTMLElement;
  const emptyState = container.querySelector('#emptyState') as HTMLElement;
  const loadingState = container.querySelector('#loadingState') as HTMLElement;
  const createTournamentForm = container.querySelector('#createTournamentForm') as HTMLFormElement;
  const tournamentNameInput = container.querySelector('#tournamentName') as HTMLInputElement;
  const maxPlayersSelect = container.querySelector('#maxPlayers') as HTMLSelectElement;
  const createError = container.querySelector('#createError') as HTMLElement;
  const tournamentThemeSelect = container.querySelector('#tournamentThemeSelect') as HTMLSelectElement;
  const onlineModeBtn = container.querySelector('#onlineModeBtn') as HTMLButtonElement;
  const localModeBtn = container.querySelector('#localModeBtn') as HTMLButtonElement;
  const localPlayersSection = container.querySelector('#localPlayersSection') as HTMLElement;
  const localPlayerInputs = container.querySelector('#localPlayerInputs') as HTMLElement;
  const onlineModeHint = container.querySelector('#onlineModeHint') as HTMLElement;
  const localModeHint = container.querySelector('#localModeHint') as HTMLElement;

  const updateLocalPlayerInputs = () => {
    const count = parseInt(maxPlayersSelect.value);
    localPlayerInputs.innerHTML = Array.from({ length: count }, (_, i) => `
      <input 
        type="text" 
        class="local-player-input input-glass w-full mb-2" 
        placeholder="Player ${i + 1} name"
        data-index="${i}"
        maxlength="20"
        required
      />
    `).join('');
  };

  onlineModeBtn?.addEventListener('click', () => {
    isLocalMode = false;
    onlineModeBtn.classList.add('active', 'bg-blue', 'text-white');
    onlineModeBtn.classList.remove('bg-navy/10', 'text-navy');
    localModeBtn.classList.remove('active', 'bg-blue', 'text-white');
    localModeBtn.classList.add('bg-navy/10', 'text-navy');
    localPlayersSection.classList.add('hidden');
    onlineModeHint.classList.remove('hidden');
    localModeHint.classList.add('hidden');
  });

  localModeBtn?.addEventListener('click', () => {
    isLocalMode = true;
    localModeBtn.classList.add('active', 'bg-blue', 'text-white');
    localModeBtn.classList.remove('bg-navy/10', 'text-navy');
    onlineModeBtn.classList.remove('active', 'bg-blue', 'text-white');
    onlineModeBtn.classList.add('bg-navy/10', 'text-navy');
    localPlayersSection.classList.remove('hidden');
    onlineModeHint.classList.add('hidden');
    localModeHint.classList.remove('hidden');
    updateLocalPlayerInputs();
  });

  maxPlayersSelect.addEventListener('change', () => {
    if (isLocalMode) {
      updateLocalPlayerInputs();
    }
  });

  // Theme selection handler
  tournamentThemeSelect.addEventListener('change', () => {
    selectedTheme = tournamentThemeSelect.value;
    localStorage.setItem('tournamentTheme', selectedTheme);
    showToast(`Theme set to ${GAME_THEMES[selectedTheme].name}`, 'success');
  });

  // View switching
  const showView = (view: 'list' | 'create' | 'bracket') => {
    currentView = view;
    tournamentList.classList.toggle('hidden', view !== 'list');
    createTournament.classList.toggle('hidden', view !== 'create');
    bracketView.classList.toggle('hidden', view !== 'bracket');

    if (view === 'list') {
      loadTournaments();
    } else if (view === 'create') {
      tournamentNameInput.value = '';
      createError.classList.add('hidden');
    }
  };

  // Load tournaments
  const loadTournaments = () => {
    loadingState.classList.remove('hidden');
    tournamentCards.classList.add('hidden');
    emptyState.classList.add('hidden');
    wsClient.send('tournament:list-active');
  };

  // Render tournament cards
  const renderTournaments = () => {
    loadingState.classList.add('hidden');

    if (tournaments.length === 0) {
      tournamentCards.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    tournamentCards.classList.remove('hidden');
    emptyState.classList.add('hidden');

    tournamentCards.innerHTML = tournaments.map(t => {
      const isParticipant = t.players?.some(p => p.userId === currentUserId);
      const isCreator = t.creatorId === currentUserId;

      return `
        <div class="tournament-card" data-tournament-id="${t.id}">
          <div class="flex items-start justify-between mb-4">
            <div>
              <h3 class="text-xl font-bold text-navy">${escapeHtml(t.name)}</h3>
              ${isCreator ? '<span class="text-xs text-blue">(You created this)</span>' : ''}
              ${isParticipant && !isCreator ? '<span class="text-xs text-green-600">(You joined)</span>' : ''}
            </div>
            <span class="status-badge status-${t.status}">
              ${getStatusText(t.status)}
            </span>
          </div>
          
          <div class="space-y-2 text-sm text-navy-muted mb-4">
            <div class="flex items-center gap-2">
              ${icons.users}
              <span>${t.currentPlayers} / ${t.maxPlayers} Players</span>
              ${t.currentPlayers === t.maxPlayers ? '<span class="text-xs text-yellow-600">(Full)</span>' : ''}
            </div>
            ${t.status === 'in_progress' && t.currentRound ? `
              <div class="flex items-center gap-2">
                ${icons.trophy}
                <span>Round ${t.currentRound} of ${t.totalRounds}</span>
              </div>
            ` : ''}
          </div>

          <button class="btn-primary w-full view-bracket-btn" data-tournament-id="${t.id}">
            ${t.status === 'registration' && !isParticipant ? `${icons.plus} Join Tournament` : 'View Bracket'}
          </button>
        </div>
      `;
    }).join('');

    // Add click handlers
    container.querySelectorAll('.view-bracket-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt((btn as HTMLElement).dataset.tournamentId!);
        viewTournament(id);
      });
    });
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'registration': return 'Open';
      case 'starting': return 'Starting';
      case 'in_progress': return 'In Progress';
      case 'finished': return 'Completed';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  // View tournament bracket
  const viewTournament = (tournamentId: number) => {
    selectedTournamentId = tournamentId;
    bracketData = null;

    // Request detailed tournament data
    wsClient.send('tournament:get-bracket', { tournamentId });

    showView('bracket');
  };

  // Render tournament bracket
  const renderBracket = () => {
    if (!bracketData) return;

    const { tournament, players, rounds, myMatches } = bracketData;

    const bracketTitle = container.querySelector('#bracketTitle') as HTMLElement;
    const playerCount = container.querySelector('#playerCount') as HTMLElement;
    const roundInfo = container.querySelector('#roundInfo') as HTMLElement;
    const tournamentStatus = container.querySelector('#tournamentStatus') as HTMLElement;
    const tournamentActions = container.querySelector('#tournamentActions') as HTMLElement;
    const winnerBanner = container.querySelector('#winnerBanner') as HTMLElement;
    const winnerName = container.querySelector('#winnerName') as HTMLElement;
    const bracketContent = container.querySelector('#bracketContent') as HTMLElement;
    const playersList = container.querySelector('#playersList') as HTMLElement;
    const myMatchAlert = container.querySelector('#myMatchAlert') as HTMLElement;
    const myMatchInfo = container.querySelector('#myMatchInfo') as HTMLElement;
    const myMatchReadyStatus = container.querySelector('#myMatchReadyStatus') as HTMLElement;
    const myMatchActions = container.querySelector('#myMatchActions') as HTMLElement;
    const themeSelector = container.querySelector('#themeSelector') as HTMLElement;

    // Update header
    bracketTitle.textContent = tournament.name;
    playerCount.textContent = `${tournament.currentPlayers} / ${tournament.maxPlayers} Players`;
    roundInfo.textContent = tournament.status === 'registration'
      ? 'Waiting to start'
      : `Round ${tournament.currentRound || 0} of ${tournament.totalRounds || 0}`;

    // Update status badge
    tournamentStatus.className = `status-badge status-${tournament.status}`;
    tournamentStatus.textContent = getStatusText(tournament.status);

    // Show/hide theme selector based on tournament status
    const isParticipant = players.some(p => p.userId === currentUserId);
    themeSelector.classList.toggle('hidden', !isParticipant || tournament.status === 'finished');

    // Show/hide winner banner
    if (tournament.status === 'finished' && tournament.winnerName) {
      winnerBanner.classList.remove('hidden');
      winnerName.textContent = tournament.winnerName;
    } else {
      winnerBanner.classList.add('hidden');
    }

    if (tournament.isLocal && tournament.status === 'in_progress') {
      const nextMatch = bracketData?.rounds
        .flatMap(r => r.matches)
        .find(m => m.status === 'ready');
      
      if (nextMatch) {
        tournamentActions.innerHTML = `
          <div class="text-center">
            <p class="text-navy-muted mb-2">Next Match:</p>
            <p class="text-lg font-bold text-navy mb-4">
              ${nextMatch.player1?.name || 'TBD'} vs ${nextMatch.player2?.name || 'TBD'}
            </p>
            <button id="playNextLocalMatchBtn" class="btn-primary px-8 py-3" data-match-id="${nextMatch.matchId}">
              ${icons.play} Play Match
            </button>
            <p class="text-xs text-navy-muted mt-3">Controls: Player 1 (W/S) vs Player 2 (↑/↓)</p>
          </div>
        `;
      } else {
        tournamentActions.innerHTML = `
          <p class="text-navy-muted">Waiting for matches to be ready...</p>
        `;
      }
    }

    // Check for my active match
    const myActiveMatch = myMatches.find(m => m.status === 'in_progress' || m.status === 'ready');
    if (myActiveMatch) {
      myMatchAlert.classList.remove('hidden');
      
      const iAmReady = myActiveMatch.iAmReady || myReadyState[myActiveMatch.matchId];
      const opponentReady = myActiveMatch.opponentReady;
      
      if (myActiveMatch.status === 'in_progress' && myActiveMatch.gameId) {
        myMatchInfo.textContent = `Your match against ${myActiveMatch.opponentName || 'opponent'} is in progress!`;
        myMatchReadyStatus.innerHTML = '';
        myMatchActions.innerHTML = `
          <button id="goToMyMatchBtn" class="btn-primary">
            ${icons.play} Continue Match
          </button>
        `;
      } else {
        // Match is ready but waiting for players to ready up
        myMatchInfo.textContent = `Your Round ${myActiveMatch.round} match against ${myActiveMatch.opponentName || 'opponent'} is ready!`;
        
        // Show ready status
        myMatchReadyStatus.innerHTML = `
          <div class="flex justify-center gap-4 text-sm">
            <div class="ready-indicator ${iAmReady ? 'is-ready' : 'not-ready'}">
              ${iAmReady ? icons.check : icons.clock}
              You: ${iAmReady ? 'Ready' : 'Not Ready'}
            </div>
            <div class="ready-indicator ${opponentReady ? 'is-ready' : 'not-ready'}">
              ${opponentReady ? icons.check : icons.clock}
              ${myActiveMatch.opponentName || 'Opponent'}: ${opponentReady ? 'Ready' : 'Waiting'}
            </div>
          </div>
        `;
        
        if (iAmReady) {
          myMatchActions.innerHTML = `
            <button class="btn-ready is-ready" disabled>
              ${icons.check} You're Ready!
            </button>
            <span class="text-sm text-navy-muted">Waiting for opponent...</span>
          `;
        } else {
          myMatchActions.innerHTML = `
            <button id="readyForMatchBtn" class="btn-ready" data-match-id="${myActiveMatch.matchId}">
              ${icons.check} Ready Up!
            </button>
          `;
        }
      }
    } else {
      myMatchAlert.classList.add('hidden');
    }

    // Render action buttons
    const isCreator = tournament.creatorId === currentUserId;

    tournamentActions.innerHTML = '';

    if (tournament.status === 'registration') {
      if (!isParticipant) {
        tournamentActions.innerHTML = `
          <button id="joinTournamentBtn" class="btn-primary px-6 py-3">
            ${icons.plus} Join Tournament
          </button>
        `;
      } else {
        tournamentActions.innerHTML = `
          <button id="leaveTournamentBtn" class="btn-outline px-6 py-3">
            Leave Tournament
          </button>
        `;
      }

      if (isCreator && tournament.currentPlayers >= 2) {
        const canStart = tournament.currentPlayers >= 2;
        const isPowerOf2 = (tournament.currentPlayers & (tournament.currentPlayers - 1)) === 0;
        
        tournamentActions.innerHTML += `
          <button id="startTournamentBtn" class="btn-primary px-6 py-3" ${!canStart ? 'disabled' : ''}>
            ${icons.play} Start Tournament
          </button>
        `;
        
        if (!isPowerOf2 && canStart) {
          tournamentActions.innerHTML += `
            <span class="text-xs text-navy-muted">(Will adjust to ${nextPowerOfTwo(tournament.currentPlayers)} slots with byes)</span>
          `;
        }
      }
    }

    if (tournament.isLocal && tournament.status === 'in_progress') {
      const nextMatch = rounds
        ?.flatMap(r => r.matches)
        .find(m => m.status === 'ready');
      
      if (nextMatch) {
        tournamentActions.innerHTML = `
          <div class="text-center">
            <p class="text-navy-muted mb-2">Next Match:</p>
            <p class="text-lg font-bold text-navy mb-4">
              ${nextMatch.player1?.name || 'TBD'} vs ${nextMatch.player2?.name || 'TBD'}
            </p>
            <button id="playNextLocalMatchBtn" class="btn-primary px-8 py-3" data-match-id="${nextMatch.matchId}">
              ${icons.play} Play Match
            </button>
            <p class="text-xs text-navy-muted mt-3">Controls: Player 1 (W/S) vs Player 2 (↑/↓)</p>
          </div>
        `;
      } else {
        tournamentActions.innerHTML = `
          <p class="text-navy-muted">Waiting for matches to be ready...</p>
        `;
      }
    }

    if (tournament.status !== 'finished' && tournament.status !== 'cancelled' && isCreator) {
      tournamentActions.innerHTML += `
        <button id="cancelTournamentBtn" class="btn-outline text-red-500 px-4 py-3">
          Cancel Tournament
        </button>
      `;
    }

    // Render bracket
    if (rounds && rounds.length > 0) {
      bracketContent.innerHTML = `
        <div class="flex gap-6 justify-start items-stretch min-w-fit py-4">
          ${rounds.map((round, roundIndex) => `
            <div class="bracket-round" style="justify-content: space-around;">
              <div class="text-center mb-4">
                <h4 class="font-bold text-navy text-sm">${round.roundName}</h4>
                ${round.completed ? '<span class="text-xs text-green-600">✓ Complete</span>' : ''}
              </div>
              ${round.matches.map(match => {
                const isMyMatch = match.player1?.id === currentUserId || match.player2?.id === currentUserId;
                return `
                  <div class="bracket-match ${match.status} ${isMyMatch ? 'my-match' : ''}">
                    <div class="space-y-1">
                      ${renderBracketPlayer(match.player1, match.winnerId, match.status)}
                      <div class="h-px bg-gray-200 my-1"></div>
                      ${renderBracketPlayer(match.player2, match.winnerId, match.status)}
                    </div>
                    ${match.status === 'in_progress' ? `
                      <div class="text-center mt-2">
                        <span class="text-xs text-blue font-semibold animate-pulse">LIVE</span>
                        ${match.canSpectate ? `
                          <button class="spectate-btn ml-2 text-xs text-blue hover:underline" data-game-id="${match.gameId}">
                            ${icons.eye} Watch
                          </button>
                        ` : ''}
                      </div>
                    ` : ''}
                    ${match.status === 'ready' ? `
                      <div class="text-center mt-2">
                        ${tournament.isLocal ? `
                          <button class="play-local-match-btn bg-green-500 hover:bg-green-600 text-white text-xs px-3 py-1.5 rounded font-semibold transition-colors" 
                                  data-match-id="${match.matchId}">
                            ${icons.play} Play
                          </button>
                        ` : `
                          <div class="flex justify-center gap-2">
                            ${match.player1?.isReady ? `<span class="ready-indicator is-ready text-xs">${icons.check}</span>` : `<span class="ready-indicator not-ready text-xs">${icons.clock}</span>`}
                            ${match.player2?.isReady ? `<span class="ready-indicator is-ready text-xs">${icons.check}</span>` : `<span class="ready-indicator not-ready text-xs">${icons.clock}</span>`}
                          </div>
                          <span class="text-xs text-yellow-600 font-semibold">Waiting for ready</span>
                        `}
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
            ${roundIndex < rounds.length - 1 ? '<div class="bracket-connector"></div>' : ''}
          `).join('')}
        </div>
      `;
    } else if (tournament.status === 'registration') {
      bracketContent.innerHTML = `
        <div class="text-center py-12">
          <p class="text-navy-muted mb-4">Tournament bracket will be generated when the tournament starts.</p>
          <p class="text-sm text-navy-muted">Minimum 2 players required. Currently: ${tournament.currentPlayers}</p>
        </div>
      `;
    }

    // Render players list
    playersList.innerHTML = players.map(player => {
      const isMe = player.userId === currentUserId;
      const isReady = player.isReady;
      return `
        <div class="player-card ${player.eliminated ? 'eliminated' : ''} ${isMe ? 'current-user' : ''} ${isReady ? 'ready' : ''}">
          ${player.seed ? `<span class="player-seed">${player.seed}</span>` : ''}
          <span class="text-sm text-navy font-medium flex-1">${escapeHtml(player.username)}</span>
          ${isMe ? '<span class="text-xs text-blue">(You)</span>' : ''}
          ${isReady && !player.eliminated ? `<span class="text-xs text-green-600">${icons.check}</span>` : ''}
          ${player.eliminated ? `<span class="text-xs text-red-500">Eliminated Round ${player.eliminatedInRound}</span>` : ''}
        </div>
      `;
    }).join('');

    // Setup action button handlers
    setupBracketActions();
  };

  const renderBracketPlayer = (
    player: { id: number; name: string; isWinner?: boolean; isReady?: boolean } | null | undefined,
    winnerId: number | undefined,
    matchStatus: string
  ): string => {
    if (!player) {
      return `
        <div class="bracket-player">
          <span class="text-sm text-navy-muted italic">TBD</span>
        </div>
      `;
    }

    const isWinner = winnerId === player.id;
    const isLoser = winnerId && winnerId !== player.id;
    const isMe = player.id === currentUserId;

    return `
      <div class="bracket-player ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''} ${isMe ? 'current-user' : ''}">
        <span class="text-sm ${isMe ? 'text-blue' : 'text-navy'} font-medium">
          ${escapeHtml(player.name)}
          ${isMe ? ' (You)' : ''}
        </span>
        <div class="flex items-center gap-1">
          ${matchStatus === 'ready' && player.isReady ? `<span class="text-green-500 text-xs">${icons.check}</span>` : ''}
          ${isWinner ? `<span class="text-green-500">${icons.crown}</span>` : ''}
        </div>
      </div>
    `;
  };

  // Setup bracket action handlers
  const setupBracketActions = () => {
    const joinBtn = container.querySelector('#joinTournamentBtn');
    const leaveBtn = container.querySelector('#leaveTournamentBtn');
    const startBtn = container.querySelector('#startTournamentBtn');
    const cancelBtn = container.querySelector('#cancelTournamentBtn');
    const goToMatchBtn = container.querySelector('#goToMyMatchBtn');
    const readyBtn = container.querySelector('#readyForMatchBtn');
    const playNextLocalBtn = container.querySelector('#playNextLocalMatchBtn');

    joinBtn?.addEventListener('click', () => {
      if (selectedTournamentId) {
        wsClient.send('tournament:join', { tournamentId: selectedTournamentId });
      }
    });

    leaveBtn?.addEventListener('click', () => {
      if (selectedTournamentId) {
        wsClient.send('tournament:leave', { tournamentId: selectedTournamentId });
      }
    });

    startBtn?.addEventListener('click', () => {
      if (selectedTournamentId) {
        wsClient.send('tournament:start', { tournamentId: selectedTournamentId });
      }
    });

    cancelBtn?.addEventListener('click', () => {
      if (selectedTournamentId && confirm('Are you sure you want to cancel this tournament?')) {
        wsClient.send('tournament:cancel', { tournamentId: selectedTournamentId });
      }
    });

    goToMatchBtn?.addEventListener('click', () => {
      // Save theme to localStorage for game view to pick up
      localStorage.setItem('tournamentTheme', selectedTheme);
      // Navigate to game view - the game should already be set up
      // GameView will check for active game state and restore it
      router.navigateTo('/game');
    });

    readyBtn?.addEventListener('click', () => {
      const matchId = (readyBtn as HTMLElement).dataset.matchId;
      if (matchId && selectedTournamentId) {
        // Save theme before readying up
        localStorage.setItem('tournamentTheme', selectedTheme);
        
        // Mark locally as ready
        myReadyState[matchId] = true;
        
        // Send ready signal to server
        wsClient.send('tournament:ready', { 
          tournamentId: selectedTournamentId,
          matchId: matchId
        });
        
        // Update UI immediately
        renderBracket();
        showToast('You are ready! Waiting for opponent...', 'success');
      }
    });

    // Play buttons in bracket for local tournaments
    container.querySelectorAll('.play-local-match-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const matchId = (btn as HTMLElement).dataset.matchId;
        if (matchId && selectedTournamentId) {
          localStorage.setItem('tournamentTheme', selectedTheme);
          wsClient.send('tournament:start-local-match', {
            tournamentId: selectedTournamentId,
            matchId,
          });
        }
      });
    });

    playNextLocalBtn?.addEventListener('click', () => {
      const matchId = (playNextLocalBtn as HTMLElement).dataset.matchId;
      if (matchId && selectedTournamentId) {
        localStorage.setItem('tournamentTheme', selectedTheme);
        wsClient.send('tournament:start-local-match', {
          tournamentId: selectedTournamentId,
          matchId,
        });
      }
    });

    // Spectate buttons
    container.querySelectorAll('.spectate-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const gameId = (btn as HTMLElement).dataset.gameId;
        if (gameId) {
          // TODO: Implement spectator mode navigation
          showToast('Spectator mode coming soon!', 'info');
        }
      });
    });
  };

  // Setup WebSocket handlers
  const setupWSHandlers = () => {
    // Tournament list
    unsubscribers.push(wsClient.on('tournament:active-list', (msg) => {
      tournaments = msg.data.tournaments || [];
      if (currentView === 'list') {
        renderTournaments();
      }
    }));

    // Tournament created (broadcast to all)
    unsubscribers.push(wsClient.on('tournament:created', (msg) => {
      const newTournament = msg.data.tournament;
      if (newTournament) {
        // If this is our newly created tournament, view it
        if (newTournament.creatorId === currentUserId) {
          showToast('Tournament created successfully!', 'success');
          viewTournament(newTournament.id);
        } else {
          // Just refresh the list
          loadTournaments();
        }
      }
    }));

    // Joined tournament
    unsubscribers.push(wsClient.on('tournament:joined', (msg) => {
      showToast('Joined tournament!', 'success');
      // Refresh bracket view
      if (selectedTournamentId) {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
    }));

    // Left tournament
    unsubscribers.push(wsClient.on('tournament:left', (msg) => {
      showToast('Left tournament', 'info');
      showView('list');
    }));

    // Player joined (broadcast to tournament participants)
    unsubscribers.push(wsClient.on('tournament:player-joined', (msg) => {
      if (selectedTournamentId === msg.data.tournamentId && currentView === 'bracket') {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
      // Also refresh list
      if (currentView === 'list') {
        loadTournaments();
      }
    }));

    // Player left
    unsubscribers.push(wsClient.on('tournament:player-left', (msg) => {
      if (selectedTournamentId === msg.data.tournamentId && currentView === 'bracket') {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
    }));

    // Player ready status update
    unsubscribers.push(wsClient.on('tournament:player-ready', (msg) => {
      console.log('tournament:player-ready', msg.data);
      if (selectedTournamentId === msg.data.tournamentId && currentView === 'bracket') {
        // Refresh bracket to show updated ready status
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
    }));

    // Local tournament ready
    unsubscribers.push(wsClient.on('tournament:local-ready', (msg) => {
      console.log('tournament:local-ready', msg.data);
      if (selectedTournamentId === msg.data.tournamentId) {
        bracketData = msg.data.bracket;
        renderBracket();
        showToast('Local tournament ready! Start your first match.', 'success');
      }
    }));

    // Local match starting
    unsubscribers.push(wsClient.on('tournament:local-match-starting', (msg) => {
      console.log('tournament:local-match-starting', msg.data);
      showToast(`Starting: ${msg.data.player1Name} vs ${msg.data.player2Name}`, 'info');
      // Navigation happens via game-starting event
    }));

    // Local match complete
    unsubscribers.push(wsClient.on('tournament:local-match-complete', (msg) => {
      console.log('tournament:local-match-complete', msg.data);
      if (selectedTournamentId === msg.data.tournamentId) {
        bracketData = msg.data.bracket;
        if (msg.data.nextMatch) {
          showToast('Match complete! Ready for next match.', 'success');
        } else {
          showToast('Round complete!', 'info');
        }
        renderBracket();
      }
    }));

    // Both players ready - match starting
    unsubscribers.push(wsClient.on('tournament:match-ready', (msg) => {
      console.log('tournament:match-ready', msg.data);
      showToast('Both players ready! Match starting...', 'info');
    }));

    // Tournament started
    unsubscribers.push(wsClient.on('tournament:started', (msg) => {
      showToast('Tournament started! Ready up for your matches.', 'success');
      // Clear ready states for new tournament
      myReadyState = {};
      if (selectedTournamentId === msg.data.tournamentId && currentView === 'bracket') {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
    }));

    // Round started
    unsubscribers.push(wsClient.on('tournament:round-started', (msg) => {
      showToast(`Round ${msg.data.round} has started! Ready up for your match.`, 'info');
      // Clear ready states for new round
      myReadyState = {};
      if (selectedTournamentId === msg.data.tournamentId && currentView === 'bracket') {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
    }));

    // CRITICAL: Listen for game-starting events from tournament matches
    // When the backend starts a tournament game, it sends game-starting to the players
    // We need to navigate to the game view so the game-starting handler in GameView processes it
    unsubscribers.push(wsClient.on('game-starting', (msg) => {
      if (msg.data.tournamentId) {
        console.log('Tournament game starting', msg.data);
        if (msg.data.isLocalTournament) {
          showToast(`Local match: ${msg.data.player1?.name} vs ${msg.data.player2?.name}`, 'info');
        } else {
          showToast(`Tournament match starting: Round ${msg.data.round}!`, 'info');
        }
        router.navigateTo('/game');
      }
    }));

    // Match starting - THIS IS IMPORTANT: notifies us a tournament match is about to start
    unsubscribers.push(wsClient.on('tournament:match-starting', (msg) => {
      showToast(`Tournament match starting: vs ${msg.data.opponent?.name}!`, 'info');
      // The game-starting event handler above will navigate us to the game view
      // This event is sent AFTER game-starting, so navigation should already be happening
    }));

    // Match completed
    unsubscribers.push(wsClient.on('tournament:match-completed', (msg) => {
      const isMyMatch = bracketData?.myMatches.some(m => m.matchId === msg.data.matchId);
      if (isMyMatch) {
        if (msg.data.winnerId === currentUserId) {
          showToast('You won the match! Advancing to next round.', 'success');
        } else {
          showToast('Match completed. Better luck next time!', 'info');
        }
      }
      // Clear ready state for completed match
      if (msg.data.matchId) {
        delete myReadyState[msg.data.matchId];
      }
      // Refresh bracket
      if (selectedTournamentId === msg.data.tournamentId && currentView === 'bracket') {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
    }));

    // Round progress
    unsubscribers.push(wsClient.on('tournament:round-progress', (msg) => {
      if (selectedTournamentId === msg.data.tournamentId && currentView === 'bracket') {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
    }));

    // Round completed
    unsubscribers.push(wsClient.on('tournament:round-completed', (msg) => {
      showToast(`Round ${msg.data.round} completed! Next round starting soon.`, 'info');
      // Clear all ready states for new round
      myReadyState = {};
    }));

    // Tournament completed
    unsubscribers.push(wsClient.on('tournament:completed', (msg) => {
      const isWinner = msg.data.winnerId === currentUserId;
      if (isWinner) {
        showToast('🏆 Congratulations! You won the tournament!', 'success');
      } else {
        showToast(`Tournament complete! Winner: ${msg.data.winnerName}`, 'info');
      }
      if (selectedTournamentId === msg.data.tournamentId && currentView === 'bracket') {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
    }));

    // Tournament cancelled
    unsubscribers.push(wsClient.on('tournament:cancelled', (msg) => {
      showToast('Tournament has been cancelled', 'info');
      if (selectedTournamentId === msg.data.tournamentId) {
        showView('list');
      }
    }));

    // Bracket data received
    unsubscribers.push(wsClient.on('tournament:bracket', (msg) => {
      if (msg.data.bracket) {
        bracketData = msg.data.bracket;
        if (currentView === 'bracket') {
          renderBracket();
        }
      }
    }));

    // Tournament data (fallback)
    unsubscribers.push(wsClient.on('tournament:data', (msg) => {
      // If we get raw tournament data, request bracket format
      if (msg.data.tournament && selectedTournamentId === msg.data.tournament.id) {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
      }
    }));

    // Error handling
    unsubscribers.push(wsClient.on('tournament:error', (msg) => {
      showToast(msg.data.message || 'Tournament error', 'error');
    }));
  };

  // Helper functions
  const escapeHtml = (text: string): string => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const nextPowerOfTwo = (n: number): number => {
    let power = 1;
    while (power < n) {
      power *= 2;
    }
    return power;
  };

  // Button handlers
  container.querySelector('#createTournamentBtn')?.addEventListener('click', () => {
    showView('create');
  });

  container.querySelector('#createFirstBtn')?.addEventListener('click', () => {
    showView('create');
  });

  container.querySelector('#cancelCreateBtn')?.addEventListener('click', () => {
    showView('list');
  });

  container.querySelector('#backToBrowseBtn')?.addEventListener('click', () => {
    selectedTournamentId = null;
    bracketData = null;
    myReadyState = {};
    showView('list');
  });

  container.querySelector('#refreshListBtn')?.addEventListener('click', () => {
    loadTournaments();
  });

  container.querySelector('#refreshBracketBtn')?.addEventListener('click', () => {
    if (selectedTournamentId) {
      wsClient.send('tournament:get-bracket', { tournamentId: selectedTournamentId });
    }
  });

  // Form submission
  createTournamentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    createError.classList.add('hidden');

    const name = tournamentNameInput.value.trim();
    const max = parseInt(maxPlayersSelect.value);

    if (name.length < 3) {
      createError.textContent = 'Tournament name must be at least 3 characters';
      createError.classList.remove('hidden');
      return;
    }

    if (isLocalMode) {
      // Collect player names
      const inputs = localPlayerInputs.querySelectorAll('.local-player-input') as NodeListOf<HTMLInputElement>;
      localPlayerNames = Array.from(inputs).map(input => input.value.trim());
      
      // Validate all names are filled
      if (localPlayerNames.some(name => !name)) {
        createError.textContent = 'Please enter names for all players';
        createError.classList.remove('hidden');
        return;
      }
      
      // Check for duplicate names
      const uniqueNames = new Set(localPlayerNames);
      if (uniqueNames.size !== localPlayerNames.length) {
        createError.textContent = 'Player names must be unique';
        createError.classList.remove('hidden');
        return;
      }
    }

    wsClient.send('tournament:create', {
      name,
      maxPlayers: max,
      bracketType: 'single_elimination',
      isLocal: isLocalMode,
      localPlayerNames: isLocalMode ? localPlayerNames : undefined,
    });
  });

  // Initialize
  setupWSHandlers();
  loadTournaments();

  // Cleanup
  (container as any).__cleanup = () => {
    unsubscribers.forEach(unsub => unsub());
  };

  return container;
}
