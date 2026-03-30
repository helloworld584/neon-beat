// ================================================================
// NEON BEAT – Game State Manager
// ================================================================

import { GAME, GAME_STATES, SHOP_ITEMS, NOTE_SPEED_LEVELS, JUDGMENT_LINE_LEVELS } from './constants.js';
import { makeChart } from './chart.js';

class GameState {
  constructor() {
    // Credits persist across sessions via localStorage
    this.credits = parseInt(localStorage.getItem('neonbeat_credits') || '0', 10);
    // Run-level state (persists across SHOP→GAME cycles until MUSIC_SELECT)
    this.currentRun = { modifiers: [] };
    this.shopItems   = [];  // 3 items shown in shop
    this.shopCursor  = 0;   // selected shop card (0-2)
    // Note shape ('rectangle' | 'circle'), persisted
    this.noteShape = localStorage.getItem('neonbeat_note_shape') || 'rectangle';
    // Note speed index into NOTE_SPEED_LEVELS, persisted
    this.noteSpeedIdx = parseInt(localStorage.getItem('neonbeat_note_speed_idx') || '2', 10);
    this.noteSpeedChangeT = 0;  // HUD flash timer (ms)
    // Judgment line position as fraction of canvas height, persisted
    const savedJL = parseFloat(localStorage.getItem('neonbeat_judgment_line_y'));
    this.judgmentLineY = JUDGMENT_LINE_LEVELS.includes(savedJL) ? savedJL : GAME.JUDGMENT_LINE_Y;
    // Key bindings: { [laneIndex]: 'key_char' }, persisted
    this.keyBindings = (() => {
      try { return JSON.parse(localStorage.getItem('neonbeat_keybindings')) || null; }
      catch { return null; }
    })() || { 0: 'd', 1: 'f', 2: 'j', 3: 'k' };
    this.keybindingSlot = -1;  // lane being reassigned (-1 = none)
    this.reset();
  }

  // ── Computed lane geometry (depends on active modifiers) ──────────
  get laneCount() { return this.hasModifier('double_lane') ? 6 : 4; }
  get laneW()     { return GAME.W / this.laneCount; }
  get noteW()     { return this.laneW - 12; }

  // ── Dynamic judgment line & note speed ───────────────────────────
  get hitY()     { return Math.round(GAME.H * this.judgmentLineY); }
  get baseSpd()  { return (this.hitY - GAME.SPAWN_Y) / GAME.LEAD_MS; }
  get noteSpeed(){ return NOTE_SPEED_LEVELS[this.noteSpeedIdx] ?? 1.0; }

  hasModifier(id) { return this.currentRun.modifiers.includes(id); }

  saveCredits() {
    localStorage.setItem('neonbeat_credits', String(this.credits));
  }

  saveNoteShape() {
    localStorage.setItem('neonbeat_note_shape', this.noteShape);
  }

  saveNoteSpeed() {
    localStorage.setItem('neonbeat_note_speed_idx', String(this.noteSpeedIdx));
  }

  saveJudgmentLine() {
    localStorage.setItem('neonbeat_judgment_line_y', String(this.judgmentLineY));
  }

  saveKeyBindings() {
    localStorage.setItem('neonbeat_keybindings', JSON.stringify(this.keyBindings));
  }

  // Build { key_char: laneIndex } map from current bindings
  getKeyMap() {
    const defaults6 = { 0: 'd', 1: 'f', 2: 'g', 3: 'h', 4: 'j', 5: 'k' };
    const map = {};
    for (let i = 0; i < this.laneCount; i++) {
      const k = this.keyBindings[i] ?? defaults6[i] ?? String(i);
      map[k] = i;
    }
    return map;
  }

  // Returns uppercase display label for a lane
  getKeyLabel(lane) {
    const defaults = { 0: 'd', 1: 'f', 2: 'j', 3: 'k', 4: 'g', 5: 'h' };
    return (this.keyBindings[lane] ?? defaults[lane] ?? '?').toUpperCase();
  }

  // Pick 3 random shop items not already owned this run
  enterShop() {
    const owned = new Set(this.currentRun.modifiers);
    const available = SHOP_ITEMS.filter(item => !owned.has(item.id));
    // Shuffle and take 3 (or fewer if pool is small)
    const shuffled = available.slice().sort(() => Math.random() - 0.5);
    this.shopItems = shuffled.slice(0, 3).map(item => ({ ...item, purchased: false }));
    this.shopCursor = 0;
    this.gameState = GAME_STATES.SHOP;
  }

  clearRun() {
    this.currentRun = { modifiers: [] };
  }

  reset() {
    this.gameState = GAME_STATES.LOADING;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.allPerfect = true;
    this.notes = [];
    this.effects = [];
    this.startTime = 0;
    this.songTime = 0;
    this.bgRoad = 0;
    this.bgSky = 0;
    this.glitchT = 0;
    this.glitchStr = 0;
    this.judgeText = '';
    this.judgeT = 0;
    this.keyDown = [false, false, false, false];
    this.keyFlash = [0, 0, 0, 0];
    this.pulse = 0;
    // Music state
    this.musicSelectCursor = 0;
    this.selectedTrack = 0;
    this.isMuted = false;
    this.trackNameT = 0;
    // Speed multiplier index (persists across games)
    this.speedMultiplierIdx = 1;
    // Chart timing offset in ms
    this.chartOffset = 0;
    // ESC-to-menu confirmation
    this.escConfirm = false;
  }

  startGame(chart = null) {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.allPerfect = true;
    this.perfectCount = 0;
    this.goodCount    = 0;
    this.missCount    = 0;

    // Build base chart and apply timing offset
    const base = chart || makeChart();
    const off  = this.chartOffset;
    let notes  = off !== 0 ? base.map(n => ({ ...n, time: n.time + off })) : base.slice();

    // ── Apply lane modifiers ─────────────────────────────────────────
    // double_lane: remap 4 lanes → 6 lanes (outer 4 of 6: 0,2,3,5)
    if (this.hasModifier('double_lane')) {
      const remap = [0, 2, 3, 5];
      notes = notes.map(n => ({ ...n, lane: remap[n.lane] }));
    }
    // mirror: flip lanes
    if (this.hasModifier('mirror')) {
      const lc = this.laneCount;
      notes = notes.map(n => ({ ...n, lane: lc - 1 - n.lane }));
    }

    this.notes = notes;
    this.effects = [];
    this.judgeText = '';
    this.judgeT = 0;
    this.glitchT = 0;
    this.keyDown  = new Array(this.laneCount).fill(false);
    this.keyFlash = new Array(this.laneCount).fill(0);
    this.startTime = performance.now();
    this.songTime = 0;
    this.trackNameT = 2000;
    this.escConfirm = false;
    this.gameState = GAME_STATES.PLAYING;
  }

  updateTimers(dt) {
    this.bgRoad += dt * 0.44;
    this.bgSky  += dt * 0.09;
    this.pulse  += dt * 0.0022;

    for (let i = 0; i < this.keyDown.length; i++) {
      this.keyFlash[i] = Math.max(0, this.keyFlash[i] - dt);
    }

    this.judgeT          = Math.max(0, this.judgeT          - dt);
    this.glitchT         = Math.max(0, this.glitchT         - dt);
    this.noteSpeedChangeT = Math.max(0, this.noteSpeedChangeT - dt);
    this.trackNameT = Math.max(0, this.trackNameT - dt);
    this.effects    = this.effects.filter(e => (e.t -= dt) > 0);
  }

  updateSongTime() {
    this.songTime = performance.now() - this.startTime;
  }
}

export const gameState = new GameState();
