import { router } from '../router';
import { authApi } from '../api/auth';
import { validators } from '../utils/validators';
import { showToast } from '../utils/toast';
import { SUCCESS_MESSAGES } from '../constants';

export function RegisterView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'min-h-screen flex items-center justify-center px-4 py-12';

  container.innerHTML = `
    <div class="card max-w-md w-full">
      <h2 class="text-3xl font-bold text-center mb-8">
        <span class="text-game-accent">Join</span> Transcendence
      </h2>

      <form id="registerForm" class="space-y-6">
        <div>
          <label class="block text-sm font-medium mb-2 text-retro-dark">Username</label>
          <input
            type="text"
            id="username"
            name="username"
            class="input-field"
            placeholder="Choose a username"
            required
          />
          <div id="usernameError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-retro-dark">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            class="input-field"
            placeholder="Enter your email"
            required
          />
          <div id="emailError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-retro-dark">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            class="input-field"
            placeholder="Choose a password"
            required
          />
          <div id="passwordError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-2 text-retro-dark">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            class="input-field"
            placeholder="Confirm your password"
            required
          />
          <div id="confirmPasswordError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <div id="formError" class="text-red-500 text-sm text-center hidden"></div>

        <button type="submit" class="btn-primary w-full" id="submitBtn">
          Create Account
        </button>
      </form>

      <div class="mt-6 text-center">
        <p class="text-retro-brown">
          Already have an account?
          <a href="/login" class="ml-1 hover:text-game-accent transition-colors">
            Login here
          </a>
        </p>
      </div>
    </div>
  `;

  const form = container.querySelector('#registerForm') as HTMLFormElement;
  const usernameInput = form.querySelector('#username') as HTMLInputElement;
  const emailInput = form.querySelector('#email') as HTMLInputElement;
  const passwordInput = form.querySelector('#password') as HTMLInputElement;
  const confirmPasswordInput = form.querySelector('#confirmPassword') as HTMLInputElement;
  const submitBtn = form.querySelector('#submitBtn') as HTMLButtonElement;
  const formError = container.querySelector('#formError') as HTMLDivElement;

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
        router.navigateTo('/game');
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

  return container;
}
