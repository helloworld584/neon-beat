// ================================================================
// NEON BEAT – Game State Manager
// ================================================================

import { GAME_STATES } from './constants.js';
import { makeChart } from './chart.js';

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.gameState = GAME_STATES.LOADING;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
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
    this.speedMultiplierIdx = 1;   // default 1.0x
    // Chart timing offset in ms (persists across games, adjusted with [ / ] keys)
    this.chartOffset = 0;
    // ESC-to-menu confirmation
    this.escConfirm = false;
  }

  startGame(chart = null) {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    // Apply chartOffset to all notes (works for both detected and fallback charts)
    const base = chart || makeChart();
    const off = this.chartOffset;
    this.notes = off !== 0 ? base.map(n => ({ ...n, time: n.time + off })) : base;
    this.effects = [];
    this.judgeText = '';
    this.judgeT = 0;
    this.glitchT = 0;
    this.keyDown = [false, false, false, false];
    this.keyFlash = [0, 0, 0, 0];
    this.startTime = performance.now();
    this.songTime = 0;
    this.trackNameT = 2000;
    this.escConfirm = false;
    this.gameState = GAME_STATES.PLAYING;
  }

  updateTimers(dt) {
    this.bgRoad += dt * 0.44;
    this.bgSky += dt * 0.09;
    this.pulse += dt * 0.0022;
    
    for (let i = 0; i < 4; i++) {
      this.keyFlash[i] = Math.max(0, this.keyFlash[i] - dt);
    }
    
    this.judgeT = Math.max(0, this.judgeT - dt);
    this.glitchT = Math.max(0, this.glitchT - dt);
    this.trackNameT = Math.max(0, this.trackNameT - dt);
    this.effects = this.effects.filter(e => (e.t -= dt) > 0);
  }

  updateSongTime() {
    this.songTime = performance.now() - this.startTime;
  }
}

export const gameState = new GameState();
