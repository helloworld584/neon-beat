// ================================================================
// NEON BEAT – Input Handler
// ================================================================

import { GAME, INPUT, GAME_STATES, TRACKS, SPEED_MULTIPLIERS } from './constants.js';
import { gameState } from './state.js';
import { musicPlayer } from './music.js';
import { releaseLane } from './game.js';

// Music-select layout constants (must match renderer.js)
const MS = {
  CARD_X:   25,   // px + 10
  CARD_W:   340,  // pw - 20
  START_Y:  116,  // py + 58
  CARD_H:   77,
  SEL_Y:    671,  // START_Y + TRACKS.length * CARD_H + 16
  OPT_W:    58,
  OPT_H:    26,
  OPT_GAP:  8,
  get OPT_TOTAL_W() { return SPEED_MULTIPLIERS.length * this.OPT_W + (SPEED_MULTIPLIERS.length - 1) * this.OPT_GAP; },
  get OPT_X0()      { return (GAME.W - this.OPT_TOTAL_W) / 2; },
  get OPT_Y()       { return this.SEL_Y + 14; },
  // START button below the panel
  BTN_W: 200, BTN_H: 36, BTN_Y: 793,
  get BTN_X()  { return (GAME.W - this.BTN_W) / 2; },
};

export class InputHandler {
  constructor(canvas, onHitLane) {
    this.canvas    = canvas;
    this.onHitLane = onHitLane;
    // Map touchIdentifier → lane pressed, so release always lifts the right lane
    this._touchLanes = new Map();
    this._setupEventListeners();
  }

  _setupEventListeners() {
    window.addEventListener('keydown', e => this._handleKeyDown(e));
    window.addEventListener('keyup',   e => this._handleKeyUp(e));
    this.canvas.addEventListener('touchstart',  e => this._handleTouchStart(e),  { passive: false });
    this.canvas.addEventListener('touchend',    e => this._handleTouchEnd(e),    { passive: false });
    this.canvas.addEventListener('touchcancel', e => this._handleTouchEnd(e),    { passive: false });
  }

  // ── Keyboard ───────────────────────────────────────────────────────
  _handleKeyDown(e) {
    if (e.repeat) return;

    if (gameState.escConfirm) {
      this._handleEscConfirmKey(e.key);
      return;
    }

    if (gameState.gameState === GAME_STATES.MUSIC_SELECT) {
      this._handleMusicSelectKey(e.key);
      return;
    }

    if (gameState.gameState === GAME_STATES.PLAYING && e.key === 'Escape') {
      gameState.escConfirm = true;
      musicPlayer.pause();
      return;
    }

    if (gameState.gameState === GAME_STATES.PLAYING) {
      if (e.key === '[') { gameState.chartOffset -= 10; gameState.startTime -= 10; return; }
      if (e.key === ']') { gameState.chartOffset += 10; gameState.startTime += 10; return; }
    }

    const lane = INPUT.KEY_MAP[e.key.toLowerCase()];
    if (lane !== undefined) this._onPress(lane);

    if (gameState.gameState === GAME_STATES.GAMEOVER && e.key.toLowerCase() === 'r') {
      musicPlayer.stop();
      gameState.gameState = GAME_STATES.TITLE;
    }

    if (gameState.gameState === GAME_STATES.PLAYING && e.key.toLowerCase() === 'm') {
      gameState.isMuted = !gameState.isMuted;
      musicPlayer.setMuted(gameState.isMuted);
    }
  }

  _handleKeyUp(e) {
    const lane = INPUT.KEY_MAP[e.key.toLowerCase()];
    if (lane !== undefined) {
      if (gameState.gameState === GAME_STATES.PLAYING) releaseLane(lane);
      gameState.keyDown[lane] = false;
    }
  }

  _handleEscConfirmKey(key) {
    if (key === 'y' || key === 'Y' || key === 'Enter') {
      gameState.escConfirm = false;
      musicPlayer.stop();
      gameState.gameState = GAME_STATES.TITLE;
    } else if (key === 'n' || key === 'N' || key === 'Escape') {
      gameState.escConfirm = false;
      musicPlayer.resume();
    }
  }

  _handleMusicSelectKey(key) {
    const count = TRACKS.length;
    switch (key) {
      case 'ArrowUp': case 'w': case 'W':
        gameState.musicSelectCursor = (gameState.musicSelectCursor - 1 + count) % count;
        musicPlayer.stopPreview();
        break;
      case 'ArrowDown': case 's': case 'S':
        gameState.musicSelectCursor = (gameState.musicSelectCursor + 1) % count;
        musicPlayer.stopPreview();
        break;
      case 'ArrowLeft':
        gameState.speedMultiplierIdx =
          (gameState.speedMultiplierIdx - 1 + SPEED_MULTIPLIERS.length) % SPEED_MULTIPLIERS.length;
        break;
      case 'ArrowRight':
        gameState.speedMultiplierIdx =
          (gameState.speedMultiplierIdx + 1) % SPEED_MULTIPLIERS.length;
        break;
      case '[': gameState.chartOffset -= 10; break;
      case ']': gameState.chartOffset += 10; break;
      case 'Enter': this._startGame(); break;
      case 'Escape':
        musicPlayer.stopPreview();
        gameState.gameState = GAME_STATES.TITLE;
        break;
      case ' ': case 'p': case 'P':
        musicPlayer.preview(gameState.musicSelectCursor);
        break;
    }
  }

