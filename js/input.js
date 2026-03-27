// ================================================================
// NEON BEAT – Input Handler
// ================================================================

import { INPUT, GAME_STATES } from './constants.js';
import { gameState } from './state.js';

export class InputHandler {
  constructor(canvas, onHitLane) {
    this.canvas = canvas;
    this.onHitLane = onHitLane;
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Keyboard events
    window.addEventListener('keydown', e => this.handleKeyDown(e));
    window.addEventListener('keyup', e => this.handleKeyUp(e));
    
    // Touch events
    this.canvas.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchend', e => this.handleTouchEnd(e));
  }

  handleKeyDown(e) {
    if (e.repeat) return;
    
    const lane = INPUT.KEY_MAP[e.key.toLowerCase()];
    if (lane !== undefined) {
      this.onPress(lane);
    }
    
    if (gameState.gameState === GAME_STATES.GAMEOVER && e.key.toLowerCase() === 'r') {
      gameState.startGame();
    }
  }

  handleKeyUp(e) {
    const lane = INPUT.KEY_MAP[e.key.toLowerCase()];
    if (lane !== undefined) {
      this.onRelease(lane);
    }
  }

  handleTouchStart(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = GAME.W / rect.width;
    
    for (const touch of e.changedTouches) {
      const lane = Math.floor((touch.clientX - rect.left) * scaleX / GAME.LANE_W);
      if (lane >= 0 && lane < 4) {
        this.onPress(lane);
      }
    }
  }

  handleTouchEnd(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = GAME.W / rect.width;
    
    for (const touch of e.changedTouches) {
      const lane = Math.floor((touch.clientX - rect.left) * scaleX / GAME.LANE_W);
      if (lane >= 0 && lane < 4) {
        this.onRelease(lane);
      }
    }
  }

  onPress(lane) {
    if (gameState.gameState === GAME_STATES.TITLE || gameState.gameState === GAME_STATES.GAMEOVER) {
      gameState.startGame();
      return;
    }
    
    if (gameState.gameState !== GAME_STATES.PLAYING) return;
    
    gameState.keyDown[lane] = true;
    gameState.keyFlash[lane] = 200;
    this.onHitLane(lane);
  }

  onRelease(lane) {
    gameState.keyDown[lane] = false;
  }
}
