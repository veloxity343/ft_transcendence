import { authApi } from '../api/auth';
import { oauthApi } from '../api/oauth';
import { storage } from '../utils/storage';

export function OAuthCallbackView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 flex items-center justify-center px-4';

  container.innerHTML = `
    <div class="glass-card max-w-md w-full p-8 text-center">
      <div id="loadingState">
        <div class="animate-spin w-12 h-12 border-4 border-blue border-t-transparent rounded-full mx-auto mb-4"></div>
        <h2 class="text-xl font-semibold text-navy mb-2">Completing sign in...</h2>
        <p class="text-navy-muted">Please wait while we set up your session.</p>
      </div>
      
      <div id="errorState" class="hidden">
        <div class="text-red-500 text-6xl mb-4">✕</div>
        <h2 class="text-xl font-semibold text-navy mb-2">Sign in failed</h2>
        <p id="errorMessage" class="text-navy-muted mb-4">An error occurred during sign in.</p>
        <a href="/login" class="btn-primary px-6 py-2 inline-block">
          Try Again
        </a>
      </div>
      
      <div id="successState" class="hidden">
        <div class="text-green-500 text-6xl mb-4">✓</div>
        <h2 class="text-xl font-semibold text-navy mb-2">Sign in successful!</h2>
        <p class="text-navy-muted mb-4">Redirecting you to the home page...</p>
      </div>
    </div>
  `;

  // Process OAuth callback
  setTimeout(() => processCallback(), 100);

  async function processCallback() {
    console.log('OAuth Callback - Current URL:', window.location.href);
    console.log('OAuth Callback - Search params:', window.location.search);

    const urlParams = new URLSearchParams(window.location.search);
    console.log('access_token:', urlParams.get('access_token'));
    console.log('refresh_token:', urlParams.get('refresh_token'));

    const loadingState = container.querySelector('#loadingState') as HTMLDivElement;
    const errorState = container.querySelector('#errorState') as HTMLDivElement;
    const errorMessage = container.querySelector('#errorMessage') as HTMLParagraphElement;

    try {
        // Handle the OAuth callback
        const result = oauthApi.handleCallback();

        if (!result.success) {
        throw new Error(result.error || 'Authentication failed');
        }

        // Fetch user data
        const userResponse = await authApi.getCurrentUser();
        
        if (userResponse.success && userResponse.data) {
        storage.setUserData(userResponse.data);
        }

        // Dispatch auth:login event
        window.dispatchEvent(new CustomEvent('auth:login'));

        // Redirect immediately to home
        window.location.href = '/';

    } catch (error: any) {
        console.error('OAuth callback error:', error);
        
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        errorMessage.textContent = error.message || 'An error occurred during sign in.';
    }
    }

  return container;
}
