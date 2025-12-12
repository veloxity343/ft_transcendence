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
  private musicInterval: ReturnType<typeof setInterval> | null = null;
  private musicGainNode: GainNode | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private isMusicPlaying = false;

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
      musicVolume: 0.3,
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

  // Background music - retro ambient loop
  startBackgroundMusic(): void {
    if (!this.settings.musicEnabled || this.isMusicPlaying) return;

    const ctx = this.getAudioContext();
    this.isMusicPlaying = true;

    // Create master gain for music
    this.musicGainNode = ctx.createGain();
    this.musicGainNode.gain.setValueAtTime(this.settings.musicVolume * 0.15, ctx.currentTime);
    this.musicGainNode.connect(ctx.destination);

    // Bass drone
    const bassOsc = ctx.createOscillator();
    const bassGain = ctx.createGain();
    bassOsc.type = 'sine';
    bassOsc.frequency.setValueAtTime(55, ctx.currentTime); // A1
    bassGain.gain.setValueAtTime(0.4, ctx.currentTime);
    bassOsc.connect(bassGain);
    bassGain.connect(this.musicGainNode);
    bassOsc.start();
    this.musicOscillators.push(bassOsc);

    // Rhythmic pulse pattern
    let beat = 0;
    const bpm = 120;
    const beatInterval = 60000 / bpm;

    this.musicInterval = setInterval(() => {
      if (!this.isMusicPlaying || !this.musicGainNode) return;

      const now = ctx.currentTime;
      
      // Simple 4-beat pattern
      const pattern = [1, 0, 0.5, 0]; // 1 = accent, 0.5 = soft, 0 = rest
      const intensity = pattern[beat % 4];

      if (intensity > 0) {
        // Kick-like pulse
        const kickOsc = ctx.createOscillator();
        const kickGain = ctx.createGain();
        kickOsc.type = 'sine';
        kickOsc.frequency.setValueAtTime(80, now);
        kickOsc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        kickGain.gain.setValueAtTime(intensity * 0.5, now);
        kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        kickOsc.connect(kickGain);
        kickGain.connect(this.musicGainNode);
        kickOsc.start(now);
        kickOsc.stop(now + 0.15);

        // Hi-hat on offbeats
        if (beat % 2 === 1) {
          const noise = ctx.createOscillator();
          const noiseGain = ctx.createGain();
          noise.type = 'square';
          noise.frequency.setValueAtTime(1000 + Math.random() * 500, now);
          noiseGain.gain.setValueAtTime(0.08, now);
          noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          noise.connect(noiseGain);
          noiseGain.connect(this.musicGainNode);
          noise.start(now);
          noise.stop(now + 0.05);
        }
      }

      // Arpeggiated notes every 4 beats
      if (beat % 4 === 0) {
        const arpNotes = [110, 165, 220, 165]; // A2, E3, A3, E3
        arpNotes.forEach((freq, i) => {
          const arpOsc = ctx.createOscillator();
          const arpGain = ctx.createGain();
          arpOsc.type = 'triangle';
          arpOsc.frequency.setValueAtTime(freq, now + i * 0.1);
          arpGain.gain.setValueAtTime(0, now + i * 0.1);
          arpGain.gain.linearRampToValueAtTime(0.15, now + i * 0.1 + 0.02);
          arpGain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.2);
          arpOsc.connect(arpGain);
          arpGain.connect(this.musicGainNode!);
          arpOsc.start(now + i * 0.1);
          arpOsc.stop(now + i * 0.1 + 0.2);
        });
      }

      beat++;
    }, beatInterval);
  }

  stopBackgroundMusic(): void {
    this.isMusicPlaying = false;

    if (this.musicInterval) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }

    // Stop any running oscillators
    this.musicOscillators.forEach(osc => {
      try { osc.stop(); } catch { /* already stopped */ }
    });
    this.musicOscillators = [];
    this.musicGainNode = null;
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
    if (this.musicGainNode) {
      const ctx = this.getAudioContext();
      this.musicGainNode.gain.setValueAtTime(volume * 0.15, ctx.currentTime);
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
