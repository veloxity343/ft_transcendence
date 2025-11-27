export const GAME_CONFIG = {
  WIDTH: 800,
  HEIGHT: 600,
  FPS: 60,
  
  PADDLE: {
    WIDTH: 10,
    HEIGHT: 100,
    SPEED: 8,
    OFFSET: 20, // Distance from edge
  },
  
  BALL: {
    RADIUS: 8,
    INITIAL_SPEED: 5,
    MAX_SPEED: 15,
    ACCELERATION: 1.05,
  },
  
  COLORS: {
    BACKGROUND: '#0a0a0f',
    PADDLE: '#00ff88',
    BALL: '#00ff88',
    NET: '#1a1a2e',
    TEXT: '#ffffff',
    SCORE: '#00ff88',
  },
  
  SCORE: {
    WIN_SCORE: 11,
    FONT_SIZE: 48,
    POSITION_Y: 60,
  },
  
  NET: {
    WIDTH: 4,
    SEGMENT_HEIGHT: 15,
    GAP: 10,
  },
};

export const KEYBOARD = {
  W: 'KeyW',
  S: 'KeyS',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  SPACE: 'Space',
  ESCAPE: 'Escape',
} as const;
