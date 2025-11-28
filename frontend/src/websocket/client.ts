import { WS_URL } from '../constants';
import { storage } from '../utils/storage';

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

  connect(): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        console.log('WebSocket already connected');
        resolve(true);
        return;
      }

      // Use getValidAuthToken to check expiration before connecting
      const token = storage.getValidAuthToken();
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
        resolve(false);
      }
    });
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('ws:connected', {});
      
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
      this.emit('ws:disconnected', {});
      
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

  private handleAuthFailure(): void {
    console.warn('Authentication failed - clearing session and redirecting to login');
    this.isIntentionallyClosed = true;
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent further reconnects
    
    // Clear auth data
    storage.clearAll();
    
    // Emit auth failure event
    this.emit('ws:auth-failed', {});
    
    // Dispatch global auth:logout event
    window.dispatchEvent(new CustomEvent('auth:logout'));
    
    // Redirect to login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    // Check token before attempting reconnect
    if (storage.isTokenExpired()) {
      console.warn('Token expired, not attempting reconnect');
      this.handleAuthFailure();
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      // Double-check token validity before reconnecting
      if (!storage.isTokenExpired()) {
        this.connect();
      } else {
        this.handleAuthFailure();
      }
    }, delay);
  }

  send(event: string, data: any = {}): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      const message = { event, data };
      this.ws.send(JSON.stringify(message));
      console.log('WS sent:', event, data);
    } else {
      console.error('WebSocket is not connected, cannot send:', event);
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
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
