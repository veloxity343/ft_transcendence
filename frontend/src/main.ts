import './styles/main.css';

// Capture OAuth params on callback
if (window.location.pathname === '/oauth/callback' && window.location.search) {
  sessionStorage.setItem('oauth_params', window.location.search);
  console.log('Captured OAuth params:', window.location.search);
}

import { router } from './router';
import { Navbar } from './components/navbar';
import { HomeView } from './views/home';
import { LoginView } from './views/login';
import { RegisterView } from './views/register';
import { wsClient } from './websocket/client';
import { authApi } from './api/auth';
import { storage } from './utils/storage';
import { GameView } from './views/game';
import { TournamentView } from './views/tournament';
import { ProfileView } from './views/profile';
import { SettingsView } from './views/settings';
import { OAuthCallbackView } from './views/oauth-callback';
import { HistoryView } from './views/history';
import { errorOverlay } from './components/error-overlay';
import { initChatOverlay, getChatOverlay } from './components/chat-overlay';
import './utils/debug';

// Try to refresh token if expired on startup
async function tryRefreshOnStartup(): Promise<boolean> {
  // If no auth token at all, nothing to refresh
  if (!storage.getAuthToken()) {
    return false;
  }
  
  // If token is still valid, no need to refresh
  if (!storage.isTokenExpired()) {
    return true;
  }
  
  // Token expired, try to refresh
  console.log('Access token expired on startup, attempting refresh...');
  const newToken = await storage.refreshAccessToken();
  
  if (newToken) {
    console.log('Token refreshed successfully on startup');
    return true;
  } else {
    console.warn('Token refresh failed on startup, clearing auth state');
    storage.clearAuth();
    return false;
  }
}

// Initialize app
async function initializeApp(): Promise<void> {
  const app = document.getElementById('app');
  if (!app) {
    console.error('App container not found');
    return;
  }

  // Setup global error handlers
  setupGlobalErrorHandlers();

  await tryRefreshOnStartup();

  // Create layout
  const layout = document.createElement('div');
  layout.className = 'min-h-screen bg-game-darker';
  
  // Add navbar
  const navbar = Navbar();
  layout.appendChild(navbar);
  
  // Add main content container
  const mainContainer = document.createElement('main');
  mainContainer.id = 'main-content';
  mainContainer.className = 'min-h-[calc(100vh-4rem)] flex flex-col';
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

  const chatOverlay = initChatOverlay();
  chatOverlay.mount(document.body);

  // Update visibility on route changes
  if (chatOverlay.shouldShow()) {
    chatOverlay.show();
  } else {
    chatOverlay.hide();
  }

  // Initialize router
  router.init();

  // Handle WebSocket reconnection on auth changes
  setupAuthListeners();
}

function setupGlobalErrorHandlers(): void {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    
    // Check if it's a network-related error
    if (event.reason instanceof TypeError && event.reason.message.includes('fetch')) {
      // Network error - handled by httpClient
      return;
    }
    
    // Log but don't show overlay for every unhandled rejection
    // Could add more specific handling here
  });

  // Handle global errors
  window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Don't show overlay for script errors, just log them
    // These are typically bugs that need fixing, not user-facing errors
  });

  // Handle offline/online status
  window.addEventListener('offline', () => {
    console.warn('Browser went offline');
    errorOverlay.show({
      type: 'network',
      title: 'You\'re Offline',
      message: 'Your internet connection was lost. Some features may be unavailable.',
      canRetry: true,
      onRetry: async () => {
        return navigator.onLine;
      },
    });
  });

  window.addEventListener('online', () => {
    console.log('Browser came back online');
    // Hide network error if showing
    if (errorOverlay.getCurrentType() === 'network') {
      errorOverlay.hide();
    }
    
    // Reconnect WebSocket if authenticated
    if (authApi.isAuthenticated() && !wsClient.isConnected()) {
      wsClient.connect();
    }
  });

  // Handle visibility change (tab switching)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Check connection when tab becomes visible
      if (authApi.isAuthenticated() && !wsClient.isConnected()) {
        console.log('Tab visible, reconnecting WebSocket...');
        wsClient.connect();
      }
    }
  });
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
    component: TournamentView,
    requiresAuth: true,
  });

  router.registerRoute({
    path: '/oauth/callback',
    title: 'Signing in...',
    component: OAuthCallbackView,
    requiresAuth: false,
  });

  router.registerRoute({
    path: '/leaderboard',
    title: 'Leaderboard',
    component: () => {
      const div = document.createElement('div');
      div.className = 'flex-1 flex items-center justify-center';
      div.innerHTML = `
        <div class="text-center">
          <h1 class="text-4xl font-bold mb-4" style="color: var(--color-navy)">Leaderboard</h1>
          <p style="color: var(--color-navy-muted)">Leaderboard interface coming soon...</p>
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
      div.className = 'flex-1 flex items-center justify-center';
      div.innerHTML = `
        <div class="text-center">
          <h1 class="text-4xl font-bold mb-4" style="color: var(--color-navy)">Statistics</h1>
          <p style="color: var(--color-navy-muted)">Statistics interface coming soon...</p>
        </div>
      `;
      return div;
    },
    requiresAuth: true,
  });

  router.registerRoute({
    path: '/history',
    title: 'Match History',
    component: HistoryView,
    requiresAuth: true,
  });

  router.registerRoute({
    path: '/settings',
    title: 'Settings',
    component: SettingsView,
    requiresAuth: true,
  });

  router.registerRoute({
    path: '/profile',
    title: 'Profile', 
    component: ProfileView,
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
