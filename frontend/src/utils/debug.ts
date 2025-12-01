// Debug utilities for testing error states
// Usage: import { debugErrorOverlay } from './utils/debug' in browser console

import { errorOverlay, type ErrorType } from '../components/error-overlay';
import { wsClient } from '../websocket/client';

export const debugErrorOverlay = {
  // Show specific error types
  showWebSocketError: () => {
    errorOverlay.show({
      type: 'websocket',
      canRetry: true,
      onRetry: async () => {
        console.log('Retry clicked');
        // Simulate retry
        await new Promise(resolve => setTimeout(resolve, 1500));
        return wsClient.isConnected();
      },
    });
  },

  showNetworkError: () => {
    errorOverlay.show({
      type: 'network',
      canRetry: true,
      onRetry: async () => {
        console.log('Network retry clicked');
        await new Promise(resolve => setTimeout(resolve, 1500));
        return navigator.onLine;
      },
    });
  },

  showServerError: () => {
    errorOverlay.show({
      type: 'server',
      canRetry: true,
      onRetry: async () => {
        console.log('Server retry clicked');
        await new Promise(resolve => setTimeout(resolve, 1500));
        return false; // Simulate persistent failure
      },
    });
  },

  showAuthError: () => {
    errorOverlay.show({
      type: 'auth',
      canRetry: false,
    });
  },

  // Custom error
  showCustomError: (type: ErrorType, title: string, message: string) => {
    errorOverlay.show({
      type,
      title,
      message,
      canRetry: true,
      onRetry: async () => {
        await new Promise(resolve => setTimeout(resolve, 1500));
        return true;
      },
    });
  },

  // Hide overlay
  hide: () => {
    errorOverlay.hide();
  },

  // Check state
  isShowing: () => errorOverlay.isShowing(),
  getCurrentType: () => errorOverlay.getCurrentType(),

  // Simulate connection states
  simulateDisconnect: () => {
    console.log('Simulating WebSocket disconnect...');
    wsClient.disconnect();
  },

  simulateReconnect: () => {
    console.log('Attempting to reconnect...');
    return wsClient.connect();
  },
};

// Expose to window for console access in development
if (typeof window !== 'undefined') {
  (window as any).debugErrorOverlay = debugErrorOverlay;
  console.log('Debug utilities loaded. Access via window.debugErrorOverlay');
  console.log('Available commands:');
  console.log('  - debugErrorOverlay.showWebSocketError()');
  console.log('  - debugErrorOverlay.showNetworkError()');
  console.log('  - debugErrorOverlay.showServerError()');
  console.log('  - debugErrorOverlay.showAuthError()');
  console.log('  - debugErrorOverlay.hide()');
  console.log('  - debugErrorOverlay.simulateDisconnect()');
}

export default debugErrorOverlay;
