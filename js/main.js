// ================================================================
// NEON BEAT – Main Game Loop and Initialization
// ================================================================

import { GAME, GAME_STATES } from './constants.js';
import { loadAssets } from './assets.js';
import { gameState } from './state.js';
import { InputHandler } from './input.js';
import { hitLane, update } from './game.js';
import { Renderer } from './renderer.js';
import { musicPlayer } from './music.js';

// roundRect polyfill (Safari < 15.4)
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
    return this;
  };
}

class NeonBeatGame {
  constructor() {
    this.canvas = document.getElementById('c');
    this.ctx = this.canvas.getContext('2d');
    
    // Offscreen buffer for rendering
    this.offCanvas = document.createElement('canvas');
    this.offCanvas.width = GAME.W;
    this.offCanvas.height = GAME.H;
    this.offCtx = this.offCanvas.getContext('2d');
    
    this.renderer = new Renderer(this.ctx, this.offCtx, this.offCanvas);
    this.inputHandler = new InputHandler(this.canvas, hitLane);
    this.lastTimestamp = 0;
  }

  async init() {
    await loadAssets();
    musicPlayer.init();
    gameState.gameState = GAME_STATES.TITLE;
    this.startGameLoop();
  }

  startGameLoop() {
    const loop = (timestamp) => {
      const deltaTime = Math.min(timestamp - this.lastTimestamp, 50);
      this.lastTimestamp = timestamp;

      // Update timers
      gameState.updateTimers(deltaTime);

      // Update game logic
      if (gameState.gameState === GAME_STATES.PLAYING) {
        update(deltaTime);
      }

      // Render
      this.renderer.render();

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(ts => {
      this.lastTimestamp = ts;
      loop(ts);
    });
  }
}

// Initialize game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const game = new NeonBeatGame();
  game.init();
});
