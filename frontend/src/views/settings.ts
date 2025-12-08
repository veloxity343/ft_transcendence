import { router } from '../router';
import { authApi } from '../api/auth';
import { twoFactorApi } from '../api/twofa';
import { storage } from '../utils/storage';
import { showToast } from '../utils/toast';
import { validators } from '../utils/validators';

export function SettingsView(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'flex-1 p-4 md:p-8 flex flex-col items-center';

  const user = storage.getUserData();

  container.innerHTML = `
    <h1 class="text-3xl font-bold mb-8">
      <span class="text-blue animate-glow">Settings</span>
    </h1>

    <div class="w-full max-w-2xl mx-auto items-center">
      <!-- Account Settings Section -->
      <div class="glass-card p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4 text-navy">Account Settings</h2>
        
        <!-- Username -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2 text-navy">Username</label>
          <div class="flex gap-2">
            <input
              type="text"
              id="username"
              class="input-glass flex-1"
              value="${user?.username || ''}"
              placeholder="Enter username"
            />
            <button id="updateUsernameBtn" class="btn-primary px-4">
              Update
            </button>
          </div>
          <div id="usernameError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>

        <!-- Email -->
        <div class="mb-4">
          <label class="block text-sm font-medium mb-2 text-navy">Email</label>
          <div class="flex gap-2">
            <input
              type="email"
              id="email"
              class="input-glass flex-1"
              value="${user?.email || ''}"
              placeholder="Enter email"
            />
            <button id="updateEmailBtn" class="btn-primary px-4">
              Update
            </button>
          </div>
          <div id="emailError" class="text-red-500 text-sm mt-1 hidden"></div>
        </div>
      </div>

      <!-- Password Section -->
      <div class="glass-card p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4 text-navy">Change Password</h2>
        
        <form id="passwordForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2 text-navy">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              class="input-glass w-full"
              placeholder="Enter current password"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2 text-navy">New Password</label>
            <input
              type="password"
              id="newPassword"
              class="input-glass w-full"
              placeholder="Enter new password"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium mb-2 text-navy">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              class="input-glass w-full mb-6"
              placeholder="Confirm new password"
            />
          </div>
          
          <div id="passwordError" class="text-red-500 text-sm hidden"></div>
          
          <button type="submit" class="btn-primary px-6">
            Change Password
          </button>
        </form>
      </div>

      <!-- Two-Factor Authentication Section -->
      <div class="glass-card p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4 text-navy">Two-Factor Authentication</h2>
        
        <div id="twoFactorSection">
          <div id="twoFactorLoading" class="text-navy-muted">
            Loading 2FA status...
          </div>
          
          <!-- 2FA Disabled State -->
          <div id="twoFactorDisabled" class="hidden">
            <p class="text-navy-muted mb-4">
              Two-factor authentication adds an extra layer of security to your account.
              When enabled, you'll need to enter a code from your authenticator app when signing in.
            </p>
            <button id="enable2FABtn" class="btn-primary px-6">
              Enable 2FA
            </button>
          </div>
          
          <!-- 2FA Enabled State -->
          <div id="twoFactorEnabled" class="hidden">
            <div class="flex items-center gap-2 text-green-500 mb-4">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
              </svg>
              <span class="font-medium">Two-factor authentication is enabled</span>
            </div>
            <p class="text-navy-muted mb-4">
              Your account is protected with two-factor authentication.
            </p>
            <button id="disable2FABtn" class="btn-secondary px-6 text-red-500 border-red-500 hover:bg-red-500 hover:text-white">
              Disable 2FA
            </button>
          </div>
          
          <!-- 2FA Setup Flow -->
          <div id="twoFactorSetup" class="hidden">
            <div class="space-y-4">
              <p class="text-navy-muted">
                Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
              </p>
              
              <div class="flex justify-center p-4 bg-white rounded-lg">
                <img id="qrCodeImage" src="" alt="2FA QR Code" class="w-48 h-48" />
              </div>
              
              <p class="text-navy-muted text-sm">
                After scanning, enter the 6-digit code from your authenticator app:
              </p>
              
              <div class="flex gap-2 justify-center">
                <input
                  type="text"
                  id="verificationCode"
                  class="input-glass w-40 text-center text-xl tracking-widest"
                  maxlength="6"
                  placeholder="000000"
                  pattern="[0-9]*"
                  inputmode="numeric"
                />
              </div>
              
              <div id="setupError" class="text-red-500 text-sm text-center hidden"></div>
              
              <div class="flex gap-2 justify-center">
                <button id="cancelSetupBtn" class="btn-secondary px-4">
                  Cancel
                </button>
                <button id="verifyCodeBtn" class="btn-primary px-6">
                  Verify & Enable
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Danger Zone -->
      <div class="glass-card p-6 border border-red-500/30">
        <h2 class="text-xl font-semibold mb-4 text-red-500">Danger Zone</h2>
        <p class="text-navy-muted mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button id="deleteAccountBtn" class="btn-secondary px-6 text-red-500 border-red-500 hover:bg-red-500 hover:text-white">
          Delete Account
        </button>
      </div>
    </div>
  `;

  // ==================== ACCOUNT SETTINGS ====================
  
  const usernameInput = container.querySelector('#username') as HTMLInputElement;
  const updateUsernameBtn = container.querySelector('#updateUsernameBtn') as HTMLButtonElement;
  const usernameError = container.querySelector('#usernameError') as HTMLDivElement;

  const emailInput = container.querySelector('#email') as HTMLInputElement;
  const updateEmailBtn = container.querySelector('#updateEmailBtn') as HTMLButtonElement;
  const emailError = container.querySelector('#emailError') as HTMLDivElement;

  updateUsernameBtn.addEventListener('click', async () => {
    const username = usernameInput.value.trim();
    const validation = validators.username(username);
    
    if (!validation.isValid) {
      usernameError.textContent = validation.error!;
      usernameError.classList.remove('hidden');
      return;
    }
    
    usernameError.classList.add('hidden');
    updateUsernameBtn.disabled = true;
    updateUsernameBtn.textContent = 'Updating...';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/users/update-username`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.getAuthToken()}`,
        },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Username updated successfully!', 'success');
        // Update stored user data
        const userData = storage.getUserData();
        if (userData) {
          userData.username = username;
          storage.setUserData(userData);
        }
      } else {
        usernameError.textContent = data.message || data.error || 'Failed to update username';
        usernameError.classList.remove('hidden');
      }
    } catch (error) {
      usernameError.textContent = 'An error occurred. Please try again.';
      usernameError.classList.remove('hidden');
    } finally {
      updateUsernameBtn.disabled = false;
      updateUsernameBtn.textContent = 'Update';
    }
  });

  updateEmailBtn.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const validation = validators.email(email);
    
    if (!validation.isValid) {
      emailError.textContent = validation.error!;
      emailError.classList.remove('hidden');
      return;
    }
    
    emailError.classList.add('hidden');
    updateEmailBtn.disabled = true;
    updateEmailBtn.textContent = 'Updating...';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/users/update-email`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${storage.getAuthToken()}`,
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast('Email updated successfully!', 'success');
        // Update stored user data
        const userData = storage.getUserData();
        if (userData) {
          userData.email = email;
          storage.setUserData(userData);
        }
      } else {
        emailError.textContent = data.message || data.error || 'Failed to update email';
        emailError.classList.remove('hidden');
      }
    } catch (error) {
      emailError.textContent = 'An error occurred. Please try again.';
      emailError.classList.remove('hidden');
    } finally {
      updateEmailBtn.disabled = false;
      updateEmailBtn.textContent = 'Update';
    }
  });

  // ==================== PASSWORD CHANGE ====================
  
  const passwordForm = container.querySelector('#passwordForm') as HTMLFormElement;
  const passwordError = container.querySelector('#passwordError') as HTMLDivElement;

  passwordForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const currentPassword = (container.querySelector('#currentPassword') as HTMLInputElement).value;
    const newPassword = (container.querySelector('#newPassword') as HTMLInputElement).value;
    const confirmPassword = (container.querySelector('#confirmPassword') as HTMLInputElement).value;

    // Validate
    const passwordValidation = validators.password(newPassword);
    if (!passwordValidation.isValid) {
      passwordError.textContent = passwordValidation.error!;
      passwordError.classList.remove('hidden');
      return;
    }

    const matchValidation = validators.passwordMatch(newPassword, confirmPassword);
    if (!matchValidation.isValid) {
      passwordError.textContent = matchValidation.error!;
      passwordError.classList.remove('hidden');
      return;
    }

    passwordError.classList.add('hidden');

    try {
      const response = await authApi.changePassword(currentPassword, newPassword);

      if (response.success) {
        showToast('Password changed successfully!', 'success');
        passwordForm.reset();
      } else {
        passwordError.textContent = response.error || 'Failed to change password';
        passwordError.classList.remove('hidden');
      }
    } catch (error) {
      passwordError.textContent = 'An error occurred. Please try again.';
      passwordError.classList.remove('hidden');
    }
  });

  // ==================== TWO-FACTOR AUTHENTICATION ====================
  
  const twoFactorLoading = container.querySelector('#twoFactorLoading') as HTMLDivElement;
  const twoFactorDisabled = container.querySelector('#twoFactorDisabled') as HTMLDivElement;
  const twoFactorEnabled = container.querySelector('#twoFactorEnabled') as HTMLDivElement;
  const twoFactorSetup = container.querySelector('#twoFactorSetup') as HTMLDivElement;
  const qrCodeImage = container.querySelector('#qrCodeImage') as HTMLImageElement;
  const verificationCode = container.querySelector('#verificationCode') as HTMLInputElement;
  const setupError = container.querySelector('#setupError') as HTMLDivElement;

  const enable2FABtn = container.querySelector('#enable2FABtn') as HTMLButtonElement;
  const disable2FABtn = container.querySelector('#disable2FABtn') as HTMLButtonElement;
  const cancelSetupBtn = container.querySelector('#cancelSetupBtn') as HTMLButtonElement;
  const verifyCodeBtn = container.querySelector('#verifyCodeBtn') as HTMLButtonElement;

  // Check 2FA status
  async function check2FAStatus() {
    try {
      const response = await twoFactorApi.getStatus();
      
      twoFactorLoading.classList.add('hidden');
      
      if (response.success && response.data) {
        if (response.data.enabled) {
          twoFactorEnabled.classList.remove('hidden');
        } else {
          twoFactorDisabled.classList.remove('hidden');
        }
      } else {
        twoFactorDisabled.classList.remove('hidden');
      }
    } catch (error) {
      twoFactorLoading.textContent = 'Failed to load 2FA status';
    }
  }

  check2FAStatus();

  // Enable 2FA - start setup
  enable2FABtn.addEventListener('click', async () => {
    enable2FABtn.disabled = true;
    enable2FABtn.textContent = 'Loading...';

    try {
      const response = await twoFactorApi.generateSecret();

      if (response.success && response.data) {
        qrCodeImage.src = response.data.qrCode;
        twoFactorDisabled.classList.add('hidden');
        twoFactorSetup.classList.remove('hidden');
        verificationCode.focus();
      } else {
        showToast(response.error || 'Failed to generate QR code', 'error');
      }
    } catch (error) {
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      enable2FABtn.disabled = false;
      enable2FABtn.textContent = 'Enable 2FA';
    }
  });

  // Cancel setup
  cancelSetupBtn.addEventListener('click', () => {
    twoFactorSetup.classList.add('hidden');
    twoFactorDisabled.classList.remove('hidden');
    verificationCode.value = '';
    setupError.classList.add('hidden');
  });

  // Verify code and enable 2FA
  verifyCodeBtn.addEventListener('click', async () => {
    const code = verificationCode.value.trim();
    
    if (code.length !== 6 || !/^\d+$/.test(code)) {
      setupError.textContent = 'Please enter a valid 6-digit code';
      setupError.classList.remove('hidden');
      return;
    }

    setupError.classList.add('hidden');
    verifyCodeBtn.disabled = true;
    verifyCodeBtn.textContent = 'Verifying...';

    try {
      const response = await twoFactorApi.enable(code);

      if (response.success) {
        showToast('Two-factor authentication enabled!', 'success');
        twoFactorSetup.classList.add('hidden');
        twoFactorEnabled.classList.remove('hidden');
        verificationCode.value = '';
      } else {
        setupError.textContent = response.error || 'Invalid verification code';
        setupError.classList.remove('hidden');
      }
    } catch (error) {
      setupError.textContent = 'An error occurred. Please try again.';
      setupError.classList.remove('hidden');
    } finally {
      verifyCodeBtn.disabled = false;
      verifyCodeBtn.textContent = 'Verify & Enable';
    }
  });

  // Allow Enter key to submit verification code
  verificationCode.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      verifyCodeBtn.click();
    }
  });

  // Only allow numeric input
  verificationCode.addEventListener('input', () => {
    verificationCode.value = verificationCode.value.replace(/\D/g, '').slice(0, 6);
  });

  // Disable 2FA
  disable2FABtn.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    disable2FABtn.disabled = true;
    disable2FABtn.textContent = 'Disabling...';

    try {
      const response = await twoFactorApi.disable();

      if (response.success) {
        showToast('Two-factor authentication disabled', 'success');
        twoFactorEnabled.classList.add('hidden');
        twoFactorDisabled.classList.remove('hidden');
      } else {
        showToast(response.error || 'Failed to disable 2FA', 'error');
      }
    } catch (error) {
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      disable2FABtn.disabled = false;
      disable2FABtn.textContent = 'Disable 2FA';
    }
  });

  // ==================== DELETE ACCOUNT ====================
  
  const deleteAccountBtn = container.querySelector('#deleteAccountBtn') as HTMLButtonElement;

  deleteAccountBtn.addEventListener('click', async () => {
    const confirmed = confirm(
      'Are you absolutely sure you want to delete your account?\n\n' +
      'This action cannot be undone. All your data, game history, and achievements will be permanently deleted.'
    );

    if (!confirmed) return;

    const doubleConfirmed = confirm(
      'This is your final warning!\n\n' +
      'Type "DELETE" in the next prompt to confirm account deletion.'
    );

    if (!doubleConfirmed) return;

    const typed = prompt('Type DELETE to confirm:');
    if (typed !== 'DELETE') {
      showToast('Account deletion cancelled', 'info');
      return;
    }

    deleteAccountBtn.disabled = true;
    deleteAccountBtn.textContent = 'Deleting...';

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/users/me`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${storage.getAuthToken()}`,
        },
      });

      if (response.ok) {
        showToast('Account deleted successfully', 'success');
        await authApi.logout();
        window.location.href = '/';
      } else {
        const data = await response.json();
        showToast(data.message || 'Failed to delete account', 'error');
      }
    } catch (error) {
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      deleteAccountBtn.disabled = false;
      deleteAccountBtn.textContent = 'Delete Account';
    }
  });

  return container;
}
