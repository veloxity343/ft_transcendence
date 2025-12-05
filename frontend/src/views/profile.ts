import { router } from '../router';
import { authApi } from '../api/auth';
import { userApi } from '../api/user';
import { storage } from '../utils/storage';
import { showToast } from '../utils/toast';
import { formatDate, calculateWinRate, formatDuration } from '../utils/validators';
import { API_BASE_URL } from '../constants';

export function ProfileView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 p-4 md:p-8 flex flex-col items-center';

  const user = storage.getUserData();

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Profile Header -->
      <div class="glass-card p-6">
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
            <p class="text-sm text-navy-muted mt-1">
              Member since ${user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}
            </p>
            
            <!-- Quick Stats -->
            <div class="flex flex-wrap gap-4 mt-4 justify-center md:justify-start">
              <div class="text-center">
                <span id="rankBadge" class="text-2xl font-bold text-gold">-</span>
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
            </div>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-2">
            <a href="/settings" class="btn-secondary px-4 py-2 text-sm text-center">
              Edit Profile
            </a>
          </div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="glass-card p-4 text-center">
          <div id="statWins" class="text-3xl font-bold text-green-500">-</div>
          <div class="text-sm text-navy-muted">Wins</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div id="statLosses" class="text-3xl font-bold text-red-500">-</div>
          <div class="text-sm text-navy-muted">Losses</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div id="statScore" class="text-3xl font-bold text-blue">-</div>
          <div class="text-sm text-navy-muted">ELO Score</div>
        </div>
        <div class="glass-card p-4 text-center">
          <div id="statPlayTime" class="text-3xl font-bold text-purple-500">-</div>
          <div class="text-sm text-navy-muted">Play Time</div>
        </div>
      </div>

      <!-- Match History -->
      <div class="glass-card p-6">
        <h2 class="text-xl font-semibold mb-4 text-navy">Match History</h2>
        
        <div id="matchHistory" class="space-y-3">
          <div class="text-center text-navy-muted py-8">
            Loading match history...
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
      <div class="glass-card p-6 max-w-md w-full mx-4">
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

  // Load user stats
  loadUserStats();
  loadMatchHistory();
  loadFriends();

  // Avatar upload handler
  const avatarInput = container.querySelector('#avatarInput') as HTMLInputElement;
  const avatarImage = container.querySelector('#avatarImage') as HTMLImageElement;

  avatarInput.addEventListener('change', async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validate file size (1MB max)
    if (file.size > 1024 * 1024) {
      showToast('Image must be less than 1MB', 'error');
      return;
    }

    // Validate file type
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
        // Update avatar display
        if (data.avatar) {
          avatarImage.src = getAvatarUrl(data.avatar);
          // Update stored user data
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
            .filter(u => u.id !== user?.id) // Don't show current user
            .map(u => `
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

          // Add click handlers
          searchResults.querySelectorAll('.add-friend-action').forEach(btn => {
            btn.addEventListener('click', async (e) => {
              const userId = (e.target as HTMLButtonElement).dataset.userId!;
              await addFriend(userId, e.target as HTMLButtonElement);
            });
          });
        } else {
          searchResults.innerHTML = '<p class="text-red-500 text-sm text-center py-2">Search failed</p>';
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

  async function loadUserStats() {
    try {
      const response = await authApi.getCurrentUser();
      
      if (response.success && response.data) {
        const userData = response.data as any;
        
        // Update header stats
        const rankBadge = container.querySelector('#rankBadge') as HTMLSpanElement;
        const winRateEl = container.querySelector('#winRate') as HTMLSpanElement;
        const gamesPlayedEl = container.querySelector('#gamesPlayed') as HTMLSpanElement;
        
        rankBadge.textContent = userData.rank > 0 ? `#${userData.rank}` : '-';
        winRateEl.textContent = `${Math.round(userData.winRate || 0)}%`;
        gamesPlayedEl.textContent = userData.gamesPlayed?.toString() || '0';

        // Update detailed stats
        (container.querySelector('#statWins') as HTMLDivElement).textContent = userData.gamesWon?.toString() || '0';
        (container.querySelector('#statLosses') as HTMLDivElement).textContent = userData.gamesLost?.toString() || '0';
        (container.querySelector('#statScore') as HTMLDivElement).textContent = userData.score?.toString() || '1200';
        (container.querySelector('#statPlayTime') as HTMLDivElement).textContent = formatPlayTime(userData.playTime || 0);
      }
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  }

  async function loadMatchHistory() {
    const matchHistoryDiv = container.querySelector('#matchHistory') as HTMLDivElement;
    
    try {
      const response = await authApi.getCurrentUser();
      
      if (response.success && response.data) {
        const userData = response.data as any;
        let gameHistory: any[] = [];
        
        // Parse game history if it's a string
        if (typeof userData.gameHistory === 'string') {
          try {
            gameHistory = JSON.parse(userData.gameHistory);
          } catch {
            gameHistory = [];
          }
        } else if (Array.isArray(userData.gameHistory)) {
          gameHistory = userData.gameHistory;
        }

        if (gameHistory.length === 0) {
          matchHistoryDiv.innerHTML = `
            <div class="text-center text-navy-muted py-8">
              <p>No matches played yet.</p>
              <a href="/game" class="text-blue hover:text-blue-dark mt-2 inline-block">Play your first game!</a>
            </div>
          `;
          return;
        }

        // Show last 10 matches
        const recentMatches = gameHistory.slice(-10).reverse();
        
        matchHistoryDiv.innerHTML = recentMatches.map((match: any) => {
          const isWin = match.won;
          const opponentName = match.opponent || 'Unknown';
          const myScore = match.myScore || 0;
          const oppScore = match.oppScore || 0;
          
          return `
            <div class="flex items-center justify-between p-3 bg-navy-dark/30 rounded-lg border-l-4 ${isWin ? 'border-green-500' : 'border-red-500'}">
              <div class="flex items-center gap-3">
                <span class="text-lg font-bold ${isWin ? 'text-green-500' : 'text-red-500'}">
                  ${isWin ? 'W' : 'L'}
                </span>
                <div>
                  <p class="text-navy font-medium">vs ${opponentName}</p>
                  <p class="text-sm text-navy-muted">${match.date ? formatDate(match.date) : 'Unknown date'}</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold text-navy">${myScore} - ${oppScore}</p>
                <p class="text-sm text-navy-muted">${match.duration ? formatDuration(match.duration) : ''}</p>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (error) {
      matchHistoryDiv.innerHTML = '<p class="text-red-500 text-center py-4">Failed to load match history</p>';
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

        friendsList.innerHTML = response.data.map(friend => `
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

        // Add remove handlers
        friendsList.querySelectorAll('.remove-friend-btn').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const userId = (e.target as HTMLButtonElement).dataset.userId!;
            if (confirm('Are you sure you want to remove this friend?')) {
              try {
                const response = await userApi.removeFriend(userId);
                if (response.success) {
                  showToast('Friend removed', 'success');
                  loadFriends(); // Reload list
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

  return container;
}

function getAvatarUrl(avatar?: string): string {
  if (!avatar || avatar === 'default-avatar.png') {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%231a1a2e" width="100" height="100"/><text x="50" y="50" font-size="40" text-anchor="middle" dominant-baseline="middle" fill="%2300d4ff">?</text></svg>';
  }
  
  // If it's a full URL (e.g., Google avatar), return as-is
  if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
    return avatar;
  }
  
  // Otherwise, it's a local upload
  return `${API_BASE_URL}/uploads/${avatar}`;
}

function formatPlayTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
