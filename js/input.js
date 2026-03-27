// ================================================================
// NEON BEAT – Input Handler
// ================================================================

import { GAME, INPUT, GAME_STATES, TRACKS } from './constants.js';
import { gameState } from './state.js';
import { musicPlayer } from './music.js';

export class InputHandler {
  constructor(canvas, onHitLane) {
    this.canvas = canvas;
    this.onHitLane = onHitLane;
    this.setupEventListeners();
  }

  setupEventListeners() {
    window.addEventListener('keydown', e => this.handleKeyDown(e));
    window.addEventListener('keyup', e => this.handleKeyUp(e));
    this.canvas.addEventListener('touchstart', e => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchend', e => this.handleTouchEnd(e));
  }

  handleKeyDown(e) {
    if (e.repeat) return;

    // Music select screen navigation
    if (gameState.gameState === GAME_STATES.MUSIC_SELECT) {
      this.handleMusicSelectKey(e.key);
      return;
    }

    const lane = INPUT.KEY_MAP[e.key.toLowerCase()];
    if (lane !== undefined) {
      this.onPress(lane);
    }

    // R on game over → back to title
    if (gameState.gameState === GAME_STATES.GAMEOVER && e.key.toLowerCase() === 'r') {
      musicPlayer.stop();
      gameState.gameState = GAME_STATES.TITLE;
    }

    // M during play → toggle mute
    if (gameState.gameState === GAME_STATES.PLAYING && e.key.toLowerCase() === 'm') {
      gameState.isMuted = !gameState.isMuted;
      musicPlayer.setMuted(gameState.isMuted);
    }
  }

  handleMusicSelectKey(key) {
    const count = TRACKS.length;
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        gameState.musicSelectCursor = (gameState.musicSelectCursor - 1 + count) % count;
        musicPlayer.stopPreview();
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        gameState.musicSelectCursor = (gameState.musicSelectCursor + 1) % count;
        musicPlayer.stopPreview();
        break;
      case 'Enter':
        gameState.selectedTrack = gameState.musicSelectCursor;
        musicPlayer.stop();
        gameState.startGame();
        musicPlayer.play(gameState.selectedTrack);
        break;
      case 'Escape':
        musicPlayer.stopPreview();
        gameState.gameState = GAME_STATES.TITLE;
        break;
      case ' ':
      case 'p':
      case 'P':
        musicPlayer.preview(gameState.musicSelectCursor);
        break;
    }
  }

  handleKeyUp(e) {
    const lane = INPUT.KEY_MAP[e.key.toLowerCase()];
    if (lane !== undefined) {
      gameState.keyDown[lane] = false;
    }
  }

  handleTouchStart(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = GAME.W / rect.width;
    const scaleY = GAME.H / rect.height;

    for (const touch of e.changedTouches) {
      const tx = (touch.clientX - rect.left) * scaleX;
      const ty = (touch.clientY - rect.top) * scaleY;

      // Mute button tap during play (top-left 8,8 → 58,32)
      if (gameState.gameState === GAME_STATES.PLAYING &&
          tx >= 8 && tx <= 58 && ty >= 8 && ty <= 32) {
        gameState.isMuted = !gameState.isMuted;
        musicPlayer.setMuted(gameState.isMuted);
        return;
      }

      const lane = Math.floor(tx / GAME.LANE_W);
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
        gameState.keyDown[lane] = false;
      }
    }
  }

  onPress(lane) {
    if (gameState.gameState === GAME_STATES.TITLE) {
      gameState.gameState = GAME_STATES.MUSIC_SELECT;
      return;
    }

    if (gameState.gameState === GAME_STATES.GAMEOVER) {
      musicPlayer.stop();
      gameState.gameState = GAME_STATES.TITLE;
      return;
    }

    if (gameState.gameState !== GAME_STATES.PLAYING) return;

    gameState.keyDown[lane] = true;
    gameState.keyFlash[lane] = 200;
    this.onHitLane(lane);
  }
}
