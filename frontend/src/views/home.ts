import { router } from '../router';
import { authApi } from '../api/auth';
import { storage } from '../utils/storage';
import { userApi } from '../api/user';
import { historyApi, formatDate, getEloChangeDisplay, getRankColor, getRankTitle } from '../api/history';
import { API_BASE_URL } from '../constants';
import { wsClient } from '../websocket/client';
import { showToast } from '../utils/toast';

// SVG Icons
const icons = {
  quickPlay: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
  </svg>`,
  ai: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="10" rx="2"></rect>
    <circle cx="12" cy="5" r="2"></circle>
    <path d="M12 7v4"></path>
    <line x1="8" y1="16" x2="8" y2="16"></line>
    <line x1="16" y1="16" x2="16" y2="16"></line>
  </svg>`,
  private: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
  </svg>`,
  tournament: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
    <path d="M4 22h16"></path>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
  </svg>`,
  profile: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>`,
  friends: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>`,
  leaderboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"></line>
    <line x1="12" y1="20" x2="12" y2="4"></line>
    <line x1="6" y1="20" x2="6" y2="14"></line>
  </svg>`,
  history: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>`,
  spinner: `<svg class="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
  </svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>`,
};

function getAvatarUrl(avatar?: string): string {
  if (!avatar || avatar === 'default-avatar.png') {
    return '';
  }
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  return `${API_BASE_URL}/uploads/${avatar}`;
}

function getAvatarFallback(username: string): string {
  const initial = username?.[0]?.toUpperCase() || '?';
  return `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%234A7CC9%22>${initial}</text></svg>`;
}

