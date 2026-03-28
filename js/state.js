// ================================================================
// NEON BEAT – Game State Manager
// ================================================================

import { GAME, GAME_STATES, SHOP_ITEMS } from './constants.js';
import { makeChart } from './chart.js';

class GameState {
  constructor() {
    // Credits persist across sessions via localStorage
    this.credits = parseInt(localStorage.getItem('neonbeat_credits') || '0', 10);
    // Run-level state (persists across SHOP→GAME cycles until MUSIC_SELECT)
    this.currentRun = { modifiers: [] };
    this.shopItems   = [];  // 3 items shown in shop
    this.shopCursor  = 0;   // selected shop card (0-2)
    this.reset();
  }

  // ── Computed lane geometry (depends on active modifiers) ──────────
  get laneCount() { return this.hasModifier('double_lane') ? 6 : 4; }
  get laneW()     { return GAME.W / this.laneCount; }
  get noteW()     { return this.laneW - 12; }

  hasModifier(id) { return this.currentRun.modifiers.includes(id); }

  saveCredits() {
    localStorage.setItem('neonbeat_credits', String(this.credits));
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

    this.judgeT     = Math.max(0, this.judgeT     - dt);
    this.glitchT    = Math.max(0, this.glitchT    - dt);
    this.trackNameT = Math.max(0, this.trackNameT - dt);
    this.effects    = this.effects.filter(e => (e.t -= dt) > 0);
  }

  updateSongTime() {
    this.songTime = performance.now() - this.startTime;
  }
}

export const gameState = new GameState();
