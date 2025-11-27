import { router } from '../router';
import { authApi } from '../api/auth';
import { storage } from '../utils/storage';

export function HomeView(): HTMLElement {
  const container = document.createElement('div');
  const isAuthenticated = authApi.isAuthenticated();
  const user = storage.getUserData();

  if (!isAuthenticated) {
    // Guest view - simple centered content
    container.className = 'min-h-screen flex items-center justify-center px-4';
    container.innerHTML = `
      <div class="text-center max-w-4xl">
        <h1 class="text-6xl font-bold mb-6">
          <span class="text-game-accent animate-glow">TRANS</span><span class="text-navy">CENDENCE</span>
        </h1>
        <p class="text-2xl mb-12 text-navy-blue">
          The Ultimate Pong Experience
        </p>
        <div class="flex gap-4 justify-center">
          <button id="loginBtn" class="btn-primary text-xl px-12 py-4">
            Login
          </button>
          <button id="registerBtn" class="btn-outline text-xl px-12 py-4">
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
        <div class="header-title">
          <h2>👤 Profile</h2>
        </div>
        <div class="user-profile-card">
          <div class="flex flex-col items-center">
            <div class="user-avatar bg-game-accent"></div>
            <div class="user-name">${user?.username || 'Player'}</div>
            <div class="text-sm text-navy-blue">${user?.email || ''}</div>
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
        <div class="header-title">
          <h2>👥 Friends</h2>
        </div>
        <div class="scrollable">
          <div class="text-center text-navy-blue p-4">
            <p>No friends online</p>
          </div>
        </div>
      </div>
    </aside>

    <!-- Center Content -->
    <main class="center-content fade-in">
      <div class="text-center mb-4">
        <h1 class="text-5xl font-bold">
          <span class="text-game-accent animate-glow">Choose</span> Your Mode
        </h1>
      </div>

      <div class="mode-container">
        <!-- Quick Play -->
        <div class="mode-item" id="quickPlayMode">
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%230F2847' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='80' fill='%2300D9FF' text-anchor='middle' dy='.3em'%3E⚡%3C/text%3E%3C/svg%3E"
            alt="Quick Play"
            class="mode-image"
          />
          <div class="mode-content">
            <h2 class="mode-title">Quick Play</h2>
            <p class="mode-description">Jump into a game immediately. Get matched with another player and start playing!</p>
          </div>
        </div>

        <!-- AI Opponent -->
        <div class="mode-item" id="aiMode">
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%230F2847' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='80' fill='%2300D9FF' text-anchor='middle' dy='.3em'%3E🤖%3C/text%3E%3C/svg%3E"
            alt="AI Opponent"
            class="mode-image"
          />
          <div class="mode-content">
            <h2 class="mode-title">AI Opponent</h2>
            <p class="mode-description">Practice against computer opponents with three difficulty levels: Easy, Medium, and Hard.</p>
          </div>
        </div>

        <!-- Private Game -->
        <div class="mode-item" id="privateMode">
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%230F2847' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='80' fill='%2300D9FF' text-anchor='middle' dy='.3em'%3E🔒%3C/text%3E%3C/svg%3E"
            alt="Private Game"
            class="mode-image"
          />
          <div class="mode-content">
            <h2 class="mode-title">Private Game</h2>
            <p class="mode-description">Create a private game and invite your friends using a unique game code.</p>
          </div>
        </div>

        <!-- Tournament -->
        <div class="mode-item" id="tournamentMode">
          <img 
            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect fill='%230F2847' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' font-size='80' fill='%2300D9FF' text-anchor='middle' dy='.3em'%3E🏆%3C/text%3E%3C/svg%3E"
            alt="Tournament"
            class="mode-image"
          />
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
        <div class="header-title">
          <h2>🏆 Leaderboard</h2>
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
          <div class="leaderboard-container leaderboard-container-all">
            <span class="leaderboard-rank">4</span>
            <span class="leaderboard-name">ChampX</span>
            <span class="leaderboard-points">850</span>
          </div>
          <div class="leaderboard-container leaderboard-container-all">
            <span class="leaderboard-rank">5</span>
            <span class="leaderboard-name">MasterY</span>
            <span class="leaderboard-points">720</span>
          </div>
        </div>
      </div>

      <!-- Match History -->
      <div class="sidebar-section">
        <div class="header-title">
          <h2>📜 Match History</h2>
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
