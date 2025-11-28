import { router } from '../router';
import { authApi } from '../api/auth';
import { validators } from '../utils/validators';
import { showToast } from '../utils/toast';
import { SUCCESS_MESSAGES } from '../constants';

export function LoginView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen flex items-center justify-center px-4';

  container.innerHTML = `
    <div class="glass-card max-w-md w-full p-8">
      <h2 class="text-3xl font-bold text-center mb-8">
        <span class="text-blue animate-glow">Login</span> <span class="text-navy">to Transcendence</span>
      </h2>

      <form id="loginForm" class="space-y-6">
        <div>
          <label class="block text-sm font-medium mb-2 text-navy">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            class="input-glass w-full"
            placeholder="Enter your username"
            required
          />
          <div id="usernameError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-navy">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            class="input-glass w-full"
            placeholder="Enter your password"
            required
          />
          <div id="passwordError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div id="formError" class="text-red-500 text-sm text-center hidden"></div>

        <button type="submit" class="btn-primary w-full" id="submitBtn">
          Login
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-navy-muted">
          Don't have an account?
          <a href="/register" class="ml-1 text-blue hover:text-blue-dark transition-colors font-semibold">
            Register here
          </a>
        </p>
      </div>
    </div>
  `;

  const form = container.querySelector('#loginForm') as HTMLFormElement;
  const usernameInput = form.querySelector('#username') as HTMLInputElement;
  const passwordInput = form.querySelector('#password') as HTMLInputElement;
  const submitBtn = form.querySelector('#submitBtn') as HTMLButtonElement;
  const formError = container.querySelector('#formError') as HTMLDivElement;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear previous errors
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

    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Logging in...';

    try {
      const response = await authApi.login({ username, password });

      if (response.success) {
        showToast(SUCCESS_MESSAGES.LOGIN_SUCCESS, 'success');
        router.navigateTo('/');
      } else {
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

  return container;
}
