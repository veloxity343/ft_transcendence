import { router } from '../router';
import { authApi } from '../api/auth';
import { storage } from '../utils/storage';
import { showToast } from '../utils/toast';
import { SUCCESS_MESSAGES } from '../constants';

export function Navbar(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'bg-game-dark border-b border-game-border';
  
  const isAuthenticated = authApi.isAuthenticated();
  const user = storage.getUserData();

  nav.innerHTML = `
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex items-center justify-between h-16">
        <!-- Logo -->
        <a href="/" class="text-2xl font-bold">
          <span class="text-game-accent animate-glow">ft_trans</span><span class="text-retro-dark">cendence</span>
        </a>

        ${isAuthenticated ? `
          <!-- Authenticated Navigation -->
          <div class="flex items-center gap-6">
            <a href="/game" class="text-retro-dark hover:text-game-accent transition-colors font-semibold">
              Play
            </a>
            <a href="/tournament" class="text-retro-dark hover:text-game-accent transition-colors font-semibold">
              Tournaments
            </a>
            <a href="/leaderboard" class="text-retro-dark hover:text-game-accent transition-colors font-semibold">
              Leaderboard
            </a>
            <a href="/stats" class="text-retro-dark hover:text-game-accent transition-colors font-semibold">
              Stats
            </a>
            
            <!-- User Menu -->
            <div class="relative">
              <button id="userMenuBtn" class="flex items-center gap-2 text-retro-dark hover:text-game-accent transition-colors font-semibold">
                <span>${user?.username || 'User'}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              <div id="userMenu" class="hidden absolute right-0 mt-2 w-48 rounded-lg shadow-lg py-2 z-50" style="background-color: var(--color-retro-beige); border: 2px solid var(--color-retro-tan);">
                <a href="/profile" class="block px-4 py-2 text-retro-dark hover:bg-game-accent hover:text-retro-dark font-semibold transition-colors">
                  Profile
                </a>
                <a href="/settings" class="block px-4 py-2 text-retro-dark hover:bg-game-accent hover:text-retro-dark font-semibold transition-colors">
                  Settings
                </a>
                <hr style="border-color: var(--color-retro-tan); margin: 0.5rem 0;" />
                <button id="logoutBtn" class="w-full text-left px-4 py-2 text-red-600 hover:bg-red-100 font-semibold transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        ` : `
          <!-- Guest Navigation -->
          <div class="flex items-center gap-4">
            <a href="/leaderboard" class="text-retro-dark hover:text-game-accent transition-colors font-semibold">
              Leaderboard
            </a>
            <a href="/login" class="text-retro-dark hover:text-game-accent transition-colors font-semibold">
              Login
            </a>
            <a href="/register" class="btn-primary">
              Register
            </a>
          </div>
        `}
      </div>
    </div>
  `;

  if (isAuthenticated) {
    // User menu toggle
    const userMenuBtn = nav.querySelector('#userMenuBtn');
    const userMenu = nav.querySelector('#userMenu');
    
    userMenuBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu?.classList.toggle('hidden');
    });

    // Close menu when clicking outside
    document.addEventListener('click', () => {
      userMenu?.classList.add('hidden');
    });

    // Logout handler
    const logoutBtn = nav.querySelector('#logoutBtn');
    logoutBtn?.addEventListener('click', async () => {
      await authApi.logout();
      showToast(SUCCESS_MESSAGES.LOGOUT_SUCCESS, 'success');
      router.navigateTo('/');
    });
  }

  return nav;
}
