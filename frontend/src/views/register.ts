import { router } from '../router';
import { authApi } from '../api/auth';
import { oauthApi } from '../api/oauth';
import { validators } from '../utils/validators';
import { showToast } from '../utils/toast';
import { SUCCESS_MESSAGES } from '../constants';

export function RegisterView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 flex items-center justify-center px-4 py-12';

  container.innerHTML = `
    <div class="glass-card max-w-md w-full p-8">
      <h2 class="text-3xl font-bold text-center mb-8">
        <span class="text-blue animate-glow">Join</span> <span class="text-navy">Transcendence</span>
      </h2>

      <!-- Google OAuth Button (top) -->
      <button id="googleAuthBtn" class="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-navy/20 rounded-lg hover:bg-navy/5 transition-colors mb-6">
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        <span class="text-navy font-medium">Sign up with Google</span>
      </button>

      <!-- Divider -->
      <div class="relative mb-6">
        <div class="absolute inset-0 flex items-center">
          <div class="w-full border-t border-navy/20"></div>
        </div>
        <div class="relative flex justify-center text-sm">
          <span class="px-4 bg-beige text-navy-muted">or register with email</span>
        </div>
      </div>

      <form id="registerForm" class="space-y-4">
        <div>
          <label class="block text-sm font-medium mb-2 text-navy">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            class="input-glass w-full"
            placeholder="Choose a username"
            required
          />
          <p class="text-xs text-navy-muted mt-1">3-20 characters, letters, numbers, underscores and hyphens only</p>
          <div id="usernameError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-navy">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            class="input-glass w-full"
            placeholder="Enter your email"
            required
          />
          <div id="emailError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-navy">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            class="input-glass w-full"
            placeholder="Choose a password"
            required
          />
          <p class="text-xs text-navy-muted mt-1">Minimum 8 characters</p>
          <div id="passwordError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-navy">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            class="input-glass w-full"
            placeholder="Confirm your password"
            required
          />
          <div id="confirmPasswordError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div id="formError" class="text-red-500 text-sm text-center hidden"></div>

        <button type="submit" class="btn-primary w-full py-2.5 mt-2" id="submitBtn">
          Create Account
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-navy-muted">
          Already have an account?
          <a href="/login" class="ml-1 text-blue hover:text-blue-dark transition-colors font-semibold">
            Login here
          </a>
        </p>
      </div>

      <!-- Terms Notice -->
      <p class="text-xs text-navy-muted text-center mt-4">
        By creating an account, you agree to our terms of service and privacy policy.
      </p>
    </div>
  `;

  const form = container.querySelector('#registerForm') as HTMLFormElement;
  const usernameInput = form.querySelector('#username') as HTMLInputElement;
  const emailInput = form.querySelector('#email') as HTMLInputElement;
  const passwordInput = form.querySelector('#password') as HTMLInputElement;
  const confirmPasswordInput = form.querySelector('#confirmPassword') as HTMLInputElement;
  const submitBtn = form.querySelector('#submitBtn') as HTMLButtonElement;
  const formError = container.querySelector('#formError') as HTMLDivElement;
  const googleAuthBtn = container.querySelector('#googleAuthBtn') as HTMLButtonElement;

  // Check OAuth status
  checkOAuthStatus();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    formError.classList.add('hidden');
    
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Validate
    const usernameValidation = validators.username(username);
    const emailValidation = validators.email(email);
    const passwordValidation = validators.password(password);
    const passwordMatchValidation = validators.passwordMatch(password, confirmPassword);

    if (!usernameValidation.isValid) {
      formError.textContent = usernameValidation.error!;
      formError.classList.remove('hidden');
      return;
    }

    if (!emailValidation.isValid) {
      formError.textContent = emailValidation.error!;
      formError.classList.remove('hidden');
      return;
    }

    if (!passwordValidation.isValid) {
      formError.textContent = passwordValidation.error!;
      formError.classList.remove('hidden');
      return;
    }

    if (!passwordMatchValidation.isValid) {
      formError.textContent = passwordMatchValidation.error!;
      formError.classList.remove('hidden');
      return;
    }

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';

    try {
      const response = await authApi.register({ username, email, password });

      if (response.success) {
        showToast(SUCCESS_MESSAGES.REGISTER_SUCCESS, 'success');
        // Full page reload to refresh navbar and reconnect WebSocket
        window.location.href = '/';
      } else {
        formError.textContent = response.error || 'Registration failed';
        formError.classList.remove('hidden');
      }
    } catch (error) {
      formError.textContent = 'An error occurred. Please try again.';
      formError.classList.remove('hidden');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Account';
    }
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

  async function checkOAuthStatus() {
    try {
      const response = await oauthApi.getStatus();
      
      if (response.success && response.data) {
        // Hide Google button if not configured
        if (!response.data.google?.enabled) {
          googleAuthBtn.classList.add('hidden');
          // Also hide the divider
          const divider = container.querySelector('.relative.mb-6') as HTMLDivElement;
          if (divider) divider.classList.add('hidden');
        }
      }
    } catch (error) {
      console.warn('Could not check OAuth status:', error);
    }
  }

  return container;
}
