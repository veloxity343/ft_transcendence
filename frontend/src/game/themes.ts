// Game visual themes - easily extensible for different looks

export interface GameTheme {
  name: string;
  background: string;
  paddle: string;
  paddleHighlight?: string;
  ball: string;
  ballGlow?: string;
  net: string;
  text: string;
  score: string;
  scanlines: boolean;
  glowEffects: boolean;
  borderRadius: number;
}

export const GAME_THEMES: Record<string, GameTheme> = {
  // Classic Atari Pong - pure black & white
  atari: {
    name: 'Atari Classic',
    background: '#000000',
    paddle: '#FFFFFF',
    ball: '#FFFFFF',
    net: '#FFFFFF',
    text: '#FFFFFF',
    score: '#FFFFFF',
    scanlines: true,
    glowEffects: false,
    borderRadius: 0,
  },
  
  // Phosphor green CRT look
  phosphor: {
    name: 'Phosphor Green',
    background: '#0a1a0a',
    paddle: '#33ff33',
    paddleHighlight: '#66ff66',
    ball: '#33ff33',
    ballGlow: 'rgba(51, 255, 51, 0.5)',
    net: '#1a3a1a',
    text: '#33ff33',
    score: '#33ff33',
    scanlines: true,
    glowEffects: true,
    borderRadius: 0,
  },
  
  // Amber CRT monitor
  amber: {
    name: 'Amber Monitor',
    background: '#1a1400',
    paddle: '#ffaa00',
    paddleHighlight: '#ffcc44',
    ball: '#ffaa00',
    ballGlow: 'rgba(255, 170, 0, 0.5)',
    net: '#3a2a00',
    text: '#ffaa00',
    score: '#ffaa00',
    scanlines: true,
    glowEffects: true,
    borderRadius: 0,
  },
  
  // Modern blue (matches our UI theme)
  modern: {
    name: 'Modern Blue',
    background: '#0F2847',
    paddle: '#4A7CC9',
    paddleHighlight: '#6B9AD8',
    ball: '#6B9AD8',
    ballGlow: 'rgba(74, 124, 201, 0.5)',
    net: '#1E3A5F',
    text: '#FFFFFF',
    score: '#4A7CC9',
    scanlines: false,
    glowEffects: true,
    borderRadius: 4,
  },
  
  // Neon synthwave
  neon: {
    name: 'Neon Synthwave',
    background: '#0a0a1a',
    paddle: '#ff00ff',
    paddleHighlight: '#ff66ff',
    ball: '#00ffff',
    ballGlow: 'rgba(0, 255, 255, 0.6)',
    net: '#1a1a3a',
    text: '#ffffff',
    score: '#ff00ff',
    scanlines: true,
    glowEffects: true,
    borderRadius: 0,
  },
};

export const DEFAULT_THEME = 'atari';
