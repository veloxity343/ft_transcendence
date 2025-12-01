// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000/ws';

// Game Constants
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const PADDLE_WIDTH = 10;
export const PADDLE_HEIGHT = 100;
export const BALL_RADIUS = 8;
export const FPS = 60;
export const WIN_SCORE = 11;

// Game Settings Defaults
export const DEFAULT_GAME_SETTINGS = {
  ballSpeed: 5,
  paddleSpeed: 8,
  paddleSize: 'medium' as const,
  ballColor: '#00ff88',
  paddleColor: '#00ff88',
  backgroundColor: '#0a0a0f',
  winScore: WIN_SCORE,
};

// Paddle Sizes
export const PADDLE_SIZES = {
  small: { width: 10, height: 80 },
  medium: { width: 10, height: 100 },
  large: { width: 10, height: 120 },
};

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  GAME_SETTINGS: 'game_settings',
  THEME: 'theme',
} as const;

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  GAME: '/game',
  TOURNAMENT: '/tournament',
  PROFILE: '/profile',
  LEADERBOARD: '/leaderboard',
  STATS: '/stats',
  SETTINGS: '/settings',
} as const;

// WebSocket Event Types
export const WS_EVENTS = {
  // Game events
  GAME_UPDATE: 'game:update',
  GAME_START: 'game:start',
  GAME_END: 'game:end',
  GAME_PAUSE: 'game:pause',
  GAME_RESUME: 'game:resume',
  PADDLE_MOVE: 'game:paddleMove',
  
  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_JOIN: 'chat:join',
  CHAT_LEAVE: 'chat:leave',
  
  // Tournament events
  TOURNAMENT_UPDATE: 'tournament:update',
  TOURNAMENT_START: 'tournament:start',
  TOURNAMENT_MATCH_START: 'tournament:matchStart',
  TOURNAMENT_MATCH_END: 'tournament:matchEnd',
  
  // User events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_JOIN_GAME: 'user:joinGame',
  USER_LEAVE_GAME: 'user:leaveGame',
} as const;

// Game Modes
export const GAME_MODES = {
  QUICK_PLAY: 'quick_play',
  PRIVATE: 'private',
  AI: 'ai',
  TOURNAMENT: 'tournament',
} as const;

// AI Difficulty
export const AI_DIFFICULTIES = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

// Tournament Settings
export const TOURNAMENT_MAX_PLAYERS = 16;
export const TOURNAMENT_MIN_PLAYERS = 4;

// UI Constants
export const TOAST_DURATION = 3000;
export const DEBOUNCE_DELAY = 300;
export const ANIMATION_DURATION = 200;

// Validation Rules
export const VALIDATION = {
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_CREDENTIALS: 'Invalid username or password.',
  USERNAME_TAKEN: 'Username is already taken.',
  EMAIL_TAKEN: 'Email is already registered.',
  INVALID_EMAIL: 'Please enter a valid email address.',
  INVALID_USERNAME: 'Username can only contain letters, numbers, underscores, and hyphens.',
  PASSWORD_TOO_SHORT: `Password must be at least ${VALIDATION.PASSWORD_MIN_LENGTH} characters.`,
  USERNAME_TOO_SHORT: `Username must be at least ${VALIDATION.USERNAME_MIN_LENGTH} characters.`,
  GAME_NOT_FOUND: 'Game not found.',
  TOURNAMENT_FULL: 'Tournament is full.',
  UNAUTHORIZED: 'Please log in to continue.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Logged in successfully!',
  REGISTER_SUCCESS: 'Account created successfully!',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  PROFILE_UPDATED: 'Profile updated successfully.',
  SETTINGS_SAVED: 'Settings saved successfully.',
  TOURNAMENT_CREATED: 'Tournament created successfully!',
  TOURNAMENT_JOINED: 'Joined tournament successfully!',
} as const;
