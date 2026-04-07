// ================================================================
// NEON BEAT – Game State Manager
// ================================================================

import { GAME, GAME_STATES, SHOP_ITEMS, NOTE_SPEED_LEVELS, JUDGMENT_LINE_LEVELS, TRACKS } from './constants.js';
import { THEMES, THEME_ORDER } from './themes.js';
import { makeChart, makeThemeChart } from './chart.js';

class GameState {
  constructor() {
    // Credits persist across sessions via localStorage
    this.credits = parseInt(localStorage.getItem('neonbeat_credits') || '0', 10);
    this.currentRun = { modifiers: [] };
    this.shopItems   = [];
    this.shopCursor  = 0;
    this.noteShape = localStorage.getItem('neonbeat_note_shape') || 'rectangle';
    this.noteSpeedIdx = parseInt(localStorage.getItem('neonbeat_note_speed_idx') || '2', 10);
    this.noteSpeedChangeT = 0;
    const savedJL = parseFloat(localStorage.getItem('neonbeat_judgment_line_y'));
    this.judgmentLineY = JUDGMENT_LINE_LEVELS.includes(savedJL) ? savedJL : GAME.JUDGMENT_LINE_Y;
    this.keyBindings = (() => {
      try { return JSON.parse(localStorage.getItem('neonbeat_keybindings')) || null; }
      catch { return null; }
    })() || { 0: 'd', 1: 'f', 2: 'j', 3: 'k' };
    this.keybindingSlot = -1;

    // ── Theme state ───────────────────────────────────────────────
    this.activeTheme = localStorage.getItem('neonbeat_active_theme') || 'cyber';
    this.unlockedThemes = (() => {
      try { return JSON.parse(localStorage.getItem('neonbeat_unlocked_themes')) || ['cyber']; }
      catch { return ['cyber']; }
    })();
    this.themeCursor = THEME_ORDER.indexOf(this.activeTheme);
    if (this.themeCursor < 0) this.themeCursor = 0;

    // ── Gimmick state (reset on startGame) ───────────────────────
    this.gimmickTimer         = 0;
    this.currentShiftOffset   = 0;
    this.currentShifting      = false;
    this.currentShiftAnimT    = 0;
    this.currentShiftLerp     = 0;
    this.currentShiftDir      = 1;
    this.currentWarningActive = false;
    this.currentWarningT      = 0;
    this.windDirection        = 1;
    this.windTimer            = 0;
    this.petalParticles       = [];
    this.trunkHitCount        = 0;

    // ── Ambient rising particles (always visible) ─────────────────
    this.ambientParticles = [];
    this._initAmbientParticles();

    this.reset();
  }

  _initAmbientParticles() {
    // Spawn initial ambient particles across the screen
    this.ambientParticles = [];
    for (let i = 0; i < 35; i++) {
      this.ambientParticles.push(this._createAmbientParticle(true));
    }
  }

  _createAmbientParticle(randomY = false) {
    const isCyan = Math.random() < 0.5;
    return {
      x: Math.random() * GAME.W,
      y: randomY ? Math.random() * GAME.H : GAME.H + 20,
      vx: (Math.random() - 0.5) * 0.015,
      vy: -(0.02 + Math.random() * 0.04), // Rise upward
      size: 1.5 + Math.random() * 3,
      alpha: 0.2 + Math.random() * 0.5,
      color: isCyan ? '#00FFFF' : '#FF00FF',
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.001 + Math.random() * 0.002,
    };
  }

  updateAmbientParticles(dt) {
    for (const p of this.ambientParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.pulse += p.pulseSpeed * dt;
      
      // Slight horizontal drift
      p.x += Math.sin(p.pulse) * 0.003 * dt;
    }
    
    // Remove particles that went off screen and spawn new ones
    this.ambientParticles = this.ambientParticles.filter(p => p.y > -20);
    
    // Maintain particle count
    while (this.ambientParticles.length < 35) {
      this.ambientParticles.push(this._createAmbientParticle(false));
    }
  }

  // ── Theme helpers ─────────────────────────────────────────────
  getTheme() {
    return THEMES[this.activeTheme] || THEMES.cyber;
  }

  getLaneColor(lane) {
    const cols = this.getTheme().colors.note;
    return cols[lane % cols.length];
  }

  getThemeColor(key) {
    return this.getTheme().colors[key] || '#00ffff';
  }

  getThemeTrackIndices() {
    const bases = this.getTheme().musicList.map(p => p.split('/').pop());
    return TRACKS.reduce((acc, t, i) => {
      if (bases.includes(t.file.replace('.mp3', ''))) acc.push(i);
      return acc;
    }, []);
  }

  saveActiveTheme()   { localStorage.setItem('neonbeat_active_theme',    this.activeTheme); }
  saveUnlockedThemes(){ localStorage.setItem('neonbeat_unlocked_themes', JSON.stringify(this.unlockedThemes)); }

  unlockTheme(key) {
    if (!this.unlockedThemes.includes(key)) {
      this.unlockedThemes.push(key);
      this.saveUnlockedThemes();
      return true;
    }
    return false;
  }

  checkUnlocks() {
    let any = false;
    if (this.allPerfect)       any = this.unlockTheme('forest') || any;
    if (this.credits >= 1000)  any = this.unlockTheme('ocean')  || any;
    if (this.maxCombo >= 200)  any = this.unlockTheme('void')   || any;
    if (this.credits >= 500)   any = this.unlockTheme('spring') || any;
    return any;
  }