export function HomeView(): HTMLElement {
  const container = document.createElement('div');
  const isAuthenticated = authApi.isAuthenticated();
  const user = storage.getUserData();

  // Enable scanlines effect on home page
  document.body.classList.add('show-scanlines');
  
  // Cleanup function to remove scanlines when leaving home page
  (container as any).__cleanup = () => {
    document.body.classList.remove('show-scanlines');
  };

  if (!isAuthenticated) {
    // Guest view - simple centered content
    container.className = 'flex-1 flex items-center justify-center px-4';
    container.innerHTML = `
      <div class="glass-card text-center max-w-lg p-12">
        <h1 class="text-5xl font-bold mb-6">
          <span class="text-blue animate-glow">TRANS</span><span class="text-navy">CENDENCE</span>
        </h1>
        <p class="text-xl mb-10 text-navy-muted mb-6">
          The Ultimate Pong Experience
        </p>
        <div class="flex gap-4 justify-center">
          <button id="loginBtn" class="btn-primary text-lg px-6 py-2">
            Login
          </button>
          <button id="registerBtn" class="btn-outline text-lg px-6 py-2">
            Register
          </button>
        </div>
      </div>
    `;

    container.querySelector('#loginBtn')?.addEventListener('click', () => {
      router.navigateTo('/login');
    });
    container.querySelector('#registerBtn')?.addEventListener('click', () => {
      router.navigateTo('/register');
    });

    return container;
  }

  // Authenticated view - full layout with sidebars
  container.className = 'main-layout';
  container.innerHTML = `
    <!-- Left Sidebar -->
    <aside class="sidebar sidebar-left slide-in-left">
      <!-- User Profile -->
      <div class="sidebar-section">
        <div class="glass-header mb-4">
          <span class="icon text-blue">${icons.profile}</span>
          <h3>Profile</h3>
        </div>
        <div class="user-profile-card cursor-pointer" id="profileCard">
          <div class="flex flex-col items-center">
            <img 
              id="userAvatar"
              src="${getAvatarUrl(user?.avatar)}" 
              alt="${user?.username}"
              class="user-avatar bg-blue object-cover"
              onerror="this.src='${getAvatarFallback(user?.username || 'U')}'"
            />
            <div class="user-name">${user?.username || 'Player'}</div>
            <div id="userRankBadge" class="text-sm text-navy-muted mt-1">
              <span class="inline-flex items-center gap-1">
                ${icons.spinner}
                <span>Loading...</span>
              </span>
            </div>
          </div>
          <div class="user-stats">
            <div class="user-stat-item">
              <div id="userWins" class="user-stat-value">-</div>
              <div class="user-stat-label">Wins</div>
            </div>
            <div class="user-stat-item">
              <div id="userLosses" class="user-stat-value">-</div>
              <div class="user-stat-label">Losses</div>
            </div>
            <div class="user-stat-item">
              <div id="userRank" class="user-stat-value">-</div>
              <div class="user-stat-label">Rank</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Friends List -->
      <div class="sidebar-section flex-1 overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div class="glass-header">
            <span class="icon text-blue">${icons.friends}</span>
            <h3>Friends</h3>
          </div>
          <button id="addFriendBtnHome" class="btn-primary px-3 py-2 text-sm flex items-center gap-1" title="Add Friend">
            <span class="w-4 h-4 inline-block">${icons.plus}</span>
          </button>
        </div>
        <div id="friendsList" class="scrollable flex-1">
          <div class="flex items-center justify-center p-4">
            ${icons.spinner}
          </div>
        </div>
      </div>
    </aside>

    <!-- Center Content -->
    <main class="center-content fade-in">
      <div class="text-center mb-4">
        <h1 class="text-4xl font-bold">
          <span class="text-blue animate-glow">Welcome,</span> <span class="text-navy">${user?.username || 'Player'}!</span>
        </h1>
      </div>

      <div class="mode-container">
        <!-- Quick Play -->
        <div class="mode-item" id="quickPlayMode">
          <div class="mode-icon">
            ${icons.quickPlay}
          </div>
          <div class="mode-content">
            <h2 class="mode-title">Quick Play</h2>
            <p class="mode-description">Jump into a game immediately. Get matched with another player and start playing!</p>
          </div>
        </div>

        <!-- AI Opponent -->
        <div class="mode-item" id="aiMode">
          <div class="mode-icon">
            ${icons.ai}
          </div>
          <div class="mode-content">
            <h2 class="mode-title">AI Opponent</h2>
            <p class="mode-description">Practice against computer opponents with three difficulty levels: Easy, Medium, and Hard.</p>
          </div>
        </div>

        <!-- Private Game -->
        <div class="mode-item" id="privateMode">
          <div class="mode-icon">
            ${icons.private}
          </div>
          <div class="mode-content">
            <h2 class="mode-title">Private Game</h2>
            <p class="mode-description">Create a private game and invite your friends using a unique game code.</p>
          </div>
        </div>

        <!-- Tournament -->
        <div class="mode-item" id="tournamentMode">
          <div class="mode-icon">
            ${icons.tournament}
          </div>
          <div class="mode-content">
            <h2 class="mode-title">Tournament</h2>
            <p class="mode-description">Compete in bracket-style tournaments. Climb the ranks and become the champion!</p>
          </div>
        </div>
      </div>
    </main>

    <!-- Right Sidebar -->
    <aside class="sidebar sidebar-right slide-in-right">
      <!-- Leaderboard -->
      <div class="sidebar-section">
        <div class="flex items-center justify-between mb-4">
          <div class="glass-header">
            <span class="icon text-blue">${icons.leaderboard}</span>
            <h3>Leaderboard</h3>
          </div>
        </div>
        <div id="leaderboardList" class="scrollable">
          <div class="flex items-center justify-center p-4">
            ${icons.spinner}
          </div>
        </div>
      </div>

      <!-- Match History -->
      <div class="sidebar-section flex-1 overflow-hidden flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <div class="glass-header">
            <span class="icon text-blue">${icons.history}</span>
            <h3>Match History</h3>
          </div>
        </div>
        <div id="matchHistoryList" class="scrollable flex-1">
          <div class="flex items-center justify-center p-4">
            ${icons.spinner}
          </div>
        </div>
      </div>
    </aside>

    <!-- Add Friend Modal -->
    <div id="addFriendModalHome" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
      <div class="glass-card p-6 max-w-md w-full mx-4">
        <h3 class="text-xl font-semibold mb-4 text-navy">Add Friend</h3>
        <div class="space-y-4">
          <input
            type="text"
            id="friendSearchInputHome"
            class="input-glass mb-4 w-full"
            placeholder="Search by username..."
          />
          <div id="searchResultsHome" class="max-h-60 overflow-y-auto space-y-2">
            <!-- Search results will appear here -->
          </div>
          <div class="flex justify-end">
            <button id="closeModalBtnHome" class="btn-secondary px-4">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event listeners for game modes
  container.querySelector('#quickPlayMode')?.addEventListener('click', () => {
    router.navigateTo('/game');
  });

  container.querySelector('#aiMode')?.addEventListener('click', () => {
    router.navigateTo('/game');
  });

  container.querySelector('#privateMode')?.addEventListener('click', () => {
    router.navigateTo('/game');
  });

  container.querySelector('#tournamentMode')?.addEventListener('click', () => {
    router.navigateTo('/tournament');
  });

  // Profile card click
  container.querySelector('#profileCard')?.addEventListener('click', () => {
    router.navigateTo('/profile');
  });

  // Add Friend Modal handlers
  const addFriendBtnHome = container.querySelector('#addFriendBtnHome');
  const addFriendModalHome = container.querySelector('#addFriendModalHome') as HTMLDivElement;
  const closeModalBtnHome = container.querySelector('#closeModalBtnHome');
  const friendSearchInputHome = container.querySelector('#friendSearchInputHome') as HTMLInputElement;
  const searchResultsHome = container.querySelector('#searchResultsHome') as HTMLDivElement;

  addFriendBtnHome?.addEventListener('click', (e) => {
    e.stopPropagation();
    addFriendModalHome.classList.remove('hidden');
    addFriendModalHome.classList.add('flex');
    friendSearchInputHome.focus();
  });

  closeModalBtnHome?.addEventListener('click', () => {
    addFriendModalHome.classList.add('hidden');
    addFriendModalHome.classList.remove('flex');
    friendSearchInputHome.value = '';
    searchResultsHome.innerHTML = '';
  });

  addFriendModalHome?.addEventListener('click', (e) => {
    if (e.target === addFriendModalHome) {
      addFriendModalHome.classList.add('hidden');
      addFriendModalHome.classList.remove('flex');
    }
  });

  // Search for users (home)
  let searchTimeoutHome: ReturnType<typeof setTimeout>;
  friendSearchInputHome?.addEventListener('input', () => {
    clearTimeout(searchTimeoutHome);
    const query = friendSearchInputHome.value.trim();
    
    if (query.length < 2) {
      searchResultsHome.innerHTML = '<p class="text-navy-muted text-sm text-center py-2">Type at least 2 characters to search</p>';
      return;
    }

    searchResultsHome.innerHTML = '<p class="text-navy-muted text-sm text-center py-2">Searching...</p>';

    searchTimeoutHome = setTimeout(async () => {
      try {
        const response = await userApi.searchUsers(query);
        
        if (response.success && response.data) {
          if (response.data.length === 0) {
            searchResultsHome.innerHTML = '<p class="text-navy-muted text-sm text-center py-2">No users found</p>';
            return;
          }

          searchResultsHome.innerHTML = response.data
            .filter((u: any) => u.id !== user?.id)
            .map((u: any) => `
              <div class="flex items-center justify-between p-2 bg-navy-dark/30 rounded-lg">
                <div class="flex items-center gap-2">
                  <img 
                    src="${getAvatarUrl(u.avatar)}" 
                    alt="${u.username}"
                    class="w-8 h-8 rounded-full object-cover"
                    onerror="this.src='${getAvatarFallback(u.username)}'"
                  />
                  <span class="text-navy">${u.username}</span>
                </div>
                <button 
                  class="add-friend-action-home btn-primary px-3 py-1 text-xs"
                  data-user-id="${u.id}"
                >
                  Add
                </button>
              </div>
            `).join('');

          searchResultsHome.querySelectorAll('.add-friend-action-home').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const userId = (e.target as HTMLButtonElement).dataset.userId!;
              await addFriendFromHome(userId, e.target as HTMLButtonElement, container);
            });
          });
        }
      } catch (error) {
        searchResultsHome.innerHTML = '<p class="text-red-500 text-sm text-center py-2">Search failed</p>';
      }
    }, 300);
  });

  // Load real data
  loadUserStats(container);
  loadLeaderboard(container);
  loadMatchHistory(container);
  loadFriends(container);

  return container;
}

async function addFriendFromHome(userId: string, button: HTMLButtonElement, container: HTMLElement) {
  button.disabled = true;
  button.textContent = 'Adding...';

  try {
    const response = await userApi.addFriend(userId);
    
    if (response.success) {
      showToast('Friend request sent!', 'success');
      button.textContent = 'Sent';
      button.classList.remove('btn-primary');
      button.classList.add('btn-secondary');
      
      // Reload friends list
      loadFriends(container);
    } else {
      showToast(response.error || 'Failed to add friend', 'error');
      button.textContent = 'Add';
      button.disabled = false;
    }
  } catch (error) {
    showToast('An error occurred', 'error');
    button.textContent = 'Add';
    button.disabled = false;
  }
}

async function loadUserStats(container: HTMLElement): Promise<void> {
  const userWins = container.querySelector('#userWins') as HTMLElement;
  const userLosses = container.querySelector('#userLosses') as HTMLElement;
  const userRank = container.querySelector('#userRank') as HTMLElement;
  const userRankBadge = container.querySelector('#userRankBadge') as HTMLElement;

  try {
    const response = await historyApi.getMyStats();
    
    if (response.success && response.data) {
      const stats = response.data;
      
      userWins.textContent = stats.wins.toString();
      userLosses.textContent = stats.losses.toString();
      userRank.textContent = stats.leaderboardRank > 0 ? `#${stats.leaderboardRank}` : '-';
      
      const rankColor = getRankColor(stats.currentElo);
      userRankBadge.innerHTML = `
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style="background-color: ${rankColor}20; color: ${rankColor}; border: 1px solid ${rankColor}">
          ${stats.rankTitle} • ${stats.currentElo} ELO
        </span>
      `;
    }
  } catch (error) {
    console.error('Failed to load user stats:', error);
    userRankBadge.innerHTML = '<span class="text-navy-muted text-xs">Stats unavailable</span>';
  }
}

