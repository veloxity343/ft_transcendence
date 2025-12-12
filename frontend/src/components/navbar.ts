import { router } from '../router';
import { authApi } from '../api/auth';
import { storage } from '../utils/storage';
import { showToast } from '../utils/toast';
import { SUCCESS_MESSAGES } from '../constants';

export function Navbar(): HTMLElement {
  const nav = document.createElement('nav');
  nav.className = 'border-b relative z-[100]';
  
  const isAuthenticated = authApi.isAuthenticated();
  const user = storage.getUserData();

  nav.innerHTML = `
    <div class="w-full px-4 lg:px-8">
      <div class="flex items-center justify-between h-16 px-6 lg:px-8">
        <!-- Logo -->
        <a href="/" class="text-2xl font-bold">
          <span class="text-blue animate-glow">ft_trans</span><span class="text-navy">cendence</span>
        </a>

        ${isAuthenticated ? `
          <!-- Authenticated Navigation -->
          <div class="flex items-center gap-6">
            <a href="/game" class="text-navy hover:text-blue transition-colors font-semibold">
              Play
            </a>
            <a href="/tournament" class="text-navy hover:text-blue transition-colors font-semibold">
              Tournaments
            </a>
            <a href="/leaderboard" class="text-navy hover:text-blue transition-colors font-semibold">
              Leaderboard
            </a>
            <a href="/stats" class="text-navy hover:text-blue transition-colors font-semibold">
              Stats
            </a>
            
            <!-- User Menu -->
            <div class="relative">
              <button id="userMenuBtn" class="flex items-center gap-2 text-navy hover:text-blue transition-colors font-semibold">
                <span>${user?.username || 'User'}</span>
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
              
              <div id="userMenu" class="hidden absolute right-0 mt-2 w-48 rounded-xl shadow-lg py-2 z-[200] bg-white border border-tan">
                <a href="/profile" class="block px-4 py-2 text-navy hover:bg-blue hover:text-white font-semibold transition-colors">
                  Profile
                </a>
                <a href="/settings" class="block px-4 py-2 text-navy hover:bg-blue hover:text-white font-semibold transition-colors">
                  Settings
                </a>
                <hr class="my-2 border-tan" />
                <button id="logoutBtn" class="w-full text-left px-4 py-2 text-red-500 hover:bg-red-100 font-semibold transition-colors">
                  Logout
                </button>
              </div>
            </div>
          </div>
        ` : `
          <!-- Guest Navigation -->
          <div class="flex items-center gap-6">
            <a href="/leaderboard" class="text-navy hover:text-blue transition-colors font-semibold">
              Leaderboard
            </a>
            <a href="/login" class="text-navy hover:text-blue transition-colors font-semibold">
              Login
            </a>
            <a href="/register" class="btn-primary btn-sm">
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
      window.location.href = '/';
    });
  }

  return nav;
}
