import { router } from '../router';
import { authApi } from '../api/auth';

export function HomeView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen flex flex-col';

  const isAuthenticated = authApi.isAuthenticated();

  container.innerHTML = `
    <div class="flex-1 flex items-center justify-center px-4">
      <div class="max-w-4xl w-full text-center">
        <!-- Logo/Title -->
        <h1 class="text-7xl font-black mb-6 animate-glow">
          <span class="text-game-accent">TRANS</span><span style="color: var(--color-retro-dark)">CENDENCE</span>
        </h1>
        
        <p class="text-2xl mb-12" style="color: var(--color-retro-brown)">
          The Ultimate Pong Experience
        </p>

        <!-- Features Grid -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div class="card">
            <div class="text-4xl mb-4">🎮</div>
            <h3 class="text-xl font-bold mb-2" style="color: var(--color-retro-dark)">Multiplayer</h3>
            <p style="color: var(--color-retro-brown)">Challenge players worldwide in real-time matches</p>
          </div>
          
          <div class="card">
            <div class="text-4xl mb-4">🏆</div>
            <h3 class="text-xl font-bold mb-2" style="color: var(--color-retro-dark)">Tournaments</h3>
            <p style="color: var(--color-retro-brown)">Compete in brackets and climb the ranks</p>
          </div>
          
          <div class="card">
            <div class="text-4xl mb-4">🤖</div>
            <h3 class="text-xl font-bold mb-2" style="color: var(--color-retro-dark)">AI Opponents</h3>
            <p style="color: var(--color-retro-brown)">Practice against intelligent AI with 3 difficulty levels</p>
          </div>
        </div>

        <!-- CTA Buttons -->
        <div class="flex gap-4 justify-center">
          ${isAuthenticated ? `
            <button id="playNowBtn" class="btn-primary text-xl px-12 py-4">
              Play Now
            </button>
            <button id="tournamentsBtn" class="btn-secondary text-xl px-12 py-4">
              Tournaments
            </button>
          ` : `
            <button id="loginBtn" class="btn-primary text-xl px-12 py-4">
              Login
            </button>
            <button id="registerBtn" class="btn-outline text-xl px-12 py-4">
              Register
            </button>
          `}
        </div>
      </div>
    </div>

    <!-- Stats Section -->
    <div class="py-12" style="border-top: 2px solid var(--color-retro-tan)">
      <div class="max-w-6xl mx-auto px-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          <div>
            <div class="text-4xl font-bold text-game-accent mb-2">1000+</div>
            <div style="color: var(--color-retro-brown)">Active Players</div>
          </div>
          <div>
            <div class="text-4xl font-bold text-game-accent mb-2">50K+</div>
            <div style="color: var(--color-retro-brown)">Games Played</div>
          </div>
          <div>
            <div class="text-4xl font-bold text-game-accent mb-2">100+</div>
            <div style="color: var(--color-retro-brown)">Daily Tournaments</div>
          </div>
          <div>
            <div class="text-4xl font-bold text-game-accent mb-2">24/7</div>
            <div style="color: var(--color-retro-brown)">Always Online</div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Event listeners
  if (isAuthenticated) {
    container.querySelector('#playNowBtn')?.addEventListener('click', () => {
      router.navigateTo('/game');
    });
    container.querySelector('#tournamentsBtn')?.addEventListener('click', () => {
      router.navigateTo('/tournament');
    });
  } else {
    container.querySelector('#loginBtn')?.addEventListener('click', () => {
      router.navigateTo('/login');
    });
    container.querySelector('#registerBtn')?.addEventListener('click', () => {
      router.navigateTo('/register');
    });
  }

  return container;
}
