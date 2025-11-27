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

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    const token = storage.getAuthToken();
    if (!token) {
      console.error('No auth token found');
      return;
    }

    this.isIntentionallyClosed = false;
    const wsUrl = `${WS_URL}?token=${token}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.handleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.emit('ws:connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('ws:error', { error });
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this.emit('ws:disconnected', {});
      if (!this.isIntentionallyClosed) {
        this.handleReconnect();
      }
    };
  }

  private handleMessage(message: WSMessage): void {
    const { event, data } = message;
    
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

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
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
      console.log('Sent:', event, data);
    } else {
      console.error('WebSocket is not connected');
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
