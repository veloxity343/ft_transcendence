import { wsClient } from '../websocket/client';
import { showToast } from '../utils/toast';
import { storage } from '../utils/storage';

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
  spinner: `<svg class="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
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
  avatar: string;
  seed?: number;
}

interface TournamentMatch {
  matchId: string;
  round: number;
  matchNumber: number;
  player1Id: number | null;
  player2Id: number | null;
  player1Name?: string;
  player2Name?: string;
  winnerId?: number;
  status: string;
}

export function TournamentView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 p-4 md:p-8';

  // State
  let currentView: 'list' | 'create' | 'bracket' = 'list';
  let tournaments: Tournament[] = [];
  let selectedTournament: Tournament | null = null;
  const unsubscribers: (() => void)[] = [];

  // Initial HTML
  container.innerHTML = `
    <div class="max-w-7xl mx-auto">
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold mb-2">
          <span class="text-blue animate-glow">TOURNAMENTS</span>
        </h1>
        <p class="text-navy-muted">Compete in bracket-style tournaments</p>
      </div>

      <!-- Tournament List View -->
      <div id="tournamentList" class="space-y-6">
        <div class="flex justify-center mb-6">
          <button id="createTournamentBtn" class="btn-primary px-6 py-3">
            ${icons.plus}
            <span>Create Tournament</span>
          </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6" id="tournamentCards">
          <!-- Tournament cards will be inserted here -->
        </div>

        <div id="emptyState" class="hidden glass-card p-12 text-center">
          <div class="text-6xl mb-4">${icons.trophy}</div>
          <h3 class="text-xl font-bold text-navy mb-2">No Active Tournaments</h3>
          <p class="text-navy-muted mb-6">Be the first to create a tournament!</p>
          <button id="createFirstBtn" class="btn-primary">
            ${icons.plus} Create Tournament
          </button>
        </div>
      </div>

      <!-- Create Tournament View -->
      <div id="createTournament" class="hidden max-w-2xl mx-auto">
        <div class="glass-card p-8">
          <h2 class="text-2xl font-bold text-navy mb-6">Create Tournament</h2>
          
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
              <label class="block text-sm font-medium mb-2 text-navy">Max Players</label>
              <select id="maxPlayers" class="input-glass w-full">
                <option value="4">4 Players</option>
                <option value="8">8 Players</option>
                <option value="16">16 Players</option>
                <option value="32">32 Players</option>
              </select>
            </div>

            <div id="createError" class="text-red-500 text-sm hidden"></div>

            <div class="flex gap-4">
              <button type="submit" class="btn-primary flex-1">Create</button>
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

          <div id="tournamentActions" class="flex justify-center gap-4 mb-6">
            <!-- Action buttons will be inserted here -->
          </div>

          <div id="winnerBanner" class="hidden bg-gradient-to-r from-yellow-100 to-yellow-50 border-2 border-yellow-400 rounded-xl p-6 text-center mb-6">
            <div class="text-4xl mb-2">${icons.crown}</div>
            <h3 class="text-2xl font-bold text-yellow-900 mb-1">Tournament Winner!</h3>
            <p id="winnerName" class="text-xl text-yellow-800"></p>
          </div>
        </div>

        <!-- Bracket Display -->
        <div id="bracketContainer" class="glass-card p-6">
          <div id="bracketContent" class="overflow-x-auto">
            <!-- Bracket rounds will be inserted here -->
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
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
      }
      .status-registration {
        background: rgba(16, 185, 129, 0.2);
        color: #059669;
        border: 1px solid #059669;
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
      .bracket-round {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        min-width: 250px;
      }
      .bracket-match {
        background: rgba(255, 255, 255, 0.5);
        border: 2px solid rgba(212, 184, 150, 0.5);
        border-radius: 12px;
        padding: 0.75rem;
        transition: all 0.2s;
      }
      .bracket-match:hover {
        border-color: var(--color-blue);
      }
      .bracket-match.in_progress {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      .bracket-match.completed {
        border-color: #059669;
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
        background: rgba(16, 185, 129, 0.1);
        font-weight: 600;
      }
      .bracket-player.loser {
        opacity: 0.5;
      }
      .bracket-connector {
        position: relative;
        width: 40px;
        height: 100%;
        display: flex;
        align-items: center;
      }
      .bracket-connector::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        height: 2px;
        background: var(--color-tan);
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      .animate-pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
      }
    </style>
  `;

  // Elements
  const tournamentList = container.querySelector('#tournamentList') as HTMLElement;
  const createTournament = container.querySelector('#createTournament') as HTMLElement;
  const bracketView = container.querySelector('#bracketView') as HTMLElement;
  const tournamentCards = container.querySelector('#tournamentCards') as HTMLElement;
  const emptyState = container.querySelector('#emptyState') as HTMLElement;
  const createTournamentForm = container.querySelector('#createTournamentForm') as HTMLFormElement;
  const tournamentName = container.querySelector('#tournamentName') as HTMLInputElement;
  const maxPlayers = container.querySelector('#maxPlayers') as HTMLSelectElement;
  const createError = container.querySelector('#createError') as HTMLElement;

  // View switching
  const showView = (view: 'list' | 'create' | 'bracket') => {
    currentView = view;
    tournamentList.classList.toggle('hidden', view !== 'list');
    createTournament.classList.toggle('hidden', view !== 'create');
    bracketView.classList.toggle('hidden', view !== 'bracket');

    if (view === 'list') {
      loadTournaments();
    }
  };

  // Load tournaments
  const loadTournaments = () => {
    wsClient.send('tournament:list-active');
  };

  // Render tournament cards
  const renderTournaments = () => {
    if (tournaments.length === 0) {
      tournamentCards.classList.add('hidden');
      emptyState.classList.remove('hidden');
      return;
    }

    tournamentCards.classList.remove('hidden');
    emptyState.classList.add('hidden');

    tournamentCards.innerHTML = tournaments.map(t => `
      <div class="tournament-card" data-tournament-id="${t.id}">
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-xl font-bold text-navy">${escapeHtml(t.name)}</h3>
          <span class="status-badge status-${t.status}">
            ${t.status === 'registration' ? 'Open' : t.status === 'in_progress' ? 'In Progress' : 'Finished'}
          </span>
        </div>
        
        <div class="space-y-2 text-sm text-navy-muted mb-4">
          <div class="flex items-center gap-2">
            ${icons.users}
            <span>${t.currentPlayers} / ${t.maxPlayers} Players</span>
          </div>
          ${t.status === 'in_progress' ? `
            <div class="flex items-center gap-2">
              ${icons.trophy}
              <span>Round ${t.currentRound || 0} of ${t.totalRounds || 0}</span>
            </div>
          ` : ''}
        </div>

        <button class="btn-primary w-full view-bracket-btn" data-tournament-id="${t.id}">
          ${t.status === 'registration' ? 'Join Tournament' : 'View Bracket'}
        </button>
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.view-bracket-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = parseInt((btn as HTMLElement).dataset.tournamentId!);
        viewTournament(id);
      });
    });
  };

  // View tournament bracket
  const viewTournament = (tournamentId: number) => {
    selectedTournament = tournaments.find(t => t.id === tournamentId) || null;
    if (!selectedTournament) return;

    // Request detailed tournament data
    wsClient.send('tournament:get', { tournamentId });
    wsClient.send('tournament:get-bracket', { tournamentId });
    
    showView('bracket');
  };

  // Render tournament bracket
  const renderBracket = (tournament: Tournament) => {
    const bracketTitle = container.querySelector('#bracketTitle') as HTMLElement;
    const playerCount = container.querySelector('#playerCount') as HTMLElement;
    const roundInfo = container.querySelector('#roundInfo') as HTMLElement;
    const tournamentStatus = container.querySelector('#tournamentStatus') as HTMLElement;
    const tournamentActions = container.querySelector('#tournamentActions') as HTMLElement;
    const winnerBanner = container.querySelector('#winnerBanner') as HTMLElement;
    const winnerName = container.querySelector('#winnerName') as HTMLElement;
    const bracketContent = container.querySelector('#bracketContent') as HTMLElement;

    // Update header
    bracketTitle.textContent = tournament.name;
    playerCount.textContent = `${tournament.currentPlayers} / ${tournament.maxPlayers} Players`;
    roundInfo.textContent = tournament.status === 'registration' 
      ? 'Waiting to start' 
      : `Round ${tournament.currentRound || 0} of ${tournament.totalRounds || 0}`;

    // Update status badge
    tournamentStatus.className = `status-badge status-${tournament.status}`;
    tournamentStatus.textContent = tournament.status === 'registration' ? 'Registration' : 
                                     tournament.status === 'in_progress' ? 'In Progress' : 'Completed';

    // Show/hide winner banner
    if (tournament.status === 'finished' && tournament.winnerName) {
      winnerBanner.classList.remove('hidden');
      winnerName.textContent = tournament.winnerName;
    } else {
      winnerBanner.classList.add('hidden');
    }

    // Render action buttons
    const user = storage.getUserData();
    const isCreator = user && tournament.creatorId === parseInt(user.id);
    const isParticipant = tournament.players?.some(p => p.userId === parseInt(user?.id || '0'));

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
      
      if (isCreator && tournament.currentPlayers >= 4) {
        tournamentActions.innerHTML += `
          <button id="startTournamentBtn" class="btn-primary px-6 py-3">
            ${icons.play} Start Tournament
          </button>
        `;
      }
    }

    // Render bracket
    if (tournament.matches && tournament.matches.length > 0) {
      const rounds: TournamentMatch[][] = [];
      const maxRound = Math.max(...tournament.matches.map(m => m.round));
      
      for (let r = 1; r <= maxRound; r++) {
        rounds.push(tournament.matches.filter(m => m.round === r));
      }

      bracketContent.innerHTML = `
        <div class="flex gap-8 justify-center items-center">
          ${rounds.map((round, roundIndex) => `
            <div class="bracket-round">
              <div class="text-center mb-4">
                <h4 class="font-bold text-navy">
                  ${roundIndex === maxRound - 1 ? 'Finals' : 
                    roundIndex === maxRound - 2 ? 'Semi-Finals' : 
                    `Round ${roundIndex + 1}`}
                </h4>
              </div>
              ${round.map(match => `
                <div class="bracket-match ${match.status}">
                  <div class="space-y-2">
                    <div class="bracket-player ${match.winnerId === match.player1Id ? 'winner' : match.winnerId ? 'loser' : ''}">
                      <span class="text-sm ${!match.player1Name ? 'text-navy-muted italic' : 'text-navy font-medium'}">
                        ${match.player1Name || 'TBD'}
                      </span>
                      ${match.winnerId === match.player1Id ? `<span class="text-green-500">${icons.crown}</span>` : ''}
                    </div>
                    <div class="bracket-player ${match.winnerId === match.player2Id ? 'winner' : match.winnerId ? 'loser' : ''}">
                      <span class="text-sm ${!match.player2Name ? 'text-navy-muted italic' : 'text-navy font-medium'}">
                        ${match.player2Name || 'TBD'}
                      </span>
                      ${match.winnerId === match.player2Id ? `<span class="text-green-500">${icons.crown}</span>` : ''}
                    </div>
                  </div>
                  ${match.status === 'in_progress' ? `
                    <div class="text-center mt-2 text-xs text-blue-600 font-semibold animate-pulse">
                      IN PROGRESS
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
            ${roundIndex < rounds.length - 1 ? '<div class="bracket-connector"></div>' : ''}
          `).join('')}
        </div>
      `;
    } else if (tournament.status === 'registration') {
      bracketContent.innerHTML = `
        <div class="text-center py-12">
          <p class="text-navy-muted mb-4">Waiting for more players to join...</p>
          <div class="glass-card inline-block p-6">
            <h4 class="font-bold text-navy mb-4">Current Players</h4>
            <div class="space-y-2">
              ${tournament.players?.map(p => `
                <div class="flex items-center gap-2 px-4 py-2 bg-white/30 rounded-lg">
                  <span class="text-navy font-medium">${escapeHtml(p.username)}</span>
                </div>
              `).join('') || '<p class="text-navy-muted italic">No players yet</p>'}
            </div>
          </div>
        </div>
      `;
    }

    // Setup action button handlers
    setupBracketActions(tournament);
  };

  // Setup bracket action handlers
  const setupBracketActions = (tournament: Tournament) => {
    const joinBtn = container.querySelector('#joinTournamentBtn');
    const leaveBtn = container.querySelector('#leaveTournamentBtn');
    const startBtn = container.querySelector('#startTournamentBtn');

    joinBtn?.addEventListener('click', () => {
      wsClient.send('tournament:join', { tournamentId: tournament.id });
    });

    leaveBtn?.addEventListener('click', () => {
      wsClient.send('tournament:leave', { tournamentId: tournament.id });
    });

    startBtn?.addEventListener('click', () => {
      wsClient.send('tournament:start', { tournamentId: tournament.id });
    });
  };

  // Setup WebSocket handlers
  const setupWSHandlers = () => {
    unsubscribers.push(wsClient.on('tournament:active-list', (msg) => {
      tournaments = msg.data.tournaments || [];
      renderTournaments();
    }));

    unsubscribers.push(wsClient.on('tournament:created', (msg) => {
      showToast('Tournament created successfully!', 'success');
      selectedTournament = msg.data.tournament;
      if (selectedTournament) {
        viewTournament(selectedTournament.id);
      }
    }));

    unsubscribers.push(wsClient.on('tournament:joined', (msg) => {
      showToast('Joined tournament!', 'success');
      // Refresh tournament data
      if (selectedTournament) {
        wsClient.send('tournament:get', { tournamentId: selectedTournament.id });
      }
    }));

    unsubscribers.push(wsClient.on('tournament:left', (msg) => {
      showToast('Left tournament', 'info');
      showView('list');
    }));

    unsubscribers.push(wsClient.on('tournament:player-joined', (msg) => {
      // Refresh tournament data
      if (selectedTournament && selectedTournament.id === msg.data.tournamentId) {
        wsClient.send('tournament:get', { tournamentId: selectedTournament.id });
      }
    }));

    unsubscribers.push(wsClient.on('tournament:started', (msg) => {
      showToast('Tournament started!', 'success');
      // Refresh bracket
      if (selectedTournament) {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournament.id });
      }
    }));

    unsubscribers.push(wsClient.on('tournament:round-started', (msg) => {
      showToast(`Round ${msg.data.round} started!`, 'info');
    }));

    unsubscribers.push(wsClient.on('tournament:match-ready', (msg) => {
      showToast(`Your match is ready! Round ${msg.data.round} vs ${msg.data.opponent.name}`, 'info');
    }));

    unsubscribers.push(wsClient.on('tournament:match-completed', (msg) => {
      // Refresh bracket
      if (selectedTournament) {
        wsClient.send('tournament:get-bracket', { tournamentId: selectedTournament.id });
      }
    }));

    unsubscribers.push(wsClient.on('tournament:completed', (msg) => {
      showToast(`Tournament complete! Winner: ${msg.data.winnerName}`, 'success');
      // Refresh tournament
      if (selectedTournament) {
        wsClient.send('tournament:get', { tournamentId: selectedTournament.id });
      }
    }));

    unsubscribers.push(wsClient.on('tournament:data', (msg) => {
      selectedTournament = msg.data.tournament;
      if (selectedTournament && currentView === 'bracket') {
        renderBracket(selectedTournament);
      }
    }));

    unsubscribers.push(wsClient.on('tournament:bracket', (msg) => {
      if (selectedTournament && msg.data.bracket) {
        selectedTournament.matches = msg.data.bracket.rounds?.flatMap((r: any) => r.matches) || [];
        renderBracket(selectedTournament);
      }
    }));

    unsubscribers.push(wsClient.on('tournament:error', (msg) => {
      showToast(msg.data.message || 'Tournament error', 'error');
    }));
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
    selectedTournament = null;
    showView('list');
  });

  // Form submission
  createTournamentForm.addEventListener('submit', (e) => {
    e.preventDefault();
    createError.classList.add('hidden');

    const name = tournamentName.value.trim();
    const max = parseInt(maxPlayers.value);

    if (name.length < 3) {
      createError.textContent = 'Tournament name must be at least 3 characters';
      createError.classList.remove('hidden');
      return;
    }

    wsClient.send('tournament:create', {
      name,
      maxPlayers: max,
      bracketType: 'single_elimination'
    });

    // Reset form
    createTournamentForm.reset();
  });

  // HTML escape helper
  const escapeHtml = (text: string) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  // Initialize
  setupWSHandlers();
  loadTournaments();

  // Cleanup
  (container as any).__cleanup = () => {
    unsubscribers.forEach(unsub => unsub());
  };

  return container;
}
