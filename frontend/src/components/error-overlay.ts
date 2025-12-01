export type ErrorType = 'websocket' | 'network' | 'server' | 'auth';

export interface ErrorOverlayConfig {
  type: ErrorType;
  title?: string;
  message?: string;
  canRetry?: boolean;
  onRetry?: () => Promise<boolean>;
  onDismiss?: () => void;
}

const ERROR_CONFIGS: Record<ErrorType, { icon: string; title: string; message: string }> = {
  websocket: {
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 1l22 22M9 9v.01M15 15v.01M9 15l6-6"/>
      <circle cx="12" cy="12" r="10"/>
    </svg>`,
    title: 'Connection Lost',
    message: 'Lost connection to the game server. Your game progress may be affected.',
  },
  network: {
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M1 1l22 22"/>
      <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55"/>
      <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39"/>
      <path d="M10.71 5.05A16 16 0 0 1 22.58 9"/>
      <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88"/>
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0"/>
      <circle cx="12" cy="20" r="1"/>
    </svg>`,
    title: 'Network Error',
    message: 'Unable to reach the server. Please check your internet connection.',
  },
  server: {
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
      <line x1="6" y1="6" x2="6.01" y2="6"/>
      <line x1="6" y1="18" x2="6.01" y2="18"/>
      <path d="M12 10v4"/>
      <circle cx="12" cy="12" r="1"/>
    </svg>`,
    title: 'Server Error',
    message: 'The server encountered an error. Our team has been notified.',
  },
  auth: {
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      <line x1="12" y1="15" x2="12" y2="17"/>
    </svg>`,
    title: 'Session Expired',
    message: 'Your session has expired. Please log in again to continue.',
  },
};

class ErrorOverlayManager {
  private overlay: HTMLElement | null = null;
  private isVisible = false;
  private currentConfig: ErrorOverlayConfig | null = null;
  private retryCount = 0;
  private maxRetries = 3;

