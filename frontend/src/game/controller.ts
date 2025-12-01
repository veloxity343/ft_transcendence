import { KEYBOARD } from './constants';

export type PaddleDirection = 'up' | 'down' | 'stop';

export class GameController {
  private keys: Set<string> = new Set();
  private onPaddleMove: ((direction: PaddleDirection) => void) | null = null;
  private currentDirection: PaddleDirection = 'stop';

  constructor() {
    this.setupKeyboardListeners();
  }

  private setupKeyboardListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      this.updatePaddleDirection();
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.updatePaddleDirection();
    });
  }

  private updatePaddleDirection(): void {
    let newDirection: PaddleDirection = 'stop';

    // Check for up movement (W or Arrow Up)
    if (this.keys.has(KEYBOARD.W) || this.keys.has(KEYBOARD.ARROW_UP)) {
      newDirection = 'up';
    }
    // Check for down movement (S or Arrow Down)
    else if (this.keys.has(KEYBOARD.S) || this.keys.has(KEYBOARD.ARROW_DOWN)) {
      newDirection = 'down';
    }

    // Only trigger callback if direction changed
    if (newDirection !== this.currentDirection) {
      this.currentDirection = newDirection;
      if (this.onPaddleMove) {
        this.onPaddleMove(newDirection);
      }
    }
  }

  setPaddleMoveHandler(handler: (direction: PaddleDirection) => void): void {
    this.onPaddleMove = handler;
  }

  getCurrentDirection(): PaddleDirection {
    return this.currentDirection;
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  reset(): void {
    this.keys.clear();
    this.currentDirection = 'stop';
  }

  destroy(): void {
    this.keys.clear();
    this.onPaddleMove = null;
  }
}
