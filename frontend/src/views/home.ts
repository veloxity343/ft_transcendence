import { router } from '../router';
import { authApi } from '../api/auth';
import { storage } from '../utils/storage';

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
  </svg>`
};

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
        <p class="text-xl mb-10 text-navy-muted">
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
        <div class="user-profile-card">
          <div class="flex flex-col items-center">
            <div class="user-avatar bg-blue"></div>
            <div class="user-name">${user?.username || 'Player'}</div>
            <div class="text-sm text-navy-muted">${user?.email || ''}</div>
          </div>
          <div class="user-stats">
            <div class="user-stat-item">
              <div class="user-stat-value">0</div>
              <div class="user-stat-label">Wins</div>
            </div>
            <div class="user-stat-item">
              <div class="user-stat-value">0</div>
              <div class="user-stat-label">Losses</div>
            </div>
            <div class="user-stat-item">
              <div class="user-stat-value">0</div>
              <div class="user-stat-label">Rank</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Friends List -->
      <div class="sidebar-section">
        <div class="glass-header mb-4">
          <span class="icon text-blue">${icons.friends}</span>
          <h3>Friends</h3>
        </div>
        <div class="scrollable">
          <div class="text-center text-navy-muted p-4">
            <p>No friends online</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Center Content -->
    <main class="center-content fade-in">
      <div class="text-center mb-4">
        <h1 class="text-4xl font-bold">
          <span class="text-blue animate-glow">Choose</span> <span class="text-navy">Your Mode</span>
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
        <div class="glass-header mb-4">
          <span class="icon text-blue">${icons.leaderboard}</span>
          <h3>Leaderboard</h3>
        </div>
        <div class="scrollable">
          <div class="leaderboard-container leaderboard-container-1">
            <span class="leaderboard-rank">1</span>
            <span class="leaderboard-name">PlayerOne</span>
            <span class="leaderboard-points">1250</span>
          </div>
          <div class="leaderboard-container leaderboard-container-2">
            <span class="leaderboard-rank">2</span>
            <span class="leaderboard-name">AcePlayer</span>
            <span class="leaderboard-points">1100</span>
          </div>
          <div class="leaderboard-container leaderboard-container-3">
            <span class="leaderboard-rank">3</span>
            <span class="leaderboard-name">ProGamer</span>
            <span class="leaderboard-points">980</span>
          </div>
          <div class="leaderboard-container leaderboard-container-default">
            <span class="leaderboard-rank">4</span>
            <span class="leaderboard-name">ChampX</span>
            <span class="leaderboard-points">850</span>
          </div>
          <div class="leaderboard-container leaderboard-container-default">
            <span class="leaderboard-rank">5</span>
            <span class="leaderboard-name">MasterY</span>
            <span class="leaderboard-points">720</span>
          </div>
        </div>
      </div>

      <!-- Match History -->
      <div class="sidebar-section">
        <div class="glass-header mb-4">
          <span class="icon text-blue">${icons.history}</span>
          <h3>Match History</h3>
        </div>
        <div class="scrollable">
          <div class="match-history-container match-history-container-win">
            <span class="match-opponent">vs. Player123</span>
            <span class="match-score">11-8</span>
            <span class="match-result match-result-win">WIN</span>
          </div>
          <div class="match-history-container match-history-container-loss">
            <span class="match-opponent">vs. ProGamer</span>
            <span class="match-score">5-11</span>
            <span class="match-result match-result-loss">LOSS</span>
          </div>
          <div class="match-history-container match-history-container-win">
            <span class="match-opponent">vs. AcePlayer</span>
            <span class="match-score">11-9</span>
            <span class="match-result match-result-win">WIN</span>
          </div>
        </div>
      </div>
    </aside>
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

  return container;
}
