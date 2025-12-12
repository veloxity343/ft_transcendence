// Sound Manager - Handles all audio in the application

type SoundType = 'paddleHit' | 'wallHit' | 'score' | 'gameStart' | 'gameWin' | 'gameLose' | 'click' | 'notification';

interface SoundSettings {
  sfxEnabled: boolean;
  sfxVolume: number;
  musicEnabled: boolean;
  musicVolume: number;
}

class SoundManager {
  private audioContext: AudioContext | null = null;
  private settings: SoundSettings;
  private backgroundAudio: HTMLAudioElement | null = null;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): SoundSettings {
    const saved = localStorage.getItem('soundSettings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fall through to defaults
      }
    }
    return {
      sfxEnabled: true,
      sfxVolume: 0.5,
      musicEnabled: false,
      musicVolume: 0.15,
    };
  }

  private saveSettings(): void {
    localStorage.setItem('soundSettings', JSON.stringify(this.settings));
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    return this.audioContext;
  }

  private generateSound(type: SoundType): void {
    if (!this.settings.sfxEnabled) return;

    const ctx = this.getAudioContext();
    const volume = this.settings.sfxVolume;
    const now = ctx.currentTime;

    switch (type) {
      case 'paddleHit': {
        // Classic Pong "bip" - higher pitch
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(volume * 0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }

      case 'wallHit': {
        // Lower pitch bounce
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, now);
        gain.gain.setValueAtTime(volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }

      case 'score': {
        // Rising triumphant arpeggio
        const notes = [523, 659, 784];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + i * 0.1);
          gain.gain.setValueAtTime(0, now + i * 0.1);
          gain.gain.linearRampToValueAtTime(volume * 0.3, now + i * 0.1 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.15);
          osc.start(now + i * 0.1);
          osc.stop(now + i * 0.1 + 0.15);
        });
        break;
      }

      case 'gameStart': {
        // Countdown beeps then go
        const notes = [440, 440, 440, 880];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + i * 0.15);
          gain.gain.setValueAtTime(volume * 0.3, now + i * 0.15);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.1);
          osc.start(now + i * 0.15);
          osc.stop(now + i * 0.15 + 0.1);
        });
        break;
      }

      case 'gameWin': {
        // Victory fanfare
        const notes = [523, 659, 784, 1047, 784, 1047];
        notes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'square';
          osc.frequency.setValueAtTime(freq, now + i * 0.12);
          gain.gain.setValueAtTime(volume * 0.35, now + i * 0.12);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.15);
          osc.start(now + i * 0.12);
          osc.stop(now + i * 0.12 + 0.15);
        });
        break;
      }

      case 'gameLose': {
        // Sad descending
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.6);
        gain.gain.setValueAtTime(volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc.start(now);
        osc.stop(now + 0.7);
        break;
      }

      case 'click': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(volume * 0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }

      case 'notification': {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.setValueAtTime(1100, now + 0.1);
        gain.gain.setValueAtTime(volume * 0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;
      }
    }
  }

  play(type: SoundType): void {
    this.generateSound(type);
  }

  paddleHit(): void { this.play('paddleHit'); }
  wallHit(): void { this.play('wallHit'); }
  score(): void { this.play('score'); }
  gameStart(): void { this.play('gameStart'); }
  gameWin(): void { this.play('gameWin'); }
  gameLose(): void { this.play('gameLose'); }
  click(): void { this.play('click'); }
  notification(): void { this.play('notification'); }

  // Background music - from audio file
  startBackgroundMusic(): void {
    if (!this.settings.musicEnabled) return;
    
    if (this.backgroundAudio) {
      // Already exists, just play it
      this.backgroundAudio.play().catch(err => {
        console.log('Could not play background music:', err);
      });
      return;
    }

    // Create audio element
    this.backgroundAudio = new Audio('/music/uncharted-worlds.mp3');
    this.backgroundAudio.loop = true;
    this.backgroundAudio.volume = this.settings.musicVolume;
    
    this.backgroundAudio.play().catch(err => {
      console.log('Could not autoplay background music (browser policy):', err);
      // Will try again on user interaction
    });
  }

  stopBackgroundMusic(): void {
    if (this.backgroundAudio) {
      this.backgroundAudio.pause();
      this.backgroundAudio.currentTime = 0;
    }
  }

  setSfxEnabled(enabled: boolean): void {
    this.settings.sfxEnabled = enabled;
    this.saveSettings();
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  setMusicEnabled(enabled: boolean): void {
    this.settings.musicEnabled = enabled;
    this.saveSettings();
    if (enabled) {
      this.startBackgroundMusic();
    } else {
      this.stopBackgroundMusic();
    }
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundAudio) {
      this.backgroundAudio.volume = this.settings.musicVolume;
    }
    this.saveSettings();
  }

  isSfxEnabled(): boolean { return this.settings.sfxEnabled; }
  isMusicEnabled(): boolean { return this.settings.musicEnabled; }
  getSfxVolume(): number { return this.settings.sfxVolume; }
  getMusicVolume(): number { return this.settings.musicVolume; }

  initGlobalClickSounds(): void {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.closest('button') ||
        target.closest('a') ||
        target.classList.contains('clickable') ||
        target.classList.contains('game-mode-btn') ||
        target.classList.contains('difficulty-btn') ||
        target.classList.contains('tournament-card') ||
        target.role === 'button'
      ) {
        this.click();
      }
    });
  }

  resumeAudioContext(): void {
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
  }
}

export const soundManager = new SoundManager();