async function loadLeaderboard(container: HTMLElement): Promise<void> {
  const leaderboardList = container.querySelector('#leaderboardList') as HTMLElement;

  try {
    const response = await userApi.getLeaderboard(5);
    
    if (response.success && response.data && response.data.length > 0) {
      response.data.sort((a: any, b: any) => b.score - a.score);
      const user = storage.getUserData();
      const currentUserId = user?.id ? parseInt(user.id as string, 10) : null;
      
      leaderboardList.innerHTML = response.data.map((entry: any, index: number) => {
        const rank = index + 1;
        const isCurrentUser = entry.id === currentUserId;
        
        let containerClass = 'leaderboard-container leaderboard-container-default';
        if (rank === 1) containerClass = 'leaderboard-container leaderboard-container-1';
        else if (rank === 2) containerClass = 'leaderboard-container leaderboard-container-2';
        else if (rank === 3) containerClass = 'leaderboard-container leaderboard-container-3';
        
        if (isCurrentUser) {
          containerClass += ' ring-2 ring-blue';
        }
        
        return `
          <div class="${containerClass}" data-user-id="${entry.id}">
            <span class="leaderboard-rank">${rank}</span>
            <img 
              src="${getAvatarUrl(entry.avatar)}" 
              alt="${entry.username}"
              class="w-8 h-8 rounded-full object-cover mr-2"
              onerror="this.src='${getAvatarFallback(entry.username)}'"
            />
            <span class="leaderboard-name ${isCurrentUser ? 'text-blue font-bold' : ''}">${entry.username}</span>
            <span class="leaderboard-points">${entry.score}</span>
          </div>
        `;
      }).join('');

      // Add click handlers to navigate to leaderboard
      leaderboardList.querySelectorAll('.leaderboard-container').forEach(item => {
        item.addEventListener('click', () => {
          router.navigateTo('/leaderboard');
        });
      });
    } else {
      leaderboardList.innerHTML = `
        <div class="text-center text-navy-muted p-4">
          <p>No rankings yet</p>
          <p class="text-xs mt-1">Play games to get ranked!</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load leaderboard:', error);
    leaderboardList.innerHTML = `
      <div class="text-center text-red-500 p-4">
        <p>Failed to load</p>
      </div>
    `;
  }
}

async function loadMatchHistory(container: HTMLElement): Promise<void> {
  const matchHistoryList = container.querySelector('#matchHistoryList') as HTMLElement;

  try {
    const response = await historyApi.getMyMatchHistory(5, 0, 'all');
    
    if (response.success && response.data && response.data.matches.length > 0) {
      matchHistoryList.innerHTML = response.data.matches.map((match: any) => {
        const isWin = match.winnerId === match.player1Id;
        const containerClass = isWin 
          ? 'match-history-container match-history-container-win' 
          : 'match-history-container match-history-container-loss';
        
        return `
          <div class="${containerClass}">
            <img 
              src="${getAvatarUrl(match.player2Avatar)}" 
              alt="${match.player2Name}"
              class="w-6 h-6 rounded-full object-cover mr-2"
              onerror="this.src='${getAvatarFallback(match.player2Name)}'"
            />
            <span class="match-opponent">vs. ${match.player2Name}</span>
            <span class="match-score">${match.player1Score}-${match.player2Score}</span>
          </div>
        `;
      }).join('');
      
      // Add click handlers to navigate to full history
      matchHistoryList.querySelectorAll('.match-history-container').forEach(item => {
        item.addEventListener('click', () => {
          router.navigateTo('/history');
        });
      });
    } else {
      matchHistoryList.innerHTML = `
        <div class="text-center text-navy-muted p-4">
          <p>No matches yet</p>
          <a href="/game" class="text-blue hover:text-blue-dark text-xs mt-1 inline-block">Play your first game!</a>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load match history:', error);
    matchHistoryList.innerHTML = `
      <div class="text-center text-red-500 p-4">
        <p>Failed to load</p>
      </div>
    `;
  }
}

async function loadFriends(container: HTMLElement): Promise<void> {
  const friendsList = container.querySelector('#friendsList') as HTMLElement;

  try {
    const response = await userApi.getFriends();
    
    if (response.success && response.data && response.data.length > 0) {
      friendsList.innerHTML = response.data.map((friend: any) => {
        return `
          <div class="flex items-center gap-3 p-2 rounded-lg hover:bg-white/30 transition-colors cursor-pointer" data-friend-id="${friend.id}">
            <div class="relative">
              <img 
                src="${getAvatarUrl(friend.avatar)}" 
                alt="${friend.username}"
                class="w-10 h-10 rounded-full object-cover border-2 border-white/50"
                onerror="this.src='${getAvatarFallback(friend.username)}'"
              />
              <!-- Online status dot - would need real-time data -->
              <div class="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-gray-400 border-2 border-white"></div>
            </div>
            <div class="flex-1 min-w-0">
              <div class="font-semibold text-navy text-sm truncate">${friend.username}</div>
              <div class="text-xs text-navy-muted">Rank #${friend.rank || '-'}</div>
            </div>
          </div>
        `;
      }).join('');

      // Add click handlers
      friendsList.querySelectorAll('[data-friend-id]').forEach(item => {
        item.addEventListener('click', () => {
          // Could open chat or show profile
          // const friendId = item.getAttribute('data-friend-id');
        });
      });
    } else {
      friendsList.innerHTML = `
        <div class="text-center text-navy-muted p-4">
          <p>No friends yet</p>
          <p class="text-xs mt-1">Click + to add friends</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('Failed to load friends:', error);
    friendsList.innerHTML = `
      <div class="text-center text-red-500 p-4">
        <p>Failed to load</p>
      </div>
    `;
  }
}