  // ── Computed lane geometry ────────────────────────────────────
  get laneCount() { return this.hasModifier('double_lane') ? 6 : 4; }
  get laneW()     { return GAME.W / this.laneCount; }
  get noteW()     { return this.laneW - 12; }
  get hitY()      { return Math.round(GAME.H * this.judgmentLineY); }
  get baseSpd()   { return (this.hitY - GAME.SPAWN_Y) / GAME.LEAD_MS; }
  get noteSpeed() { return NOTE_SPEED_LEVELS[this.noteSpeedIdx] ?? 1.0; }

  hasModifier(id) { return this.currentRun.modifiers.includes(id); }

  saveCredits()     { localStorage.setItem('neonbeat_credits',         String(this.credits)); }
  saveNoteShape()   { localStorage.setItem('neonbeat_note_shape',      this.noteShape); }
  saveNoteSpeed()   { localStorage.setItem('neonbeat_note_speed_idx',  String(this.noteSpeedIdx)); }
  saveJudgmentLine(){ localStorage.setItem('neonbeat_judgment_line_y', String(this.judgmentLineY)); }
  saveKeyBindings() { localStorage.setItem('neonbeat_keybindings',     JSON.stringify(this.keyBindings)); }

  getKeyMap() {
    const defaults6 = { 0: 'd', 1: 'f', 2: 'g', 3: 'h', 4: 'j', 5: 'k' };
    const map = {};
    for (let i = 0; i < this.laneCount; i++) {
      const k = this.keyBindings[i] ?? defaults6[i] ?? String(i);
      map[k] = i;
    }
    return map;
  }

  getKeyLabel(lane) {
    const defaults = { 0: 'd', 1: 'f', 2: 'j', 3: 'k', 4: 'g', 5: 'h' };
    return (this.keyBindings[lane] ?? defaults[lane] ?? '?').toUpperCase();
  }

  enterShop() {
    const owned = new Set(this.currentRun.modifiers);
    const available = SHOP_ITEMS.filter(item => !owned.has(item.id));
    const shuffled = available.slice().sort(() => Math.random() - 0.5);
    this.shopItems = shuffled.slice(0, 3).map(item => ({ ...item, purchased: false }));
    this.shopCursor = 0;
    this.gameState = GAME_STATES.SHOP;
  }

  clearRun() { this.currentRun = { modifiers: [] }; }

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
    this.musicSelectCursor = 0;
    this.selectedTrack = 0;
    this.isMuted = false;
    this.trackNameT = 0;
    this.speedMultiplierIdx = 1;
    this.chartOffset = 0;
    this.escConfirm = false;
  }

  _resetGimmick() {
    const gimmick = this.getTheme().gimmick;
    this.gimmickTimer         = gimmick === 'current' ? 10000 : gimmick === 'wind' ? 12000 : 0;
    this.currentShiftOffset   = 0;
    this.currentShifting      = false;
    this.currentShiftAnimT    = 0;
    this.currentShiftLerp     = 0;
    this.currentShiftDir      = 1;
    this.currentWarningActive = false;
    this.currentWarningT      = 0;
    this.windDirection        = 1;
    this.windTimer            = gimmick === 'wind' ? 12000 : 0;
    this.petalParticles       = [];
    this.trunkHitCount        = 0;
  }

  startGame(chart = null) {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.allPerfect = true;
    this.perfectCount = 0;
    this.goodCount    = 0;
    this.missCount    = 0;

    const base = chart || makeThemeChart(this.activeTheme);
    const off  = this.chartOffset;
    let notes  = off !== 0 ? base.map(n => ({ ...n, time: n.time + off })) : base.slice();

    if (this.hasModifier('double_lane')) {
      const remap = [0, 2, 3, 5];
      notes = notes.map(n => ({ ...n, lane: remap[n.lane] }));
    }
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
    this._resetGimmick();
    this.gameState = GAME_STATES.PLAYING;
  }

  updateTimers(dt) {
    this.bgRoad += dt * 0.44;
    this.bgSky  += dt * 0.09;
    this.pulse  += dt * 0.0022;

    for (let i = 0; i < this.keyDown.length; i++) {
      this.keyFlash[i] = Math.max(0, this.keyFlash[i] - dt);
    }

    this.judgeT           = Math.max(0, this.judgeT           - dt);
    this.glitchT          = Math.max(0, this.glitchT          - dt);
    this.noteSpeedChangeT = Math.max(0, this.noteSpeedChangeT - dt);
    this.trackNameT       = Math.max(0, this.trackNameT       - dt);
    this.effects          = this.effects.filter(e => (e.t -= dt) > 0);

    // Petal particles
    for (const p of this.petalParticles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vrot * dt;
      p.life -= dt;
    }
    this.petalParticles = this.petalParticles.filter(p => p.life > 0);
  }

  updateSongTime() {
    this.songTime = performance.now() - this.startTime;
  }

  spawnPetalBurst() {
    const dir = this.windDirection;
    for (let i = 0; i < 25; i++) {
      this.petalParticles.push({
        x: dir > 0 ? -10 : GAME.W + 10,
        y: Math.random() * GAME.H,
        vx: (dir > 0 ? 1 : -1) * (0.08 + Math.random() * 0.12),
        vy: -0.04 + Math.random() * 0.08,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.004,
        life: 3000 + Math.random() * 2000,
        size: 6 + Math.random() * 8,
        col: Math.random() < 0.5 ? '#ffb7c5' : '#cc99ff',
      });
    }
    this.windDirection = -this.windDirection;
  }
}

export const gameState = new GameState();
