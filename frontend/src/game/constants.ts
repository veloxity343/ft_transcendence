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
    BACKGROUND: '#0F2847',
    PADDLE: '#4A7CC9',
    BALL: '#6B9AD8',
    NET: '#1E3A5F',
    TEXT: '#ffffff',
    SCORE: '#4A7CC9',
    GLOW: 'rgba(74, 124, 201, 0.5)',
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