  show(config: ErrorOverlayConfig): void {
    // Don't show multiple overlays
    if (this.isVisible && this.currentConfig?.type === config.type) {
      return;
    }

    this.currentConfig = config;
    this.isVisible = true;
    this.retryCount = 0;

    const errorInfo = ERROR_CONFIGS[config.type];
    const title = config.title || errorInfo.title;
    const message = config.message || errorInfo.message;
    const canRetry = config.canRetry !== false && config.type !== 'auth';

    // Remove existing overlay if any
    this.removeOverlay();

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'error-overlay';
    this.overlay.className = 'error-overlay';
    this.overlay.innerHTML = `
      <div class="error-overlay-backdrop"></div>
      <div class="error-overlay-content">
        <div class="error-overlay-window">
          <div class="error-window-titlebar">
            <div class="error-window-title">
              <span class="error-window-icon">⚠</span>
              System Error
            </div>
            <div class="error-window-controls">
              <button class="error-window-btn minimize">─</button>
              <button class="error-window-btn maximize">□</button>
              <button class="error-window-btn close" id="errorDismissBtn">✕</button>
            </div>
          </div>
          <div class="error-window-body">
            <div class="error-icon-container">
              ${errorInfo.icon}
            </div>
            <h2 class="error-title">${title}</h2>
            <p class="error-message">${message}</p>
            <div id="errorStatus" class="error-status"></div>
            <div class="error-actions">
              ${canRetry ? `
                <button id="errorRetryBtn" class="error-btn error-btn-primary">
                  <span class="btn-text">Retry Connection</span>
                  <span class="btn-spinner hidden">
                    <svg class="animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10" stroke-opacity="0.25"/>
                      <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
                    </svg>
                  </span>
                </button>
              ` : ''}
              ${config.type === 'auth' ? `
                <button id="errorLoginBtn" class="error-btn error-btn-primary">
                  Go to Login
                </button>
              ` : ''}
              ${config.type !== 'auth' ? `
                <button id="errorContinueBtn" class="error-btn error-btn-secondary">
                  Continue Offline
                </button>
              ` : ''}
            </div>
            <div class="error-details">
              <button id="toggleDetailsBtn" class="error-details-toggle">
                <span>Show Details</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <div id="errorDetailsContent" class="error-details-content hidden">
                <pre>Type: ${config.type}
Time: ${new Date().toLocaleString()}
Retry Attempts: <span id="retryCountDisplay">0</span>/${this.maxRetries}</pre>
              </div>
            </div>
          </div>
          <div class="error-window-statusbar">
            <span id="connectionIndicator" class="status-indicator disconnected"></span>
            <span id="statusText">Disconnected</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Setup event listeners
    this.setupEventListeners(config);

    // Add entrance animation
    requestAnimationFrame(() => {
      this.overlay?.classList.add('visible');
    });
  }

  private setupEventListeners(config: ErrorOverlayConfig): void {
    const retryBtn = this.overlay?.querySelector('#errorRetryBtn');
    const dismissBtn = this.overlay?.querySelector('#errorDismissBtn');
    const continueBtn = this.overlay?.querySelector('#errorContinueBtn');
    const loginBtn = this.overlay?.querySelector('#errorLoginBtn');
    const toggleDetailsBtn = this.overlay?.querySelector('#toggleDetailsBtn');
    const detailsContent = this.overlay?.querySelector('#errorDetailsContent');

    retryBtn?.addEventListener('click', () => this.handleRetry(config));
    
    dismissBtn?.addEventListener('click', () => {
      if (config.type === 'auth') {
        window.location.href = '/login';
      } else {
        this.hide();
        config.onDismiss?.();
      }
    });

    continueBtn?.addEventListener('click', () => {
      this.hide();
      config.onDismiss?.();
    });

    loginBtn?.addEventListener('click', () => {
      window.location.href = '/login';
    });

    toggleDetailsBtn?.addEventListener('click', () => {
      detailsContent?.classList.toggle('hidden');
      const span = toggleDetailsBtn.querySelector('span');
      if (span) {
        span.textContent = detailsContent?.classList.contains('hidden') 
          ? 'Show Details' 
          : 'Hide Details';
      }
    });
  }

  private async handleRetry(config: ErrorOverlayConfig): Promise<void> {
    if (!config.onRetry || this.retryCount >= this.maxRetries) {
      this.updateStatus('Max retries reached. Please refresh the page.', 'error');
      return;
    }

    this.retryCount++;
    const retryCountDisplay = this.overlay?.querySelector('#retryCountDisplay');
    if (retryCountDisplay) {
      retryCountDisplay.textContent = this.retryCount.toString();
    }

    const retryBtn = this.overlay?.querySelector('#errorRetryBtn') as HTMLButtonElement;
    const btnText = retryBtn?.querySelector('.btn-text');
    const btnSpinner = retryBtn?.querySelector('.btn-spinner');

    if (retryBtn) retryBtn.disabled = true;
    btnText?.classList.add('hidden');
    btnSpinner?.classList.remove('hidden');

    this.updateStatus(`Attempting to reconnect... (${this.retryCount}/${this.maxRetries})`, 'connecting');

    try {
      const success = await config.onRetry();
      
      if (success) {
        this.updateStatus('Connected!', 'connected');
        setTimeout(() => this.hide(), 1000);
      } else {
        this.updateStatus(`Connection failed. ${this.maxRetries - this.retryCount} attempts remaining.`, 'error');
      }
    } catch (error) {
      this.updateStatus('Connection attempt failed.', 'error');
    } finally {
      if (retryBtn) retryBtn.disabled = false;
      btnText?.classList.remove('hidden');
      btnSpinner?.classList.add('hidden');
    }
  }

  private updateStatus(message: string, state: 'connecting' | 'connected' | 'error' | 'disconnected'): void {
    const statusEl = this.overlay?.querySelector('#errorStatus');
    const indicator = this.overlay?.querySelector('#connectionIndicator');
    const statusText = this.overlay?.querySelector('#statusText');

    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `error-status ${state}`;
    }

    if (indicator) {
      indicator.className = `status-indicator ${state}`;
    }

    if (statusText) {
      const stateLabels = {
        connecting: 'Connecting...',
        connected: 'Connected',
        error: 'Error',
        disconnected: 'Disconnected',
      };
      statusText.textContent = stateLabels[state];
    }
  }

  hide(): void {
    if (!this.overlay) return;

    this.overlay.classList.remove('visible');
    this.overlay.classList.add('hiding');

    setTimeout(() => {
      this.removeOverlay();
      this.isVisible = false;
      this.currentConfig = null;
    }, 300);
  }

  private removeOverlay(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }

  isShowing(): boolean {
    return this.isVisible;
  }

  getCurrentType(): ErrorType | null {
    return this.currentConfig?.type || null;
  }
}

// Singleton export
export const errorOverlay = new ErrorOverlayManager();
