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
    // Pointer events handle both touch and mouse cross-browser (including iOS/Android)
    this.canvas.addEventListener('pointerdown',  e => this._handlePointerDown(e),  { passive: false });
    this.canvas.addEventListener('pointerup',    e => this._handlePointerUp(e),    { passive: false });
    this.canvas.addEventListener('pointercancel',e => this._handlePointerUp(e),    { passive: false });
  }

  // ── Keyboard ───────────────────────────────────────────────────────
  _handleKeyDown(e) {
    if (e.repeat) return;

    if (gameState.escConfirm) {
      this._handleEscConfirmKey(e.key);
      return;
    }

    if (gameState.gameState === GAME_STATES.KEYBINDINGS) {
      this._handleKeyBindingsKey(e.key);
      return;
    }

    if (gameState.gameState === GAME_STATES.TITLE) {
      if (e.key.toLowerCase() === 's') {
        gameState.noteShape = gameState.noteShape === 'circle' ? 'rectangle' : 'circle';
        gameState.saveNoteShape();
        return;
      }
      if (e.key.toLowerCase() === 'k') {
        gameState.keybindingSlot = -1;
        gameState.gameState = GAME_STATES.KEYBINDINGS;
        return;
      }
    }

    if (gameState.gameState === GAME_STATES.MUSIC_SELECT) {
      this._handleMusicSelectKey(e.key);
      return;
    }

    if (gameState.gameState === GAME_STATES.SHOP) {
      this._handleShopKey(e.key);
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

    if (gameState.gameState === GAME_STATES.GAMEOVER) {
      if (e.key.toLowerCase() === 'r' || e.key === 'Enter') {
        musicPlayer.stop();
        gameState.enterShop();
      } else if (e.key === 'Escape') {
        musicPlayer.stop();
        gameState.clearRun();
        gameState.gameState = GAME_STATES.MUSIC_SELECT;
      }
      return;
    }

    const keyMap = gameState.getKeyMap();
    const lane = keyMap[e.key.toLowerCase()];
    if (lane !== undefined) this._onPress(lane);

    if (gameState.gameState === GAME_STATES.PLAYING && e.key.toLowerCase() === 'm') {
      gameState.isMuted = !gameState.isMuted;
      musicPlayer.setMuted(gameState.isMuted);
    }
  }

  _handleKeyUp(e) {
    const keyMap = gameState.getKeyMap();
    const lane = keyMap[e.key.toLowerCase()];
    if (lane !== undefined) {
      if (gameState.gameState === GAME_STATES.PLAYING) releaseLane(lane);
      gameState.keyDown[lane] = false;
    }
  }

  _handleKeyBindingsKey(key) {
    const slot = gameState.keybindingSlot;

    if (key === 'Escape') {
      if (slot >= 0) {
        gameState.keybindingSlot = -1;
      } else {
        gameState.gameState = GAME_STATES.TITLE;
      }
      return;
    }

    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
      gameState.keybindingSlot = slot <= 0 ? 3 : slot - 1;
      return;
    }
    if (key === 'ArrowDown' || key === 's' || key === 'S') {
      gameState.keybindingSlot = slot < 0 ? 0 : (slot + 1) % 4;
      return;
    }
    if (key === 'Enter') {
      if (slot < 0) gameState.keybindingSlot = 0;
      return;
    }

    // Any single printable char assigns to current slot
    if (slot >= 0 && key.length === 1) {
      gameState.keyBindings[slot] = key.toLowerCase();
      gameState.saveKeyBindings();
      gameState.keybindingSlot = -1;
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
      case 'Enter': this._enterShopFromSelect(); break;
      case 'Escape':
        musicPlayer.stopPreview();
        gameState.gameState = GAME_STATES.TITLE;
        break;
      case ' ': case 'p': case 'P':
        musicPlayer.preview(gameState.musicSelectCursor);
        break;
    }
  }

  _handleShopKey(key) {
    const items = gameState.shopItems;
    const n = items.length;
    switch (key) {
      case 'ArrowLeft': case 'a': case 'A':
        gameState.shopCursor = (gameState.shopCursor - 1 + n) % n;
        break;
      case 'ArrowRight': case 'd': case 'D':
        gameState.shopCursor = (gameState.shopCursor + 1) % n;
        break;
      case 'Enter': {
        const item = items[gameState.shopCursor];
        if (item) this._buyShopItem(item, gameState.shopCursor);
        break;
      }
      case 's': case 'S': case ' ':
        this._startGame();
        break;
      case 'Escape':
        gameState.clearRun();
        gameState.gameState = GAME_STATES.MUSIC_SELECT;
        break;
    }
  }

  _buyShopItem(item, idx) {
    if (item.purchased) return;
    if (gameState.hasModifier(item.id)) return;
    if (gameState.credits < item.cost) return;
    gameState.credits -= item.cost;
    gameState.currentRun.modifiers.push(item.id);
    gameState.shopItems[idx].purchased = true;
    gameState.saveCredits();
  }

  // ── Pointer (touch + mouse) ────────────────────────────────────────
  _handlePointerDown(e) {
    e.preventDefault();
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    try { e.target.setPointerCapture(e.pointerId); } catch (_) {}

    const rect   = this.canvas.getBoundingClientRect();
    const scaleX = GAME.W / rect.width;
    const scaleY = GAME.H / rect.height;
    const tx = (e.clientX - rect.left) * scaleX;
    const ty = (e.clientY - rect.top)  * scaleY;
    this._handleTouchPoint(tx, ty, e.pointerId);
  }

  _handlePointerUp(e) {
    e.preventDefault();
    const rect   = this.canvas.getBoundingClientRect();
    const scaleX = GAME.W / rect.width;
    const lane = this._touchLanes.get(e.pointerId)
      ?? Math.floor((e.clientX - rect.left) * scaleX / gameState.laneW);
    this._touchLanes.delete(e.pointerId);

    if (lane >= 0 && lane < gameState.laneCount) {
      if (gameState.gameState === GAME_STATES.PLAYING) releaseLane(lane);
      gameState.keyDown[lane] = false;
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

    // Game over buttons
    if (gameState.gameState === GAME_STATES.GAMEOVER) {
      // Coordinates must match renderGameOver() in renderer.js
      // scoreY = 120 + 5*48 + 28 = 388, gradeY = 468, divY = 540
      const retryBtnX = (GAME.W - 180) / 2, retryBtnY = 564, retryBtnW = 180, retryBtnH = 40;
      const menuBtnX  = (GAME.W - 130) / 2, menuBtnY  = 616, menuBtnW  = 130, menuBtnH  = 32;
      if (tx >= menuBtnX && tx < menuBtnX + menuBtnW && ty >= menuBtnY && ty < menuBtnY + menuBtnH) {
        musicPlayer.stop();
        gameState.clearRun();
        gameState.gameState = GAME_STATES.MUSIC_SELECT;
      } else if (tx >= retryBtnX && tx < retryBtnX + retryBtnW && ty >= retryBtnY && ty < retryBtnY + retryBtnH) {
        musicPlayer.stop();
        gameState.enterShop();
      }
      return;
    }

    // Shop touch handling
    if (gameState.gameState === GAME_STATES.SHOP) {
      this._handleShopTouch(tx, ty);
      return;
    }

    // Key bindings screen touch handling
    if (gameState.gameState === GAME_STATES.KEYBINDINGS) {
      // BACK button (top-left)
      if (ty <= 70 && tx <= 100) {
        gameState.keybindingSlot = -1;
        gameState.gameState = GAME_STATES.TITLE;
        return;
      }
      // Slot boxes: bx=240, bw=70, slotStartY=210, slotGap=80, bh=40
      const slotStartY = 210, slotGap = 80, bx = 240, bw = 70, bh = 40;
      for (let i = 0; i < 4; i++) {
        const cy = slotStartY + i * slotGap;
        if (tx >= bx && tx < bx + bw && ty >= cy - bh / 2 && ty < cy + bh / 2) {
          gameState.keybindingSlot = gameState.keybindingSlot === i ? -1 : i;
          return;
        }
      }
      return;
    }

    // Title screen utility buttons (NOTE SHAPE and KEYBINDS), y=656 h=26
    if (gameState.gameState === GAME_STATES.TITLE && ty >= 650 && ty < 688) {
      if (tx < GAME.W / 2) {
        gameState.noteShape = gameState.noteShape === 'circle' ? 'rectangle' : 'circle';
        gameState.saveNoteShape();
        return;
      } else {
        gameState.keybindingSlot = -1;
        gameState.gameState = GAME_STATES.KEYBINDINGS;
        return;
      }
    }

    // Lane tap → drives TITLE→SELECT, PLAYING hits
    const lane = Math.floor(tx / gameState.laneW);
    if (lane >= 0 && lane < gameState.laneCount) {
      this._touchLanes.set(id, lane);
      this._onPress(lane);
    }
  }

  _handleShopTouch(tx, ty) {
    // START button
    const btnW = 200, btnH = 38, btnX = (GAME.W - btnW) / 2, btnY = 770;
    if (tx >= btnX && tx < btnX + btnW && ty >= btnY && ty < btnY + btnH) {
      this._startGame();
      return;
    }

    // Item cards: pick 3 cards laid out the same as renderer
    const items  = gameState.shopItems;
    const nCards = items.length;
    if (nCards === 0) return;
    const cardW  = 110;
    const cardH  = 236;
    const gap    = (GAME.W - nCards * cardW) / (nCards + 1);
    const cardY  = 104;
    const buyH   = 28;

    for (let i = 0; i < nCards; i++) {
      const cx  = gap + i * (cardW + gap);
      if (tx < cx || tx >= cx + cardW || ty < cardY || ty >= cardY + cardH) continue;
      // Select card on any tap
      gameState.shopCursor = i;
      // BUY button area (bottom of card)
      const btnY2 = cardY + cardH - 44;
      if (ty >= btnY2 && ty < btnY2 + buyH) {
        const item = items[i];
        if (item) this._buyShopItem(item, i);
      }
      return;
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
          this._enterShopFromSelect(); // second tap on selected → shop
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
      this._enterShopFromSelect();
      return;
    }
  }

  // ── Shared helpers ─────────────────────────────────────────────────
  // Called from SHOP to actually start the game
  _startGame() {
    // If coming from MUSIC_SELECT, cursor is already set by _enterShopFromSelect
    musicPlayer.stop();
    gameState.startGame(null);
    musicPlayer.play(gameState.selectedTrack);
  }

  // Called from MUSIC_SELECT → goes to SHOP first
  _enterShopFromSelect() {
    const cursor = gameState.musicSelectCursor;
    gameState.selectedTrack = cursor;
    gameState.clearRun();
    musicPlayer.stopPreview();
    gameState.enterShop();
  }

  _onPress(lane) {
    if (gameState.escConfirm) return;

    if (gameState.gameState === GAME_STATES.TITLE) {
      musicPlayer.playBgm();
      gameState.gameState = GAME_STATES.MUSIC_SELECT;
      return;
    }

    if (gameState.gameState !== GAME_STATES.PLAYING) return;

    musicPlayer.resumeIfPending();
    gameState.keyDown[lane] = true;
    gameState.keyFlash[lane] = 200;
    this.onHitLane(lane);
  }
}