  // ── Touch ──────────────────────────────────────────────────────────
  _handleTouchStart(e) {
    e.preventDefault();
    const rect   = this.canvas.getBoundingClientRect();
    const scaleX = GAME.W / rect.width;
    const scaleY = GAME.H / rect.height;

    for (const touch of e.changedTouches) {
      const tx = (touch.clientX - rect.left) * scaleX;
      const ty = (touch.clientY - rect.top)  * scaleY;
      this._handleTouchPoint(tx, ty, touch.identifier);
    }
  }

  _handleTouchEnd(e) {
    e.preventDefault();
    const rect   = this.canvas.getBoundingClientRect();
    const scaleX = GAME.W / rect.width;

    for (const touch of e.changedTouches) {
      // Use tracked lane (safe if finger slid to another lane)
      const lane = this._touchLanes.get(touch.identifier)
        ?? Math.floor((touch.clientX - rect.left) * scaleX / GAME.LANE_W);
      this._touchLanes.delete(touch.identifier);

      if (lane >= 0 && lane < 4) {
        if (gameState.gameState === GAME_STATES.PLAYING) releaseLane(lane);
        gameState.keyDown[lane] = false;
      }
    }
  }

  _handleTouchPoint(tx, ty, id) {
    // ESC confirm overlay: upper half = YES, lower half = NO
    if (gameState.escConfirm) {
      if (ty < GAME.H / 2) {
        gameState.escConfirm = false;
        musicPlayer.stop();
        gameState.gameState = GAME_STATES.TITLE;
      } else {
        gameState.escConfirm = false;
        musicPlayer.resume();
      }
      return;
    }

    // Music select full touch handling
    if (gameState.gameState === GAME_STATES.MUSIC_SELECT) {
      this._handleMusicSelectTouch(tx, ty);
      return;
    }

    // Gameplay overlay buttons
    if (gameState.gameState === GAME_STATES.PLAYING) {
      // Mute (top-left)
      if (tx >= 8 && tx <= 58 && ty >= 8 && ty <= 32) {
        gameState.isMuted = !gameState.isMuted;
        musicPlayer.setMuted(gameState.isMuted);
        return;
      }
      // Menu/back (top-right)
      if (tx >= 332 && tx <= 382 && ty >= 8 && ty <= 32) {
        gameState.escConfirm = true;
        musicPlayer.pause();
        return;
      }
    }

    // Lane tap → drives TITLE→SELECT, GAMEOVER→TITLE, PLAYING hits
    const lane = Math.floor(tx / GAME.LANE_W);
    if (lane >= 0 && lane < 4) {
      this._touchLanes.set(id, lane);
      this._onPress(lane);
    }
  }

  _handleMusicSelectTouch(tx, ty) {
    // Back button (top strip above panel, left side)
    if (ty <= 55 && tx <= 90) {
      musicPlayer.stopPreview();
      gameState.gameState = GAME_STATES.TITLE;
      return;
    }

    // Track cards
    for (let i = 0; i < TRACKS.length; i++) {
      const cardY = MS.START_Y + i * MS.CARD_H;
      if (tx >= MS.CARD_X && tx < MS.CARD_X + MS.CARD_W &&
          ty >= cardY      && ty < cardY + MS.CARD_H) {
        if (gameState.musicSelectCursor === i) {
          this._startGame();          // second tap on selected → play
        } else {
          gameState.musicSelectCursor = i;
          musicPlayer.stopPreview();
        }
        return;
      }
    }

    // Speed pills
    for (let i = 0; i < SPEED_MULTIPLIERS.length; i++) {
      const ox = MS.OPT_X0 + i * (MS.OPT_W + MS.OPT_GAP);
      if (tx >= ox && tx < ox + MS.OPT_W && ty >= MS.OPT_Y && ty < MS.OPT_Y + MS.OPT_H) {
        gameState.speedMultiplierIdx = i;
        return;
      }
    }

    // START button (below panel)
    if (tx >= MS.BTN_X && tx < MS.BTN_X + MS.BTN_W &&
        ty >= MS.BTN_Y && ty < MS.BTN_Y + MS.BTN_H) {
      this._startGame();
      return;
    }
  }

  // ── Shared helpers ─────────────────────────────────────────────────
  _startGame() {
    const cursor = gameState.musicSelectCursor;
    gameState.selectedTrack = cursor;
    musicPlayer.stop();
    gameState.startGame(null);
    musicPlayer.play(cursor);
  }

  _onPress(lane) {
    if (gameState.escConfirm) return;

    if (gameState.gameState === GAME_STATES.TITLE) {
      musicPlayer.playBgm();
      gameState.gameState = GAME_STATES.MUSIC_SELECT;
      return;
    }

    if (gameState.gameState === GAME_STATES.GAMEOVER) {
      musicPlayer.stop();
      gameState.gameState = GAME_STATES.TITLE;
      return;
    }

    if (gameState.gameState !== GAME_STATES.PLAYING) return;

    musicPlayer.resumeIfPending();
    gameState.keyDown[lane] = true;
    gameState.keyFlash[lane] = 200;
    this.onHitLane(lane);
  }
}
