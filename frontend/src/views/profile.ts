import { storage } from '../utils/storage';
import { showToast } from '../utils/toast';
import { API_BASE_URL } from '../constants';
import { userApi } from '../api/user';
import { authApi } from '../api/auth';
import {
  historyApi,
  formatDuration,
  formatDate,
  getEloChangeDisplay,
  getMatchTypeDisplay,
  getRankColor,
  getRankTitle,
  type MatchHistoryEntry,
  type PlayerStats,
} from '../api/history';

export function ProfileView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 flex items-center justify-center px-4';

  const user = storage.getUserData();

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Profile Header -->
      <div class="glass-card p-6 mb-6 mt-6">
        <div class="flex flex-col md:flex-row items-center gap-6">
          <!-- Avatar -->
          <div class="relative group">
            <div class="w-32 h-32 rounded-full overflow-hidden border-4 border-blue/30 bg-navy-dark">
              <img 
                id="avatarImage"
                src="${getAvatarUrl(user?.avatar)}" 
                alt="Profile avatar"
                class="w-full h-full object-cover"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%2300d4ff%22>${user?.username?.[0]?.toUpperCase() || '?'}</text></svg>'"
              />
            </div>
            <label class="absolute bottom-0 right-0 bg-blue hover:bg-blue-dark text-white p-2 rounded-full cursor-pointer transition-colors shadow-lg">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <input type="file" id="avatarInput" class="hidden" accept="image/*" />
            </label>
          </div>

          <!-- User Info -->
          <div class="flex-1 text-center md:text-left">
            <h1 class="text-3xl font-bold text-blue">${user?.username || 'Unknown'}</h1>
            <p class="text-navy-muted">${user?.email || ''}</p>
            
            <!-- Rank Badge -->
            <div class="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full" id="rankBadge">
              <span id="rankTitle" class="font-semibold">Loading...</span>
              <span id="rankElo" class="text-sm opacity-75"></span>
            </div>
            
            <!-- Quick Stats -->
            <div class="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
              <div class="text-center">
                <span id="leaderboardRank" class="text-2xl font-bold text-gold">-</span>
                <p class="text-xs text-navy-muted">Rank</p>
              </div>
              <div class="text-center">
                <span id="winRate" class="text-2xl font-bold text-green-500">-</span>
                <p class="text-xs text-navy-muted">Win Rate</p>
              </div>
              <div class="text-center">
                <span id="gamesPlayed" class="text-2xl font-bold text-blue">-</span>
                <p class="text-xs text-navy-muted">Games</p>
              </div>
              <div class="text-center">
                <span id="winStreak" class="text-2xl font-bold text-orange-500">-</span>
                <p class="text-xs text-navy-muted">Streak</p>
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2">
            <a href="/settings" class="btn-secondary px-4 py-2 text-sm text-center">
              Edit Profile
            </a>
            <a href="/history" class="btn-primary px-4 py-2 text-sm text-center">
              Full History
            </a>
          </div>
        </div>
      </div>

      <!-- Detailed Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="glass-card p-4 text-center">
          <div id="statWins" class="text-3xl font-bold text-green-500">-</div>
          <div class="text-sm text-navy-muted">Wins</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div id="statLosses" class="text-3xl font-bold text-red-500">-</div>
          <div class="text-sm text-navy-muted">Losses</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div id="statPlayTime" class="text-3xl font-bold text-purple-500">-</div>
          <div class="text-sm text-navy-muted">Play Time</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div id="statTournaments" class="text-3xl font-bold text-yellow-500">-</div>
          <div class="text-sm text-navy-muted">Tournaments Won</div>
        </div>
      </div>

      <!-- ELO History Chart placeholder -->
      <div class="glass-card p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4 text-navy">ELO Progression</h2>
        <div id="eloChart" class="h-32 flex items-end gap-1">
          <!-- Simple bar chart will be rendered here -->
          <div class="text-center text-navy-muted w-full py-8">Loading ELO history...</div>
        </div>
      </div>

      <!-- Recent Matches -->
      <div class="glass-card p-6 mb-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-navy">Recent Matches</h2>
          <a href="/history" class="text-blue hover:text-blue-dark text-sm font-semibold">
            View All →
          </a>
        </div>
        
        <div id="recentMatches" class="space-y-3">
          <div class="text-center text-navy-muted py-8">
            Loading recent matches...
          </div>
        </div>
      </div>

      <!-- Friends Section -->
      <div class="glass-card p-6">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold text-navy">Friends</h2>
          <button id="addFriendBtn" class="btn-secondary px-3 py-1 text-sm">
            + Add Friend
          </button>
        </div>
        
        <div id="friendsList" class="space-y-2">
          <div class="text-center text-navy-muted py-4">
            Loading friends...
          </div>
        </div>
      </div>
    </div>

    <!-- Add Friend Modal -->
    <div id="addFriendModal" class="fixed inset-0 bg-black/50 hidden items-center justify-center z-50">
      <div class="glass-card p-6 max-w-md w-full mx-4 mb-6">
        <h3 class="text-xl font-semibold mb-4 text-navy">Add Friend</h3>
        <div class="space-y-4">
          <input
            type="text"
            id="friendSearchInput"
            class="input-glass w-full"
            placeholder="Search by username..."
          />
          <div id="searchResults" class="max-h-60 overflow-y-auto space-y-2">
            <!-- Search results will appear here -->
          </div>
          <div class="flex justify-end">
            <button id="closeModalBtn" class="btn-secondary px-4">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load data
  loadPlayerStats();
  loadRecentMatches();
  loadFriends();

  // Avatar upload handler
  const avatarInput = container.querySelector('#avatarInput') as HTMLInputElement;
  const avatarImage = container.querySelector('#avatarImage') as HTMLImageElement;

  avatarInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      showToast('Image must be less than 1MB', 'error');
      return;
    }

    if (!file.type.startsWith('image/')) {
      showToast('Please select an image file', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(`${API_BASE_URL}/users/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${storage.getAuthToken()}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Avatar updated successfully!', 'success');
        if (data.avatar) {
          avatarImage.src = getAvatarUrl(data.avatar);
          const userData = storage.getUserData();
          if (userData) {
            userData.avatar = data.avatar;
            storage.setUserData(userData);
          }
        }
      } else {
        showToast(data.message || 'Failed to upload avatar', 'error');
      }
    } catch (error) {
      showToast('An error occurred. Please try again.', 'error');
    }
  });

  // Friend modal handlers
  const addFriendBtn = container.querySelector('#addFriendBtn') as HTMLButtonElement;
  const addFriendModal = container.querySelector('#addFriendModal') as HTMLDivElement;
  const closeModalBtn = container.querySelector('#closeModalBtn') as HTMLButtonElement;
  const friendSearchInput = container.querySelector('#friendSearchInput') as HTMLInputElement;
  const searchResults = container.querySelector('#searchResults') as HTMLDivElement;

  addFriendBtn.addEventListener('click', () => {
    addFriendModal.classList.remove('hidden');
    addFriendModal.classList.add('flex');
    friendSearchInput.focus();
  });

  closeModalBtn.addEventListener('click', () => {
    addFriendModal.classList.add('hidden');
    addFriendModal.classList.remove('flex');
    friendSearchInput.value = '';
    searchResults.innerHTML = '';
  });

  addFriendModal.addEventListener('click', (e) => {
    if (e.target === addFriendModal) {
      addFriendModal.classList.add('hidden');
      addFriendModal.classList.remove('flex');
    }
  });

  // Search for users
  let searchTimeout: ReturnType<typeof setTimeout>;
  friendSearchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = friendSearchInput.value.trim();
    
    if (query.length < 2) {
      searchResults.innerHTML = '<p class="text-navy-muted text-sm text-center py-2">Type at least 2 characters to search</p>';
      return;
    }

    searchResults.innerHTML = '<p class="text-navy-muted text-sm text-center py-2">Searching...</p>';

    searchTimeout = setTimeout(async () => {
      try {
        const response = await userApi.searchUsers(query);
        
        if (response.success && response.data) {
          if (response.data.length === 0) {
            searchResults.innerHTML = '<p class="text-navy-muted text-sm text-center py-2">No users found</p>';
            return;
          }

          searchResults.innerHTML = response.data
            .filter((u: any) => u.id !== user?.id)
            .map((u: any) => `
              <div class="flex items-center justify-between p-2 bg-navy-dark/30 rounded-lg">
                <div class="flex items-center gap-2">
                  <img 
                    src="${getAvatarUrl(u.avatar)}" 
                    alt="${u.username}"
                    class="w-8 h-8 rounded-full object-cover"
                    onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%2300d4ff%22>${u.username[0].toUpperCase()}</text></svg>'"
                  />
                  <span class="text-navy">${u.username}</span>
                </div>
                <button 
                  class="add-friend-action btn-primary px-3 py-1 text-xs"
                  data-user-id="${u.id}"
                >
                  Add
                </button>
              </div>
            `).join('');

          searchResults.querySelectorAll('.add-friend-action').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const userId = (e.target as HTMLButtonElement).dataset.userId!;
              await addFriend(userId, e.target as HTMLButtonElement);
            });
          });
        }
      } catch (error) {
        searchResults.innerHTML = '<p class="text-red-500 text-sm text-center py-2">Search failed</p>';
      }
    }, 300);
  });

  async function addFriend(userId: string, button: HTMLButtonElement) {
    button.disabled = true;
    button.textContent = 'Adding...';

    try {
      const response = await userApi.addFriend(userId);
      
      if (response.success) {
        showToast('Friend request sent!', 'success');
        button.textContent = 'Sent';
        button.classList.remove('btn-primary');
        button.classList.add('btn-secondary');
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

  async function loadPlayerStats() {
    try {
      const response = await historyApi.getMyStats();
      
      if (response.success && response.data) {
        const stats = response.data;
        const winRateDisplay = Math.floor(stats.winRate * 100) / 100;
        
        // Update rank badge
        const rankBadge = container.querySelector('#rankBadge') as HTMLDivElement;
        const rankColor = getRankColor(stats.currentElo);
        rankBadge.style.backgroundColor = `${rankColor}20`;
        rankBadge.style.border = `2px solid ${rankColor}`;
        
        (container.querySelector('#rankTitle') as HTMLSpanElement).textContent = stats.rankTitle;
        (container.querySelector('#rankTitle') as HTMLSpanElement).style.color = rankColor;
        (container.querySelector('#rankElo') as HTMLSpanElement).textContent = `${stats.currentElo} ELO`;
        
        // Quick stats
        (container.querySelector('#leaderboardRank') as HTMLSpanElement).textContent = 
          stats.leaderboardRank > 0 ? `#${stats.leaderboardRank}` : '-';
        (container.querySelector('#winRate') as HTMLSpanElement).textContent = `${winRateDisplay}%`;
        (container.querySelector('#gamesPlayed') as HTMLSpanElement).textContent = stats.totalGames.toString();
        (container.querySelector('#winStreak') as HTMLSpanElement).textContent = 
          stats.currentWinStreak > 0 ? `${stats.currentWinStreak}W` : '0';
        
        // Detailed stats
        (container.querySelector('#statWins') as HTMLDivElement).textContent = stats.wins.toString();
        (container.querySelector('#statLosses') as HTMLDivElement).textContent = stats.losses.toString();
        (container.querySelector('#statPlayTime') as HTMLDivElement).textContent = formatPlayTime(stats.totalPlayTime);
        (container.querySelector('#statTournaments') as HTMLDivElement).textContent = stats.tournamentsWon.toString();
        
        // Render simple ELO chart
        renderEloChart(stats.currentElo, stats.highestElo);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  async function loadRecentMatches() {
    const recentMatchesDiv = container.querySelector('#recentMatches') as HTMLDivElement;
    
    try {
      const response = await historyApi.getMyMatchHistory(5, 0, 'all');

      console.log('Match history response:', response);  // Add this
      console.log('Matches:', response.data?.matches);   // Add this
      
      if (response.success && response.data) {
        const matches = response.data.matches;
        
        if (matches.length === 0) {
          recentMatchesDiv.innerHTML = `
            <div class="text-center text-navy-muted py-8">
              <p>No matches played yet.</p>
              <a href="/game" class="text-blue hover:text-blue-dark mt-2 inline-block">Play your first game!</a>
            </div>
          `;
          return;
        }

        recentMatchesDiv.innerHTML = matches.map((match: MatchHistoryEntry) => {
          const isWin = match.winnerId === match.player1Id;
          const eloChange = getEloChangeDisplay(match.player1EloChange);
          
          return `
            <div class="flex items-center justify-between p-3 bg-navy-dark/30 rounded-lg border-l-4 ${isWin ? 'border-green-500' : 'border-red-500'}">
              <div class="flex items-center gap-3">
                <span class="text-lg font-bold ${isWin ? 'text-green-500' : 'text-red-500'}">
                  ${isWin ? 'W' : 'L'}
                </span>
                <div>
                  <p class="text-navy font-medium">vs ${match.player2Name}</p>
                  <p class="text-sm text-navy-muted">${formatDate(match.date)}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold text-navy">${match.player1Score} - ${match.player2Score}</p>
                <p class="text-sm font-semibold ${eloChange.color}">${eloChange.text}</p>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (error) {
      recentMatchesDiv.innerHTML = '<p class="text-red-500 text-center py-4">Failed to load match history</p>';
    }
  }

  async function loadFriends() {
    const friendsList = container.querySelector('#friendsList') as HTMLDivElement;
    
    try {
      const response = await userApi.getFriends();
      
      if (response.success && response.data) {
        if (response.data.length === 0) {
          friendsList.innerHTML = `
            <div class="text-center text-navy-muted py-4">
              <p>No friends yet.</p>
              <p class="text-sm">Add friends to see them here!</p>
            </div>
          `;
          return;
        }

        friendsList.innerHTML = response.data.map((friend: any) => `
          <div class="flex items-center justify-between p-3 bg-navy-dark/30 rounded-lg">
            <div class="flex items-center gap-3">
              <img 
                src="${getAvatarUrl(friend.avatar)}" 
                alt="${friend.username}"
                class="w-10 h-10 rounded-full object-cover"
                onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%231a1a2e%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 font-size=%2240%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%2300d4ff%22>${friend.username[0].toUpperCase()}</text></svg>'"
              />
              <div>
                <p class="text-navy font-medium">${friend.username}</p>
                <p class="text-sm text-navy-muted">Rank #${friend.rank || '-'}</p>
              </div>
            </div>
            <button 
              class="remove-friend-btn btn-secondary px-3 py-1 text-xs text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
              data-user-id="${friend.id}"
            >
              Remove
            </button>
          </div>
        `).join('');

        friendsList.querySelectorAll('.remove-friend-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const userId = (e.target as HTMLButtonElement).dataset.userId!;
            if (confirm('Are you sure you want to remove this friend?')) {
              try {
                const response = await userApi.removeFriend(userId);
                if (response.success) {
                  showToast('Friend removed', 'success');
                  loadFriends();
                } else {
                  showToast(response.error || 'Failed to remove friend', 'error');
                }
              } catch {
                showToast('An error occurred', 'error');
              }
            }
          });
        });
      }
    } catch (error) {
      friendsList.innerHTML = '<p class="text-red-500 text-center py-4">Failed to load friends</p>';
    }
  }

  function renderEloChart(currentElo: number, highestElo: number) {
    const eloChart = container.querySelector('#eloChart') as HTMLDivElement;
    
    // Simple visualization showing current vs highest
    const minElo = Math.max(1000, Math.min(currentElo, highestElo) - 100);
    const maxElo = Math.max(currentElo, highestElo) + 100;
    const range = maxElo - minElo;
    
    const currentHeight = Math.round(((currentElo - minElo) / range) * 100);
    const highestHeight = Math.round(((highestElo - minElo) / range) * 100);
    
    eloChart.innerHTML = `
      <div class="flex items-end justify-center gap-8 w-full h-full">
        <div class="text-center">
          <div class="bg-blue rounded-t w-16 transition-all" style="height: ${currentHeight}%"></div>
          <div class="text-sm font-semibold text-navy mt-2">${currentElo}</div>
          <div class="text-xs text-navy-muted">Current</div>
        </div>
        <div class="text-center">
          <div class="bg-yellow-500 rounded-t w-16 transition-all" style="height: ${highestHeight}%"></div>
          <div class="text-sm font-semibold text-navy mt-2">${highestElo}</div>
          <div class="text-xs text-navy-muted">Highest</div>
        </div>
      </div>
    `;
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

  function formatPlayTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }

  return container;
}
