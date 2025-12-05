import { WS_URL } from '../constants';
import { storage } from '../utils/storage';
import { errorOverlay } from '../components/error-overlay';

export interface WSMessage {
  event: string;
  data: any;
}

type MessageHandler = (message: WSMessage) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;
  private connectPromiseResolve: ((value: boolean) => void) | null = null;
  private hasShownDisconnectOverlay = false;
  private wasConnected = false;

  connect(): Promise<boolean> {
    return new Promise(async (resolve) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        resolve(true);
        return;
      }

      // Try to get valid token, refreshing if needed
      let token = storage.getValidAuthToken();
      
      if (!token) {
        // Try to refresh
        token = await storage.refreshAccessToken();
      }
      
      if (!token) {
        console.error('No valid auth token found - token may be expired');
        this.handleAuthFailure();
        resolve(false);
        return;
      }

      this.isIntentionallyClosed = false;
      this.connectPromiseResolve = resolve;
      const wsUrl = `${WS_URL}?token=${token}`;
      
      try {
        this.ws = new WebSocket(wsUrl);
        this.setupEventListeners();
      } catch (error) {
        console.error('WebSocket connection error:', error);
        this.connectPromiseResolve = null;
        this.showConnectionError();
        resolve(false);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.wasConnected = true;
      this.hasShownDisconnectOverlay = false;
      this.emit('ws:connected', {});
      
      // Hide error overlay if showing
      if (errorOverlay.isShowing() && errorOverlay.getCurrentType() === 'websocket') {
        errorOverlay.hide();
      }
      
      // Resolve the connect promise if pending
      if (this.connectPromiseResolve) {
        this.connectPromiseResolve(true);
        this.connectPromiseResolve = null;
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        console.log('WS received:', message.event, message.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('ws:error', { error });
      
      // Resolve the connect promise as failed if pending
      if (this.connectPromiseResolve) {
        this.connectPromiseResolve(false);
        this.connectPromiseResolve = null;
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected', event.code, event.reason);
      this.emit('ws:disconnected', { code: event.code, reason: event.reason });
      
      // Resolve the connect promise as failed if pending
      if (this.connectPromiseResolve) {
        this.connectPromiseResolve(false);
        this.connectPromiseResolve = null;
      }
      
      // Check if closed due to auth failure (code 4001 or 4003 are common for auth issues)
      // Also check if token is now expired
      if (event.code === 4001 || event.code === 4003 || storage.isTokenExpired()) {
        console.warn('WebSocket closed due to authentication failure');
        this.handleAuthFailure();
        return;
      }
      
      // Show disconnect overlay if this was an unexpected disconnect
      // and we were previously connected (not just a failed initial connection)
      if (!this.isIntentionallyClosed && this.wasConnected && !this.hasShownDisconnectOverlay) {
        this.showConnectionError();
      }
      
      if (!this.isIntentionallyClosed) {
        this.handleReconnect();
      }
    };
  }

  private handleMessage(message: WSMessage): void {
    const { event, data } = message;
    
    // Check for auth-related error messages
    if (event === 'error' && data?.code === 'AUTH_FAILED') {
      this.handleAuthFailure();
      return;
    }
    
    // Call specific event handlers
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
    
    // Call wildcard handlers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(handler => handler(message));
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.handlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler({ event, data }));
    }
  }

  private showConnectionError(): void {
    // Don't show if we intentionally disconnected or already showing
    if (this.isIntentionallyClosed) return;
    if (errorOverlay.isShowing()) return;
    
    this.hasShownDisconnectOverlay = true;
    
    errorOverlay.show({
      type: 'websocket',
      canRetry: true,
      onRetry: async () => {
        return await this.connect();
      },
      onDismiss: () => {
        this.hasShownDisconnectOverlay = false;
      },
    });
  }

  private handleAuthFailure(): void {
    console.warn('Authentication failed - clearing session and redirecting to login');
    this.isIntentionallyClosed = true;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent further reconnects
    
    // Clear auth data
    storage.clearAll();
    
    // Emit auth failure event
    this.emit('ws:auth-failed', {});
    
    // Show auth error overlay
    errorOverlay.show({
      type: 'auth',
      canRetry: false,
    });
    
    // Dispatch global auth:logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
  }

  private async handleReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    // Try to refresh token if expired
    let token = storage.getValidAuthToken();
    if (!token) {
      token = await storage.refreshAccessToken();
    }
    
    if (!token) {
      console.warn('Token expired and refresh failed, not attempting reconnect');
      this.handleAuthFailure();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  send(event: string, data: any = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = { event, data };
      this.ws.send(JSON.stringify(message));
      console.log('WS sent:', event, data);
    } else {
      console.error('WebSocket is not connected, cannot send:', event);
      // Show connection error if not already showing
      if (!errorOverlay.isShowing()) {
        this.showConnectionError();
      }
    }
  }

  on(eventName: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(eventName, handler);
    };
  }

  off(eventName: string, handler: MessageHandler): void {
    const handlers = this.handlers.get(eventName);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.handlers.delete(eventName);
      }
    }
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.hasShownDisconnectOverlay = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Get connection state for UI
  getConnectionState(): 'connected' | 'connecting' | 'disconnected' {
    if (!this.ws) return 'disconnected';
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      default:
        return 'disconnected';
    }
  }

  // Game-specific convenience methods
  joinMatchmaking(): void {
    this.send('game:join-matchmaking');
  }

  createPrivateGame(): void {
    this.send('game:create-private');
  }

  createAIGame(difficulty: string): void {
    this.send('game:create-ai', { difficulty });
  }

  createLocalGame(player1Name: string = 'Player 1', player2Name: string = 'Player 2'): void {
    this.send('game:create-local', { player1Name, player2Name });
  }

  leaveGame(): void {
    this.send('game:leave');
  }

  movePaddle(gameId: number, direction: number, playerNumber?: number): void {
    const data: any = { gameId, direction };
    if (playerNumber !== undefined) {
      data.playerNumber = playerNumber;
    }
    this.send('game:move', data);
  }
}

export const wsClient = new WebSocketClient();
