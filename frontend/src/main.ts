import './styles/main.css';
import { router } from './router';
import { Navbar } from './components/navbar';
import { HomeView } from './views/home';
import { LoginView } from './views/login';
import { RegisterView } from './views/register';
import { wsClient } from './websocket/client';
import { authApi } from './api/auth';
import { storage } from './utils/storage';
import { GameView } from './views/game';

// Initialize app
function initializeApp(): void {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  // Check for expired token on startup and clear if needed
  if (storage.getAuthToken() && storage.isTokenExpired()) {
    console.warn('Token expired on startup, clearing auth state');
    storage.clearAll();
  }

  // Create layout
  const layout = document.createElement('div');
  layout.className = 'min-h-screen bg-game-darker';
  
  // Add navbar
  const navbar = Navbar();
  layout.appendChild(navbar);
  
  // Add main content container
  const mainContainer = document.createElement('main');
  mainContainer.id = 'main-content';
  mainContainer.className = 'min-h-[calc(100vh-4rem)]';
  layout.appendChild(mainContainer);
  
  app.appendChild(layout);

  // Set router container
  router.setAppContainer(mainContainer);

  // Register routes
  registerRoutes();

  // Connect WebSocket if authenticated (storage.isAuthenticated now checks token expiration)
  if (authApi.isAuthenticated()) {
    wsClient.connect();
  }

  // Initialize router
  router.init();

  // Handle WebSocket reconnection on auth changes
  setupAuthListeners();
}

function registerRoutes(): void {
  router.registerRoute({
    path: '/',
    title: 'Home',
    component: HomeView,
    requiresAuth: false,
  });

  router.registerRoute({
    path: '/login',
    title: 'Login',
    component: LoginView,
    requiresAuth: false,
  });

  router.registerRoute({
    path: '/register',
    title: 'Register',
    component: RegisterView,
    requiresAuth: false,
  });

  router.registerRoute({
    path: '/game',
    title: 'Play',
    component: GameView,
    requiresAuth: true,
  });

  router.registerRoute({
    path: '/tournament',
    title: 'Tournaments',
    component: () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-4xl font-bold mb-4" style="color: var(--color-retro-dark)">Game View</h1>
            <p style="color: var(--color-retro-brown)">Game interface coming soon...</p>
          </div>
        </div>
      `;
      return div;
    },
    requiresAuth: true,
  });

  router.registerRoute({
    path: '/leaderboard',
    title: 'Leaderboard',
    component: () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-4xl font-bold mb-4" style="color: var(--color-retro-dark)">Game View</h1>
            <p style="color: var(--color-retro-brown)">Game interface coming soon...</p>
          </div>
        </div>
      `;
      return div;
    },
    requiresAuth: false,
  });

  router.registerRoute({
    path: '/stats',
    title: 'Statistics',
    component: () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-4xl font-bold mb-4" style="color: var(--color-retro-dark)">Game View</h1>
            <p style="color: var(--color-retro-brown)">Game interface coming soon...</p>
          </div>
        </div>
      `;
      return div;
    },
    requiresAuth: true,
  });

  router.registerRoute({
    path: '/profile',
    title: 'Profile',
    component: () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-4xl font-bold mb-4" style="color: var(--color-retro-dark)">Game View</h1>
            <p style="color: var(--color-retro-brown)">Game interface coming soon...</p>
          </div>
        </div>
      `;
      return div;
    },
    requiresAuth: true,
  });

  router.registerRoute({
    path: '/settings',
    title: 'Settings',
    component: () => {
      const div = document.createElement('div');
      div.innerHTML = `
        <div class="min-h-screen flex items-center justify-center">
          <div class="text-center">
            <h1 class="text-4xl font-bold mb-4" style="color: var(--color-retro-dark)">Game View</h1>
            <p style="color: var(--color-retro-brown)">Game interface coming soon...</p>
          </div>
        </div>
      `;
      return div;
    },
    requiresAuth: true,
  });
}

function setupAuthListeners(): void {
  // This would be called after login/logout to manage WebSocket connection
  window.addEventListener('auth:login', () => {
    wsClient.connect();
  });

  window.addEventListener('auth:logout', () => {
    wsClient.disconnect();
    // Refresh navbar to show logged out state
    const app = document.getElementById('app');
    if (app) {
      const oldNav = app.querySelector('nav');
      if (oldNav) {
        const newNav = Navbar();
        oldNav.replaceWith(newNav);
      }
    }
  });
}

// Start the app
initializeApp();
