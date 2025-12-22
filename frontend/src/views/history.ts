import { storage } from '../utils/storage';
import { showToast } from '../utils/toast';
import { API_BASE_URL } from '../constants';
import {
  historyApi,
  formatDuration,
  formatDate,
  getEloChangeDisplay,
  getMatchTypeDisplay,
  getPlacementSuffix,
  getRankColor,
  getRankTitle,
  type MatchHistoryEntry,
  type TournamentHistoryEntry,
  type PlayerStats,
} from '../api/history';

export function HistoryView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 flex flex-col items-center justify-start px-4 py-8';

  const user = storage.getUserData();

  container.innerHTML = `
    <h1 class="text-3xl font-bold mb-6">
      <span class="text-blue animate-glow">Match</span> <span class="text-navy">History</span>
    </h1>

    <!-- Stats Summary -->
    <div id="statsSection" class="mb-8">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-card p-4 text-center">
          <div id="statElo" class="text-3xl font-bold text-blue">-</div>
          <div class="text-sm text-navy-muted">ELO Rating</div>
          <div id="statRank" class="text-xs text-navy-muted mt-1">-</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div id="statWinRate" class="text-3xl font-bold text-green-500">-</div>
          <div class="text-sm text-navy-muted">Win Rate</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div id="statGames" class="text-3xl font-bold text-purple-500">-</div>
          <div class="text-sm text-navy-muted">Total Games</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div id="statStreak" class="text-3xl font-bold text-orange-500">-</div>
          <div class="text-sm text-navy-muted">Current Streak</div>
        </div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2 mb-6">
      <button id="tabMatches" class="tab-btn active px-4 py-2 rounded-lg font-semibold transition-colors bg-blue text-white">
        Matches
      </button>
      <button id="tabTournaments" class="tab-btn px-4 py-2 rounded-lg font-semibold transition-colors bg-navy/10 text-navy hover:bg-navy/20">
        Tournaments
      </button>
    </div>

    <!-- Filter (for matches) -->
    <div id="filterSection" class="mb-4">
      <select id="typeFilter" class="input-glass px-4 py-2">
        <option value="all">All Matches</option>
        <option value="quickplay">Quick Play</option>
        <option value="tournament">Tournament</option>
        <option value="ai">vs AI</option>
      </select>
    </div>

    <!-- Content -->
    <div id="matchesContent" class="space-y-4">
      <div class="text-center text-navy-muted py-8">
        Loading match history...
      </div>
    </div>

    <div id="tournamentsContent" class="hidden space-y-4">
      <div class="text-center text-navy-muted py-8">
        Loading tournament history...
      </div>
    </div>

    <!-- Load More -->
    <div id="loadMoreSection" class="text-center mt-6 hidden">
      <button id="loadMoreBtn" class="btn-secondary px-6 py-2">
        Load More
      </button>
    </div>

    <!-- Match Detail Modal -->
    <div id="matchModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
      <div class="glass-card p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div id="matchModalContent">
          <!-- Content will be injected here -->
        </div>
      </div>
    </div>

    <!-- Tournament Detail Modal -->
    <div id="tournamentModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
      <div class="glass-card p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div id="tournamentModalContent">
          <!-- Content will be injected here -->
        </div>
      </div>
    </div>
  `;

  // State
  let currentTab = 'matches';
  let matchHistory: MatchHistoryEntry[] = [];
  let tournamentHistory: TournamentHistoryEntry[] = [];
  let currentOffset = 0;
  let totalMatches = 0;
  const pageSize = 20;

  // Elements
  const tabMatches = container.querySelector('#tabMatches') as HTMLButtonElement;
  const tabTournaments = container.querySelector('#tabTournaments') as HTMLButtonElement;
  const filterSection = container.querySelector('#filterSection') as HTMLDivElement;
  const typeFilter = container.querySelector('#typeFilter') as HTMLSelectElement;
  const matchesContent = container.querySelector('#matchesContent') as HTMLDivElement;
  const tournamentsContent = container.querySelector('#tournamentsContent') as HTMLDivElement;
  const loadMoreSection = container.querySelector('#loadMoreSection') as HTMLDivElement;
  const loadMoreBtn = container.querySelector('#loadMoreBtn') as HTMLButtonElement;
  const matchModal = container.querySelector('#matchModal') as HTMLDivElement;
  const matchModalContent = container.querySelector('#matchModalContent') as HTMLDivElement;
  const tournamentModal = container.querySelector('#tournamentModal') as HTMLDivElement;
  const tournamentModalContent = container.querySelector('#tournamentModalContent') as HTMLDivElement;

  // Load initial data
  loadStats();
  loadMatches();

  // Tab switching
  tabMatches.addEventListener('click', () => {
    currentTab = 'matches';
    tabMatches.className = 'tab-btn px-4 py-2 rounded-lg font-semibold transition-colors bg-blue text-white';
    tabTournaments.className = 'tab-btn px-4 py-2 rounded-lg font-semibold transition-colors bg-navy/10 text-navy hover:bg-navy/20';
    filterSection.classList.remove('hidden');
    matchesContent.classList.remove('hidden');
    tournamentsContent.classList.add('hidden');
    updateLoadMoreVisibility();
  });

  tabTournaments.addEventListener('click', () => {
    currentTab = 'tournaments';
    tabTournaments.className = 'tab-btn px-4 py-2 rounded-lg font-semibold transition-colors bg-blue text-white';
    tabMatches.className = 'tab-btn px-4 py-2 rounded-lg font-semibold transition-colors bg-navy/10 text-navy hover:bg-navy/20';
    filterSection.classList.add('hidden');
    matchesContent.classList.add('hidden');
    tournamentsContent.classList.remove('hidden');
    loadMoreSection.classList.add('hidden');
    
    if (tournamentHistory.length === 0) {
      loadTournaments();
    }
  });

  // Filter change
  typeFilter.addEventListener('change', () => {
    currentOffset = 0;
    matchHistory = [];
    loadMatches();
  });

  // Load more
  loadMoreBtn.addEventListener('click', () => {
    currentOffset += pageSize;
    loadMatches(true);
  });

  // Modal close handlers
  matchModal.addEventListener('click', (e) => {
    if (e.target === matchModal) {
      matchModal.classList.add('hidden');
      matchModal.classList.remove('flex');
    }
  });

  tournamentModal.addEventListener('click', (e) => {
    if (e.target === tournamentModal) {
      tournamentModal.classList.add('hidden');
      tournamentModal.classList.remove('flex');
    }
  });

  // ==================== LOAD FUNCTIONS ====================

  async function loadStats() {
    try {
      const response = await historyApi.getMyStats();
      
      if (response.success && response.data) {
        const stats = response.data;
        const winRateDisplay = Math.floor(stats.winRate * 100);
        
        (container.querySelector('#statElo') as HTMLDivElement).textContent = stats.currentElo.toString();
        (container.querySelector('#statElo') as HTMLDivElement).style.color = getRankColor(stats.currentElo);
        (container.querySelector('#statRank') as HTMLDivElement).textContent = 
          `${getRankTitle(stats.currentElo)} • #${stats.leaderboardRank || '-'}`;
        (container.querySelector('#statWinRate') as HTMLDivElement).textContent = `${winRateDisplay}%`;
        (container.querySelector('#statGames') as HTMLDivElement).textContent = stats.totalGames.toString();
        (container.querySelector('#statStreak') as HTMLDivElement).textContent = 
          stats.currentWinStreak > 0 ? `${stats.currentWinStreak}W` : '0';
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadMatches(append: boolean = false) {
    if (!append) {
      matchesContent.innerHTML = `
        <div class="text-center text-navy-muted py-8">
          Loading match history...
        </div>
      `;
    }

    try {
      const filterType = typeFilter.value as 'all' | 'quickplay' | 'tournament' | 'ai';
      const response = await historyApi.getMyMatchHistory(pageSize, currentOffset, filterType);
      
      if (response.success && response.data) {
        if (append) {
          matchHistory = [...matchHistory, ...response.data.matches];
        } else {
          matchHistory = response.data.matches;
        }
        totalMatches = response.data.total;
        
        renderMatches();
        updateLoadMoreVisibility();
      } else {
        matchesContent.innerHTML = `
          <div class="text-center text-navy-muted py-8">
            Failed to load match history
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to load matches:', error);
      matchesContent.innerHTML = `
        <div class="text-center text-red-500 py-8">
          Error loading match history
        </div>
      `;
    }
  }

  async function loadTournaments() {
    tournamentsContent.innerHTML = `
      <div class="text-center text-navy-muted py-8">
        Loading tournament history...
      </div>
    `;

    try {
      const response = await historyApi.getMyTournamentHistory();
      
      if (response.success && response.data) {
        tournamentHistory = response.data;
        renderTournaments();
      } else {
        tournamentsContent.innerHTML = `
          <div class="text-center text-navy-muted py-8">
            Failed to load tournament history
          </div>
        `;
      }
    } catch (error) {
      console.error('Failed to load tournaments:', error);
      tournamentsContent.innerHTML = `
        <div class="text-center text-red-500 py-8">
          Error loading tournament history
        </div>
      `;
    }
  }

  // ==================== RENDER FUNCTIONS ====================

  function renderMatches() {
    if (matchHistory.length === 0) {
      matchesContent.innerHTML = `
        <div class="text-center text-navy-muted py-8">
          <p>No matches found</p>
          <a href="/game" class="text-blue hover:text-blue-dark mt-2 inline-block">Play your first game!</a>
        </div>
      `;
      return;
    }

    matchesContent.innerHTML = matchHistory.map(match => {
      const isWin = match.winnerId === match.player1Id;
      const eloChange = getEloChangeDisplay(match.player1EloChange);
      
      return `
        <button 
          class="match-item w-full text-left glass-card p-4 mb-2 hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${isWin ? 'border-green-500' : 'border-red-500'}"
          data-match-id="${match.id}"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <!-- Result indicator -->
              <div class="text-2xl font-bold ${isWin ? 'text-green-500' : 'text-red-500'}">
                ${isWin ? 'W' : 'L'}
              </div>
              
              <!-- Players -->
              <div>
                <div class="flex items-center gap-2">
                  <span class="font-semibold text-navy">${match.player1Name}</span>
                  <span class="text-navy-muted">vs</span>
                  <span class="font-semibold text-navy">${match.player2Name}</span>
                </div>
                <div class="text-sm text-navy-muted">
                  ${getMatchTypeDisplay(match.type)} • ${formatDate(match.date)}
                </div>
              </div>
            </div>
            
            <div class="text-right">
              <!-- Score -->
              <div class="text-xl font-bold text-navy">
                ${match.player1Score} - ${match.player2Score}
              </div>
              
              <!-- ELO change -->
              <div class="text-sm font-semibold ${eloChange.color}">
                ${eloChange.text} ELO
              </div>
            </div>
          </div>
          
          ${match.tournamentName ? `
            <div class="mt-2 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded inline-block">
              🏆 ${match.tournamentName} - Round ${match.tournamentRound}
            </div>
          ` : ''}
        </button>
      `;
    }).join('');

    // Add click handlers
    matchesContent.querySelectorAll('.match-item').forEach(item => {
      item.addEventListener('click', () => {
        const matchId = parseInt(item.getAttribute('data-match-id')!, 10);
        showMatchDetails(matchId);
      });
    });
  }

  function renderTournaments() {
    if (tournamentHistory.length === 0) {
      tournamentsContent.innerHTML = `
        <div class="text-center text-navy-muted py-8">
          <p>No tournaments played yet</p>
          <a href="/tournament" class="text-blue hover:text-blue-dark mt-2 inline-block">Join or create a tournament!</a>
        </div>
      `;
      return;
    }

    tournamentsContent.innerHTML = tournamentHistory.map(tournament => {
      const eloChange = getEloChangeDisplay(tournament.totalEloChange);
      const placementText = getPlacementSuffix(tournament.placement);
      
      return `
        <button 
          class="tournament-item w-full text-left glass-card p-6 mb-2 hover:shadow-lg transition-shadow cursor-pointer"
          data-tournament-id="${tournament.id}"
        >
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-xl font-bold text-navy">${tournament.name}</h3>
              <p class="text-sm text-navy-muted">${formatDate(tournament.date)}</p>
            </div>
            
            <div class="text-right">
              <div class="text-3xl font-bold ${tournament.placement === 1 ? 'text-yellow-500' : tournament.placement <= 3 ? 'text-blue' : 'text-navy'}">
                ${placementText}
              </div>
              <div class="text-sm font-semibold ${eloChange.color}">
                ${eloChange.text} ELO
              </div>
            </div>
          </div>
          
          <div class="grid grid-cols-3 gap-4 text-center">
            <div>
              <div class="text-lg font-bold text-navy">${tournament.matchesWon}/${tournament.matchesPlayed}</div>
              <div class="text-xs text-navy-muted">Matches Won</div>
            </div>
            <div>
              <div class="text-lg font-bold text-navy">${tournament.totalPlayers}</div>
              <div class="text-xs text-navy-muted">Players</div>
            </div>
            <div>
              <div class="text-lg font-bold text-navy">${tournament.totalRounds}</div>
              <div class="text-xs text-navy-muted">Rounds</div>
            </div>
          </div>
          
          ${tournament.winnerId ? `
            <div class="mt-4 text-sm text-center text-navy-muted">
              🏆 Winner: <span class="font-semibold text-navy">${tournament.winnerName}</span>
            </div>
          ` : ''}
        </button>
      `;
    }).join('');

    // Add click handlers
    tournamentsContent.querySelectorAll('.tournament-item').forEach(item => {
      item.addEventListener('click', () => {
        const tournamentId = parseInt(item.getAttribute('data-tournament-id')!, 10);
        showTournamentDetails(tournamentId);
      });
    });
  }

  // ==================== MODAL FUNCTIONS ====================

  function showMatchDetails(matchId: number) {
    const match = matchHistory.find(m => m.id === matchId);
    if (!match) return;

    const isWin = match.winnerId === match.player1Id;
    const eloChange = getEloChangeDisplay(match.player1EloChange);

    matchModalContent.innerHTML = `
      <div class="text-center mb-6">
        <button id="closeMatchModal" class="absolute top-4 right-4 text-navy-muted hover:text-navy">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
        <div class="text-4xl font-bold mb-2 ${isWin ? 'text-green-500' : 'text-red-500'}" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.5), -1px -1px 2px rgba(0,0,0,0.5), 1px -1px 2px rgba(0,0,0,0.5), -1px 1px 2px rgba(0,0,0,0.5);">
          ${isWin ? 'VICTORY' : 'DEFEAT'}
        </div>
        <div class="text-navy-muted">${getMatchTypeDisplay(match.type)}</div>
      </div>
      
      <!-- Players & Score -->
      <div class="flex items-center justify-center gap-8 mb-6">
        <div class="text-center">
          <img 
            src="${getAvatarUrl(match.player1Avatar)}"
            alt="${match.player1Name}"
            class="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%2300d4ff%22>${match.player1Name[0]}</text></svg>'"
          />
          <div class="font-semibold text-navy">${match.player1Name}</div>
          <div class="text-sm text-navy-muted">${match.player1EloBefore} ELO</div>
        </div>
        
        <div class="text-center">
          <div class="text-4xl font-bold text-navy">
            ${match.player1Score} - ${match.player2Score}
          </div>
          <div class="text-sm text-navy-muted">${formatDuration(match.duration)}</div>
        </div>
        
        <div class="text-center">
          <img 
            src="${getAvatarUrl(match.player2Avatar)}"
            alt="${match.player2Name}"
            class="w-16 h-16 rounded-full mx-auto mb-2 object-cover"
            onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%2300d4ff%22>${match.player2Name[0]}</text></svg>'"
          />
          <div class="font-semibold text-navy">${match.player2Name}</div>
          <div class="text-sm text-navy-muted">${match.player2EloBefore} ELO</div>
        </div>
      </div>
      
      <!-- ELO Change -->
      <div class="glass-card bg-navy/5 p-4 rounded-lg mb-4">
        <div class="text-center">
          <div class="text-sm text-navy-muted mb-1">Your ELO Change</div>
          <div class="text-3xl font-bold ${eloChange.color}">${eloChange.text}</div>
          <div class="text-sm text-navy-muted">
            ${match.player1EloBefore} → ${match.player1EloAfter}
          </div>
        </div>
      </div>
      
      <!-- Match Info -->
      <div class="grid grid-cols-2 gap-4 text-sm">
        <div class="text-navy-muted">Date</div>
        <div class="text-navy text-right">${new Date(match.date).toLocaleString()}</div>
        
        <div class="text-navy-muted">Duration</div>
        <div class="text-navy text-right">${formatDuration(match.duration)}</div>
        
        <div class="text-navy-muted">Match Type</div>
        <div class="text-navy text-right">${getMatchTypeDisplay(match.type)}</div>
        
        ${match.tournamentName ? `
          <div class="text-navy-muted">Tournament</div>
          <div class="text-navy text-right">${match.tournamentName}</div>
          
          <div class="text-navy-muted">Round</div>
          <div class="text-navy text-right">${match.tournamentRound}</div>
        ` : ''}
      </div>
    `;

    // Close button handler
    matchModalContent.querySelector('#closeMatchModal')?.addEventListener('click', () => {
      matchModal.classList.add('hidden');
      matchModal.classList.remove('flex');
    });

    matchModal.classList.remove('hidden');
    matchModal.classList.add('flex');
  }

  async function showTournamentDetails(tournamentId: number) {
    tournamentModalContent.innerHTML = `
      <div class="text-center py-8">
        <div class="animate-spin w-8 h-8 border-4 border-blue border-t-transparent rounded-full mx-auto"></div>
        <p class="text-navy-muted mt-4">Loading tournament details...</p>
      </div>
    `;

    tournamentModal.classList.remove('hidden');
    tournamentModal.classList.add('flex');

    try {
      const response = await historyApi.getTournamentDetails(tournamentId);
      
      if (response.success && response.data) {
        renderTournamentModal(response.data);
      } else {
        tournamentModalContent.innerHTML = `
          <div class="text-center text-red-500 py-8">
            Failed to load tournament details
          </div>
        `;
      }
    } catch (error) {
      tournamentModalContent.innerHTML = `
        <div class="text-center text-red-500 py-8">
          Error loading tournament details
        </div>
      `;
    }
  }

  function renderTournamentModal(tournament: TournamentHistoryEntry) {
    const userId = user?.id ? parseInt(user.id as string, 10) : null;
    
    tournamentModalContent.innerHTML = `
      <div class="relative">
        <button id="closeTournamentModal" class="absolute top-0 right-0 text-navy-muted hover:text-navy">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
        <h2 class="text-2xl font-bold text-navy mb-2">${tournament.name}</h2>
        <p class="text-navy-muted mb-6">${formatDate(tournament.date)} • ${tournament.totalPlayers} players</p>
        
        ${tournament.winnerName ? `
          <div class="text-center mb-6 p-4 bg-yellow-50 rounded-lg">
            <div class="text-yellow-500 text-sm font-semibold">🏆 CHAMPION</div>
            <div class="text-xl font-bold text-navy">${tournament.winnerName}</div>
          </div>
        ` : ''}
        
        <!-- Bracket -->
        <h3 class="text-lg font-semibold text-navy mb-4">Tournament Bracket</h3>
        <div class="overflow-x-auto pb-4">
          <div class="bracket flex gap-8 min-w-max">
            ${tournament.bracket.rounds.map(round => `
              <div class="round flex flex-col justify-around">
                <div class="text-sm font-semibold text-navy-muted mb-2 text-center">
                  ${round.roundName}
                </div>
                <div class="space-y-4">
                  ${round.matches.map(match => `
                    <div class="match-bracket glass-card p-3 min-w-[200px] ${
                      match.status === 'completed' ? '' : 'opacity-60'
                    }">
                      <div class="flex items-center justify-between mb-1 ${
                        match.winnerId === match.player1Id ? 'font-bold text-green-600' : 'text-navy'
                      } ${match.player1Id === userId ? 'bg-blue/10 -mx-2 px-2 rounded' : ''}">
                        <span class="truncate">${match.player1Name}</span>
                        <span>${match.player1Score ?? '-'}</span>
                      </div>
                      <div class="flex items-center justify-between ${
                        match.winnerId === match.player2Id ? 'font-bold text-green-600' : 'text-navy'
                      } ${match.player2Id === userId ? 'bg-blue/10 -mx-2 px-2 rounded' : ''}">
                        <span class="truncate">${match.player2Name}</span>
                        <span>${match.player2Score ?? '-'}</span>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Close button handler
    tournamentModalContent.querySelector('#closeTournamentModal')?.addEventListener('click', () => {
      tournamentModal.classList.add('hidden');
      tournamentModal.classList.remove('flex');
    });
  }

  // ==================== HELPER FUNCTIONS ====================

  function updateLoadMoreVisibility() {
    if (currentTab === 'matches' && matchHistory.length < totalMatches) {
      loadMoreSection.classList.remove('hidden');
    } else {
      loadMoreSection.classList.add('hidden');
    }
  }

  function getAvatarUrl(avatar?: string): string {
    if (!avatar || avatar === 'default-avatar.png') {
      return '';
    }
    if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
      return avatar;
    }
    return `${API_BASE_URL}/uploads/${avatar}`;
  }

  return container;
}
