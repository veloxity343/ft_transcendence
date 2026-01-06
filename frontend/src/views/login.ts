import { authApi } from '../api/auth';
import { oauthApi } from '../api/oauth';
import { twoFactorApi } from '../api/twofa';
import { validators } from '../utils/validators';
import { showToast } from '../utils/toast';
import { SUCCESS_MESSAGES } from '../constants';

export function LoginView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 flex items-center justify-center px-4';

  // Check for OAuth errors in URL
  const urlParams = new URLSearchParams(window.location.search);
  const oauthError = urlParams.get('error');
  const requires2FA = urlParams.get('requires2FA') === 'true';
  const prefillUsername = urlParams.get('username') || '';

  container.innerHTML = `
    <div class="glass-card max-w-md w-full p-8">
      <h2 class="text-3xl font-bold text-center mb-8">
        <span class="text-blue animate-glow">Login</span> <span class="text-navy">to Transcendence</span>
      </h2>

      ${oauthError ? `
        <div class="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg mb-6 text-sm">
          ${decodeOAuthError(oauthError)}
        </div>
      ` : ''}

      <!-- Login Form -->
      <form id="loginForm" class="${requires2FA ? 'hidden' : ''}">
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium mb-2 text-navy">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              class="input-glass mb-4 w-full"
              placeholder="Enter your username"
              value="${prefillUsername}"
              required
            />
            <div id="usernameError" class="text-red-500 text-sm mt-1 hidden"></div>
          </div>

          <div>
            <label class="block text-sm font-medium mb-2 text-navy">Password</label>
            <div class="relative">
              <input
                type="password"
                id="password"
                name="password"
                class="input-glass mb-4 w-full pr-10"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                id="togglePassword"
                class="absolute right-3 top-1/2 -translate-y-1/2 text-navy-muted hover:text-navy transition-colors"
                title="Show Password"
              >
                <svg id="eyeOpen" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                </svg>
                <svg id="eyeClosed" class="w-5 h-5 hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                </svg>
              </button>
            </div>
            <div id="passwordError" class="text-red-500 text-sm mt-1 hidden"></div>
          </div>

          <div id="formError" class="text-red-500 text-sm text-center hidden"></div>

          <button type="submit" class="btn-primary w-full py-2.5 mb-6" id="submitBtn">
            Login
          </button>
        </div>
      </form>

      <!-- 2FA Verification Form -->
      <div id="twoFactorForm" class="${requires2FA ? '' : 'hidden'}">
        <div class="text-center mb-6">
          <div class="w-16 h-16 bg-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8 text-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-navy mb-2">Two-Factor Authentication</h3>
          <p class="text-navy-muted text-sm">
            Enter the 6-digit code from your authenticator app
          </p>
        </div>

        <input type="hidden" id="twoFAUsername" value="${prefillUsername}" />

        <div class="mb-4">
          <input
            type="text"
            id="twoFACode"
            class="input-glass w-full text-center text-2xl tracking-[0.5em] font-mono"
            maxlength="6"
            placeholder="000000"
            pattern="[0-9]*"
            inputmode="numeric"
            autocomplete="one-time-code"
          />
        </div>

        <div id="twoFAError" class="text-red-500 text-sm text-center mb-4 hidden"></div>

        <button id="verify2FABtn" class="btn-primary w-full py-2.5 mb-4">
          Verify
        </button>

        <button id="back2FABtn" class="btn-secondary w-full py-2">
          ← Back to Login
        </button>
      </div>

      <!-- OAuth Divider -->
      <div id="oauthSection" class="${requires2FA ? 'hidden' : ''}">
        <div class="relative my-6 mb-6">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-navy/20"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span class="px-4 bg-beige text-navy-muted">or continue with</span>
          </div>
        </div>

        <!-- Google OAuth Button -->
        <button id="googleAuthBtn" class="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-navy/20 rounded-lg hover:bg-navy/5 transition-colors">
          <svg class="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span class="text-navy font-medium">Continue with Google</span>
        </button>

        <div id="oauthLoadingState" class="hidden text-center py-2">
          <span class="text-navy-muted text-sm">Checking OAuth providers...</span>
        </div>
      </div>

      <div class="mt-6 text-center ${requires2FA ? 'hidden' : ''}" id="registerLink">
        <p class="text-navy-muted">
          Don't have an account?
          <a href="/register" class="ml-1 text-blue hover:text-blue-dark transition-colors font-semibold">
            Register here
          </a>
        </p>
      </div>
    </div>
  `;

  // DOM Elements
  const form = container.querySelector('#loginForm') as HTMLFormElement;
  const usernameInput = container.querySelector('#username') as HTMLInputElement;
  const passwordInput = container.querySelector('#password') as HTMLInputElement;
  const submitBtn = container.querySelector('#submitBtn') as HTMLButtonElement;
  const formError = container.querySelector('#formError') as HTMLDivElement;

  const twoFactorForm = container.querySelector('#twoFactorForm') as HTMLDivElement;
  const twoFAUsernameInput = container.querySelector('#twoFAUsername') as HTMLInputElement;
  const twoFACodeInput = container.querySelector('#twoFACode') as HTMLInputElement;
  const verify2FABtn = container.querySelector('#verify2FABtn') as HTMLButtonElement;
  const back2FABtn = container.querySelector('#back2FABtn') as HTMLButtonElement;
  const twoFAError = container.querySelector('#twoFAError') as HTMLDivElement;

  const oauthSection = container.querySelector('#oauthSection') as HTMLDivElement;
  const registerLink = container.querySelector('#registerLink') as HTMLDivElement;
  const googleAuthBtn = container.querySelector('#googleAuthBtn') as HTMLButtonElement;
  const togglePassword = container.querySelector('#togglePassword') as HTMLButtonElement;
  const eyeOpen = togglePassword.querySelectorAll('svg')[0];
  const eyeClosed = togglePassword.querySelectorAll('svg')[1];

  // Toggle password visibility
  togglePassword.addEventListener('click', () => {
    const type = passwordInput.type === 'password' ? 'text' : 'password';
    passwordInput.type = type;
    eyeOpen.classList.toggle('hidden');
    eyeClosed.classList.toggle('hidden');
    togglePassword.title = type === 'password' ? 'Show password' : 'Hide password';
  });

  // Check OAuth status
  checkOAuthStatus();

  // Login form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    formError.classList.add('hidden');
    
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Validate
    const usernameValidation = validators.username(username);
    const passwordValidation = validators.password(password);

    if (!usernameValidation.isValid || !passwordValidation.isValid) {
      formError.textContent = usernameValidation.error || passwordValidation.error || 'Invalid input';
      formError.classList.remove('hidden');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const response = await authApi.login({ username, password });

      if (response.success) {
        // Check if response indicates 2FA is required
        if (response.data?.requires2FA) {
          show2FAForm(username);
          return;
        }

        showToast(SUCCESS_MESSAGES.LOGIN_SUCCESS, 'success');
        window.location.href = '/';
      } else {
        // Check if error indicates 2FA is required
        if (response.error?.includes('2FA') || response.data?.requires2FA) {
          show2FAForm(username);
          return;
        }

        formError.textContent = response.error || 'Login failed';
        formError.classList.remove('hidden');
      }
    } catch (error) {
      formError.textContent = 'An error occurred. Please try again.';
      formError.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });

  // 2FA verification
  verify2FABtn.addEventListener('click', async () => {
    const code = twoFACodeInput.value.trim();
    const username = twoFAUsernameInput.value;
    
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      twoFAError.textContent = 'Please enter a valid 6-digit code';
      twoFAError.classList.remove('hidden');
      return;
    }

    twoFAError.classList.add('hidden');
    verify2FABtn.disabled = true;
    verify2FABtn.textContent = 'Verifying...';

    try {
      const response = await twoFactorApi.authenticate(username, code);

      if (response.success) {
        showToast(SUCCESS_MESSAGES.LOGIN_SUCCESS, 'success');
        window.location.href = '/';
      } else {
        twoFAError.textContent = response.error || 'Invalid verification code';
        twoFAError.classList.remove('hidden');
      }
    } catch (error) {
      twoFAError.textContent = 'An error occurred. Please try again.';
      twoFAError.classList.remove('hidden');
    } finally {
      verify2FABtn.disabled = false;
      verify2FABtn.textContent = 'Verify';
    }
  });

  // Allow Enter key to submit 2FA code
  twoFACodeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      verify2FABtn.click();
    }
  });

  // Only allow numeric input for 2FA code
  twoFACodeInput.addEventListener('input', () => {
    twoFACodeInput.value = twoFACodeInput.value.replace(/\D/g, '').slice(0, 6);
  });

  // Back button from 2FA form
  back2FABtn.addEventListener('click', () => {
    twoFactorForm.classList.add('hidden');
    form.classList.remove('hidden');
    oauthSection.classList.remove('hidden');
    registerLink.classList.remove('hidden');
    twoFACodeInput.value = '';
    twoFAError.classList.add('hidden');
    
    // Clear URL params
    window.history.replaceState({}, '', '/login');
  });

  // Google OAuth button
  googleAuthBtn.addEventListener('click', () => {
    googleAuthBtn.disabled = true;
    googleAuthBtn.innerHTML = `
      <div class="animate-spin w-5 h-5 border-2 border-navy border-t-transparent rounded-full"></div>
      <span class="text-navy font-medium">Redirecting...</span>
    `;
    
    // Redirect to Google OAuth
    oauthApi.redirectToGoogle();
  });

  function show2FAForm(username: string) {
    form.classList.add('hidden');
    oauthSection.classList.add('hidden');
    registerLink.classList.add('hidden');
    twoFactorForm.classList.remove('hidden');
    twoFAUsernameInput.value = username;
    twoFACodeInput.value = '';
    twoFACodeInput.focus();
    
    submitBtn.disabled = false;
    submitBtn.textContent = 'Login';
  }

  async function checkOAuthStatus() {
    try {
      const response = await oauthApi.getStatus();
      
      if (response.success && response.data) {
        // Hide Google button if not configured
        if (!response.data.google?.enabled) {
          googleAuthBtn.classList.add('hidden');
        }
      }
    } catch (error) {
      // If we can't check status, hide OAuth buttons
      console.warn('Could not check OAuth status:', error);
    }
  }

  // Auto-focus 2FA input if shown
  if (requires2FA) {
    setTimeout(() => twoFACodeInput.focus(), 100);
  }

  return container;
}

function decodeOAuthError(error: string): string {
  const errorMessages: Record<string, string> = {
    'oauth_denied': 'You cancelled the sign-in process.',
    'no_code': 'No authorization code received.',
    'invalid_token': 'Invalid authentication token.',
    'email_exists': 'An account with this email already exists.',
  };

  return errorMessages[error] || decodeURIComponent(error);
}
