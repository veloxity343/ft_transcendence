// Sound Controls Component - Toggle buttons for SFX and Music
import { soundManager } from '../utils/sound';

export function SoundControls(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'fixed bottom-4 right-4 z-[90] flex items-center gap-2';

  const sfxEnabled = soundManager.isSfxEnabled();
  const musicEnabled = soundManager.isMusicEnabled();

  container.innerHTML = `
    <div class="flex items-center gap-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 border border-tan/30">
      <!-- SFX Toggle -->
      <button 
        id="sfxToggle" 
        class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${sfxEnabled ? 'bg-blue text-white' : 'bg-gray-200 text-gray-500'}"
        title="${sfxEnabled ? 'Mute Sound Effects' : 'Unmute Sound Effects'}"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${sfxEnabled ? `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          ` : `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          `}
        </svg>
      </button>

      <!-- Music Toggle -->
      <button 
        id="musicToggle" 
        class="w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${musicEnabled ? 'bg-blue text-white' : 'bg-gray-200 text-gray-500'}"
        title="${musicEnabled ? 'Stop Music' : 'Play Music'}"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${musicEnabled ? `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          ` : `
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
          `}
        </svg>
      </button>
    </div>
  `;

  // Event listeners
  const sfxToggle = container.querySelector('#sfxToggle') as HTMLButtonElement;
  const musicToggle = container.querySelector('#musicToggle') as HTMLButtonElement;

  sfxToggle.addEventListener('click', (e) => {
    e.stopPropagation(); // Prevent triggering global click sound
    soundManager.resumeAudioContext();
    const newState = !soundManager.isSfxEnabled();
    soundManager.setSfxEnabled(newState);
    updateSfxButton(newState);
    if (newState) soundManager.click(); // Play click to confirm sound is on
  });

  musicToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    soundManager.resumeAudioContext();
    const newState = !soundManager.isMusicEnabled();
    soundManager.setMusicEnabled(newState);
    updateMusicButton(newState);
  });

  function updateSfxButton(enabled: boolean): void {
    sfxToggle.className = `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${enabled ? 'bg-blue text-white' : 'bg-gray-200 text-gray-500'}`;
    sfxToggle.title = enabled ? 'Mute Sound Effects' : 'Unmute Sound Effects';
    sfxToggle.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${enabled ? `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        ` : `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        `}
      </svg>
    `;
  }

  function updateMusicButton(enabled: boolean): void {
    musicToggle.className = `w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${enabled ? 'bg-blue text-white' : 'bg-gray-200 text-gray-500'}`;
    musicToggle.title = enabled ? 'Stop Music' : 'Play Music';
    musicToggle.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        ${enabled ? `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
        ` : `
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3l18 18" />
        `}
      </svg>
    `;
  }

  return container;
}
