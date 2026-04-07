// ================================================================
// NEON BEAT – Rendering System (Cyberpunk 2077 / Apex Legends Style)
// Glassmorphism + Neon Glow Redesign
// ================================================================

import { GAME, INPUT, VISUAL, GAME_STATES, TRACKS, VIBE_COLORS, SPEED_MULTIPLIERS, SHOP_ITEMS, NOTE_SPEED_LEVELS, JUDGMENT_LINE_LEVELS } from './constants.js';
import { THEMES, THEME_ORDER } from './themes.js';
import { getImage } from './assets.js';
import { gameState } from './state.js';
import { musicPlayer } from './music.js';

// ── Design Constants ─────────────────────────────────────────────────
const NEON = {
  CYAN: '#00FFFF',
  PINK: '#FF00FF',
  GOLD: '#FFD700',
  WHITE: '#FFFFFF',
  DARK: 'rgba(10, 5, 25, 0.85)',
  GLASS: 'rgba(20, 10, 40, 0.65)',
  GLASS_BORDER: 'rgba(255, 255, 255, 0.15)',
};

export class Renderer {
  constructor(ctx, offCtx, offCanvas) {
    this.ctx = ctx;
    this.offCtx = offCtx;
    this.offCanvas = offCanvas;
    
    // Pre-create blur canvas for glassmorphism effect simulation
    this.blurCanvas = document.createElement('canvas');
    this.blurCanvas.width = GAME.W;
    this.blurCanvas.height = GAME.H;
    this.blurCtx = this.blurCanvas.getContext('2d');
  }

  render() {
    // Clear and render to offscreen buffer
    this.offCtx.clearRect(0, 0, GAME.W, GAME.H);

    if (gameState.gameState === GAME_STATES.TITLE) {
      this.renderTitle(this.offCtx);
      this.drawAmbientParticles(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else if (gameState.gameState === GAME_STATES.MUSIC_SELECT) {
      this.renderMusicSelect(this.offCtx);
      this.drawAmbientParticles(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else if (gameState.gameState === GAME_STATES.SHOP) {
      this.renderShop(this.offCtx);
      this.drawAmbientParticles(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else if (gameState.gameState === GAME_STATES.KEYBINDINGS) {
      this.renderKeyBindings(this.offCtx);
      this.drawAmbientParticles(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else if (gameState.gameState === GAME_STATES.SETTINGS) {
      this.renderSettings(this.offCtx);
      this.drawAmbientParticles(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else if (gameState.gameState === GAME_STATES.THEME_SELECT) {
      this.renderThemeSelect(this.offCtx);
      this.drawAmbientParticles(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else {
      this.drawScrollBG(this.offCtx);
      this.drawLanes(this.offCtx);
      this.drawKeyButtons(this.offCtx);
      this.drawNotes(this.offCtx);
      this.drawHitZone(this.offCtx);
      this.drawEffects(this.offCtx);
      this.drawProgressBar(this.offCtx);
      this.drawHUD(this.offCtx);
      this.drawMuteButton(this.offCtx);
      this.drawTrackName(this.offCtx);
      this.drawJudgment(this.offCtx);
      this.drawGimmickOverlay(this.offCtx);
      this.drawAmbientParticles(this.offCtx);
      this.drawScanlines(this.offCtx);
    }

    // Blit to main canvas
    this.ctx.clearRect(0, 0, GAME.W, GAME.H);
    this.ctx.drawImage(this.offCanvas, 0, 0);

    // Apply glitch effect
    if (gameState.glitchT > 0) {
      this.applyGlitch();
    }

    // Game over overlay
    if (gameState.gameState === GAME_STATES.GAMEOVER) {
      this.renderGameOver(this.ctx);
      this.drawAmbientParticles(this.ctx);
      this.drawScanlines(this.ctx);
    }

    // ESC-to-menu confirmation overlay
    if (gameState.escConfirm) {
      this.renderEscConfirm(this.ctx);
    }
  }

  // ── Glassmorphism Panel Helper ─────────────────────────────────────
  drawGlassPanel(rc, x, y, w, h, radius = 16, options = {}) {
    const {
      glowColor = NEON.CYAN,
      borderOpacity = 0.25,
      fillOpacity = 0.55,
      glowIntensity = 20,
    } = options;

    rc.save();
    
    // Outer glow
    rc.shadowBlur = glowIntensity;
    rc.shadowColor = glowColor;
    
    // Glass background
    const gradient = rc.createLinearGradient(x, y, x, y + h);
    gradient.addColorStop(0, `rgba(40, 20, 60, ${fillOpacity})`);
    gradient.addColorStop(0.5, `rgba(20, 10, 40, ${fillOpacity * 0.9})`);
    gradient.addColorStop(1, `rgba(30, 15, 50, ${fillOpacity})`);
    rc.fillStyle = gradient;
    
    rc.beginPath();
    rc.roundRect(x, y, w, h, radius);
    rc.fill();
    
    // Border with gradient
    const borderGrad = rc.createLinearGradient(x, y, x + w, y + h);
    borderGrad.addColorStop(0, `rgba(0, 255, 255, ${borderOpacity})`);
    borderGrad.addColorStop(0.5, `rgba(255, 0, 255, ${borderOpacity * 0.8})`);
    borderGrad.addColorStop(1, `rgba(0, 255, 255, ${borderOpacity})`);
    rc.strokeStyle = borderGrad;
    rc.lineWidth = 1.5;
    rc.stroke();
    
    // Inner highlight
    rc.shadowBlur = 0;
    rc.strokeStyle = `rgba(255, 255, 255, ${borderOpacity * 0.4})`;
    rc.lineWidth = 1;
    rc.beginPath();
    rc.roundRect(x + 1, y + 1, w - 2, h - 2, radius - 1);
    rc.stroke();
    
    rc.restore();
  }

  // ── Neon Text Helper ───────────────────────────────────────────────
  drawNeonText(rc, text, x, y, options = {}) {
    const {
      font = 'bold 14px Orbitron,monospace',
      color = NEON.CYAN,
      glowColor = null,
      glowIntensity = 16,
      align = 'center',
      baseline = 'middle',
    } = options;

    rc.save();
    rc.font = font;
    rc.textAlign = align;
    rc.textBaseline = baseline;
    rc.shadowBlur = glowIntensity;
    rc.shadowColor = glowColor || color;
    rc.fillStyle = color;
    rc.fillText(text, x, y);
    rc.restore();
  }

  // ── Neon Button Helper ─────────────────────────────────────────────
  drawNeonButton(rc, x, y, w, h, text, options = {}) {
    const {
      color = NEON.CYAN,
      selected = false,
      disabled = false,
      radius = 8,
    } = options;

    rc.save();
    
    const alpha = disabled ? 0.4 : 1;
    rc.globalAlpha = alpha;
    
    // Button glow
    rc.shadowBlur = selected ? 24 : 12;
    rc.shadowColor = color;
    
    // Button fill
    rc.fillStyle = selected ? `rgba(0, 255, 255, 0.25)` : `rgba(20, 10, 40, 0.75)`;
    rc.beginPath();
    rc.roundRect(x, y, w, h, radius);
    rc.fill();
    
    // Button border
    rc.strokeStyle = color;
    rc.lineWidth = selected ? 2 : 1.5;
    rc.stroke();
    
    // Button text
    rc.shadowBlur = selected ? 10 : 6;
    rc.font = 'bold 12px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = color;
    rc.fillText(text, x + w / 2, y + h / 2);
    
    rc.restore();
  }

  drawScrollBG(rc) {
    // Base dark background
    rc.fillStyle = '#08001a';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    const themeBg   = getImage('theme_bg');
    const themeRoad = getImage('theme_bg_road');

    // Helper function to draw static background with object-fit: cover
    const drawStaticBg = (img, alpha = 0.95) => {
      const imgRatio = img.naturalWidth / img.naturalHeight;
      const canvasRatio = GAME.W / GAME.H;
      let drawW, drawH, drawX, drawY;
      
      if (imgRatio > canvasRatio) {
        drawH = GAME.H;
        drawW = drawH * imgRatio;
        drawX = (GAME.W - drawW) / 2;
        drawY = 0;
      } else {
        drawW = GAME.W;
        drawH = drawW / imgRatio;
        drawX = 0;
        drawY = (GAME.H - drawH) / 2;
      }
      
      rc.save();
      rc.globalAlpha = alpha;
      rc.drawImage(img, drawX, drawY, drawW, drawH);
      rc.restore();
    };

    if (themeRoad) {
      // Theme has both sky + road layers - draw static
      const sky = themeBg || getImage('bg_sky');
      if (sky) {
        drawStaticBg(sky, 0.85);
      }
      // Draw road static, covering lower portion
      drawStaticBg(themeRoad, 1.0);
    } else if (themeBg) {
      // Theme has only a single full-canvas background - static object-fit: cover
      drawStaticBg(themeBg, 0.95);
    } else {
      // Fallback: base cyber assets - static
      const sky = getImage('bg_sky');
      if (sky) {
        drawStaticBg(sky, 0.85);
      }
      const road = getImage('bg_road');
      if (road) {
        drawStaticBg(road, 1.0);
      }
    }

    // Cyberpunk atmospheric vignette
    const vignette = rc.createRadialGradient(
      GAME.W / 2, GAME.H * 0.5, GAME.H * 0.1,
      GAME.W / 2, GAME.H * 0.5, GAME.H * 0.7
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(0.5, 'rgba(10,0,30,0.25)');
    vignette.addColorStop(1, 'rgba(5,0,15,0.55)');
    rc.fillStyle = vignette;
    rc.fillRect(0, 0, GAME.W, GAME.H);
  }

  drawLanes(rc) {
    const lc = gameState.laneCount;
    const lw = gameState.laneW;
    rc.save();

    // Lane dividers with neon effect
    for (let i = 1; i < lc; i++) {
      // Base line
      rc.strokeStyle = 'rgba(0, 255, 255, 0.12)';
      rc.lineWidth = 1;
      rc.beginPath();
      rc.moveTo(i * lw, 0);
      rc.lineTo(i * lw, GAME.H);
      rc.stroke();
      
      // Glow line
      rc.shadowBlur = 8;
      rc.shadowColor = NEON.CYAN;
      rc.strokeStyle = 'rgba(0, 255, 255, 0.08)';
      rc.beginPath();
      rc.moveTo(i * lw, 0);
      rc.lineTo(i * lw, GAME.H);
      rc.stroke();
      rc.shadowBlur = 0;
    }

    // Key-press lane glow with enhanced effect
    for (let i = 0; i < lc; i++) {
      const alpha = (gameState.keyDown[i] ? 0.18 : 0) + ((gameState.keyFlash[i] || 0) / 200) * 0.2;
      if (alpha > 0.01) {
        const laneCol = gameState.getLaneColor(i);
        const [r2,g2,b2] = [parseInt(laneCol.slice(1,3),16),parseInt(laneCol.slice(3,5),16),parseInt(laneCol.slice(5,7),16)];
        
        // Gradient from bottom to center
        const gradient = rc.createLinearGradient(0, GAME.H, 0, GAME.H * 0.3);
        gradient.addColorStop(0, `rgba(${r2},${g2},${b2},${alpha})`);
        gradient.addColorStop(1, `rgba(${r2},${g2},${b2},0)`);
        rc.fillStyle = gradient;
        rc.fillRect(i * lw, 0, lw, GAME.H);
      }
    }

    rc.restore();
  }

  drawHitZone(rc) {
    rc.save();
    const hitY = gameState.hitY;
    const lc = gameState.laneCount;
    const lw = gameState.laneW;

    // Glowing judgment line
    rc.shadowBlur = 25;
    rc.shadowColor = NEON.CYAN;
    rc.strokeStyle = NEON.CYAN;
    rc.lineWidth = 3;
    rc.beginPath();
    rc.moveTo(0, hitY);
    rc.lineTo(GAME.W, hitY);
    rc.stroke();
    
    // Inner white line
    rc.shadowBlur = 8;
    rc.strokeStyle = 'rgba(255,255,255,0.9)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.moveTo(0, hitY);
    rc.lineTo(GAME.W, hitY);
    rc.stroke();

    // Per-lane hit circles with enhanced glow
    for (let i = 0; i < lc; i++) {
      const cx = i * lw + lw / 2;
      const col = gameState.getLaneColor(i);
      const pressed = gameState.keyDown[i] || (gameState.keyFlash[i] || 0) > 0;

      // Outer glow ring
      rc.shadowBlur = pressed ? 35 : 15;
      rc.shadowColor = col;
      rc.strokeStyle = col;
      rc.lineWidth = pressed ? 4 : 2;
      rc.beginPath();
      rc.arc(cx, hitY, lw / 2 - 10, 0, Math.PI * 2);
      rc.stroke();

      // Inner ring
      if (pressed) {
        rc.shadowBlur = 20;
        rc.globalAlpha = 0.35;
        rc.fillStyle = col;
        rc.beginPath();
        rc.arc(cx, hitY, lw / 2 - 10, 0, Math.PI * 2);
        rc.fill();
        rc.globalAlpha = 1;
      }
      
      // Center dot
      rc.shadowBlur = 10;
      rc.fillStyle = col;
      rc.beginPath();
      rc.arc(cx, hitY, 4, 0, Math.PI * 2);
      rc.fill();
    }

    rc.restore();
  }

  drawNotes(rc) {
    const overclock  = gameState.hasModifier('overclock') ? 1.2 : 1.0;
    const spd        = gameState.baseSpd * SPEED_MULTIPLIERS[gameState.speedMultiplierIdx] * gameState.noteSpeed * overclock;
    const ghostNotes = gameState.hasModifier('ghost_notes');
    const lw = gameState.laneW;
    const nw = gameState.noteW;
    const gimmick = gameState.getTheme().gimmick;

    // First pass: hold bodies
    for (const note of gameState.notes) {
      if (note.type !== 'hold') continue;
      if (note.state === 'active' || note.state === 'holding') {
        this._drawHoldBody(rc, note, spd, lw, nw);
      }
    }

    // Zigzag trails (before caps)
    for (const note of gameState.notes) {
      if (note.type !== 'zigzag' || note.state !== 'active') continue;
      if (!note.path) continue;
      this._drawZigzagTrail(rc, note, lw);
    }

    // Note caps
    for (const note of gameState.notes) {
      if (note.state !== 'active') continue;
      if (note.y < GAME.SPAWN_Y - 10 || note.y > gameState.hitY + 60) continue;

      // Visual X: ocean current lerp; sway offset for forest
      const visualLane = (gameState.currentShifting && note.prevLane !== undefined)
        ? note.prevLane + (note.lane - note.prevLane) * gameState.currentShiftLerp
        : note.lane;
      let visualX = visualLane * lw + (lw - nw) / 2;
      if (gimmick === 'sway') {
        visualX += Math.sin(note.y / 100 + note.time * 0.0001) * 8;
      } else if (note.type === 'petal') {
        visualX += Math.sin(note.y / 80 + note.time * 0.0001) * 8;
      }

      const x   = visualX;
      const y   = note.y - GAME.NOTE_H / 2;
      const col = gameState.getLaneColor(note.lane);

      // Phantom: fade in from 300ms to 100ms before hit
      let alpha = 1;
      if (note.type === 'phantom') {
        const tth = note._timeToHit ?? 0;
        alpha = Math.max(0, Math.min(1, (300 - tth) / 200));
        // Subtle shimmer at full invisibility
        if (alpha < 0.05) {
          rc.save();
          rc.globalAlpha = 0.15 + 0.10 * Math.sin(gameState.pulse * Math.PI * 2 * 8);
          rc.fillStyle = col;
          rc.beginPath();
          rc.arc(x + nw / 2, note.y, 4, 0, Math.PI * 2);
          rc.fill();
          rc.restore();
          continue;
        }
      }

      if (ghostNotes) {
        const dist = Math.max(0, gameState.hitY - note.y);
        alpha = Math.min(alpha, Math.min(1, dist / (gameState.hitY * 0.5)));
      }

      rc.save();
      rc.globalAlpha = alpha;

      if (note.type === 'trunk') {
        this._drawTrunkNote(rc, x, y, note, nw, col);
      } else {
        rc.shadowBlur  = 28;
        rc.shadowColor = col;
        this._drawNoteCap(rc, x, y, nw, col);
      }
      rc.restore();
    }

    // Petal particles (spring wind gimmick)
    if (gimmick === 'wind') this._drawPetalParticles(rc);
  }

  _drawNoteCap(rc, x, y, nw, col) {
    // Enhanced note visibility with stronger glow and contrast
    if (gameState.noteShape === 'circle') {
      const cx2 = x + nw / 2, cy2 = y + GAME.NOTE_H / 2, r = nw / 2 - 2;
      
      // Outer glow halo
      rc.shadowBlur = 35;
      rc.shadowColor = col;
      rc.fillStyle = col;
      rc.beginPath(); rc.arc(cx2, cy2, r, 0, Math.PI * 2); rc.fill();
      
      // Inner bright core for better visibility
      rc.shadowBlur = 0;
      const gradient = rc.createRadialGradient(cx2 - r * 0.3, cy2 - r * 0.3, 0, cx2, cy2, r);
      gradient.addColorStop(0, 'rgba(255,255,255,0.9)');
      gradient.addColorStop(0.5, col);
      gradient.addColorStop(1, col);
      rc.fillStyle = gradient;
      rc.beginPath(); rc.arc(cx2, cy2, r - 2, 0, Math.PI * 2); rc.fill();
      
      // White edge highlight
      rc.strokeStyle = 'rgba(255,255,255,0.95)'; rc.lineWidth = 2.5;
      rc.beginPath(); rc.arc(cx2, cy2, r, 0, Math.PI * 2); rc.stroke();
    } else {
      // Outer glow
      rc.shadowBlur = 35;
      rc.shadowColor = col;
      rc.fillStyle = col;
      rc.beginPath(); rc.roundRect(x, y, nw, GAME.NOTE_H, 8); rc.fill();
      
      // Inner gradient for 3D effect
      rc.shadowBlur = 0;
      const gradient = rc.createLinearGradient(x, y, x, y + GAME.NOTE_H);
      gradient.addColorStop(0, 'rgba(255,255,255,0.5)');
      gradient.addColorStop(0.4, col);
      gradient.addColorStop(1, col);
      rc.fillStyle = gradient;
      rc.beginPath(); rc.roundRect(x + 2, y + 2, nw - 4, GAME.NOTE_H - 4, 6); rc.fill();
      
      // White edge highlight
      rc.strokeStyle = 'rgba(255,255,255,0.95)'; rc.lineWidth = 2.5;
      rc.beginPath(); rc.roundRect(x + 1, y + 1, nw - 2, GAME.NOTE_H - 2, 7); rc.stroke();
    }
  }

  _drawTrunkNote(rc, x, y, note, nw, col) {
    // Gold glow, 10% larger
    const scale = 1.10;
    const nx = x - (nw * (scale - 1)) / 2;
    const nh = GAME.NOTE_H * scale;
    rc.shadowBlur  = 35;
    rc.shadowColor = NEON.GOLD;
    rc.fillStyle   = NEON.GOLD;
    if (gameState.noteShape === 'circle') {
      const r = (nw * scale) / 2 - 3;
      const cx2 = x + nw / 2, cy2 = y + GAME.NOTE_H / 2;
      rc.beginPath(); rc.arc(cx2, cy2, r, 0, Math.PI * 2); rc.fill();
      rc.shadowBlur = 0; rc.strokeStyle = 'rgba(255,255,200,0.95)'; rc.lineWidth = 2;
      rc.beginPath(); rc.arc(cx2, cy2, r, 0, Math.PI * 2); rc.stroke();
    } else {
      rc.beginPath(); rc.roundRect(nx, y, nw * scale, nh, 6); rc.fill();
      rc.shadowBlur = 0; rc.strokeStyle = 'rgba(255,255,200,0.95)'; rc.lineWidth = 2;
      rc.beginPath(); rc.roundRect(nx + 1, y + 1, nw * scale - 2, nh - 2, 5); rc.stroke();
    }
    // Star indicator above note
    rc.shadowBlur = 0; rc.fillStyle = '#ffee44';
    rc.font = 'bold 11px Orbitron,monospace';
    rc.textAlign = 'center'; rc.textBaseline = 'bottom';
    rc.fillText('★', x + nw / 2, y - 2);
  }

  _drawZigzagTrail(rc, note, lw) {
    if (!note.path || note.path.length < 1) return;
    rc.save();
    rc.globalAlpha = 0.90;
    rc.strokeStyle = gameState.getLaneColor(note.lane);
    rc.lineWidth   = 2;
    rc.setLineDash([5, 5]);
    rc.shadowBlur  = 12;
    rc.shadowColor = gameState.getLaneColor(note.lane);
    rc.beginPath();
    const fullLanes = [note.path[0], ...note.path.slice(1)];
    for (let i = 0; i < fullLanes.length; i++) {
      const laneX = fullLanes[i] * lw + lw / 2;
      const segY  = note.y - (note.path.length - i) * 40;
      if (i === 0) rc.moveTo(laneX, segY);
      else         rc.lineTo(laneX, segY);
    }
    rc.lineTo(note.lane * lw + lw / 2, note.y);
    rc.stroke();
    rc.setLineDash([]);
    rc.restore();
  }

  _drawPetalParticles(rc) {
    for (const p of gameState.petalParticles) {
      const alpha = Math.min(1, p.life / 800);
      rc.save();
      rc.globalAlpha = alpha * 0.95;
      rc.translate(p.x, p.y);
      rc.rotate(p.rot);
      rc.fillStyle = p.col;
      rc.shadowBlur = 8;
      rc.shadowColor = p.col;
      rc.beginPath();
      rc.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
      rc.fill();
      rc.restore();
    }
  }

  _drawHoldBody(rc, note, spd, lw = gameState.laneW, nw = gameState.noteW) {
    const col     = gameState.getLaneColor(note.lane);
    const laneX   = note.lane * lw;
    const capX    = laneX + (lw - nw) / 2;
    const bodyW   = nw - 20;
    const bodyX   = laneX + (lw - bodyW) / 2;
    const rgb     = _hexToRgb(col);
    const fillRgb = `${rgb.r},${rgb.g},${rgb.b}`;

    rc.save();

    if (note.state === 'active') {
      const durationPx = note.duration * spd;
      const headY      = note.y;
      const tailY      = note.y - durationPx;

      const drawTop = Math.max(0, tailY);
      const drawBot = Math.min(gameState.hitY + GAME.NOTE_H / 2, Math.min(GAME.H, headY));
      if (drawBot > drawTop) {
        rc.fillStyle = `rgba(${fillRgb},0.45)`;
        rc.fillRect(bodyX, drawTop, bodyW, drawBot - drawTop);
        rc.strokeStyle = `rgba(${fillRgb},0.9)`;
        rc.lineWidth = 1.5;
        rc.strokeRect(bodyX, drawTop, bodyW, drawBot - drawTop);
      }

      if (tailY >= -8 && tailY <= GAME.H) {
        rc.globalAlpha = 0.85;
        rc.fillStyle = col;
        rc.shadowBlur = 15;
        rc.shadowColor = col;
        rc.beginPath();
        if (gameState.noteShape === 'circle') {
          rc.arc(capX + nw / 2, tailY, nw / 2 - 3, 0, Math.PI * 2);
        } else {
          rc.roundRect(capX, tailY - 4, nw, 8, 4);
        }
        rc.fill();
        rc.shadowBlur  = 0;
        rc.strokeStyle = 'rgba(255,255,255,0.9)';
        rc.lineWidth   = 1.5;
        rc.beginPath();
        if (gameState.noteShape === 'circle') {
          rc.arc(capX + nw / 2, tailY, nw / 2 - 3, 0, Math.PI * 2);
        } else {
          rc.roundRect(capX + 1, tailY - 3, nw - 2, 6, 3);
        }
        rc.stroke();
      }

    } else if (note.state === 'holding') {
      const remaining   = Math.max(0, note.duration - note.holdTime);
      const remainingPx = remaining * spd;

      if (remainingPx > 4) {
        const topY = gameState.hitY - remainingPx;
        rc.fillStyle = `rgba(${fillRgb},0.6)`;
        rc.fillRect(bodyX, topY, bodyW, remainingPx);

        rc.globalAlpha = 0.95;
        rc.fillStyle = col;
        rc.shadowBlur = 15;
        rc.shadowColor = col;
        rc.beginPath();
        if (gameState.noteShape === 'circle') {
          rc.arc(capX + nw / 2, topY, nw / 2 - 3, 0, Math.PI * 2);
        } else {
          rc.roundRect(capX, topY - 4, nw, 8, 4);
        }
        rc.fill();
        rc.shadowBlur  = 0;
        rc.strokeStyle = 'rgba(255,255,255,0.9)';
        rc.lineWidth   = 1.5;
        rc.beginPath();
        if (gameState.noteShape === 'circle') {
          rc.arc(capX + nw / 2, topY, nw / 2 - 3, 0, Math.PI * 2);
        } else {
          rc.roundRect(capX + 1, topY - 3, nw - 2, 6, 3);
        }
        rc.stroke();
      }
    }

    rc.restore();
  }

  _buildHitFxCanvas(img) {
    const w = img.naturalWidth, h = img.naturalHeight;
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const ctx = tmp.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const id = ctx.getImageData(0, 0, w, h);
    const d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114;
      d[i + 3] = Math.min(255, Math.round(lum * 2.2));
    }
    ctx.putImageData(id, 0, 0);
    return tmp;
  }

  drawEffects(rc) {
    const hitFxRaw = getImage('hit_fx');
    if (hitFxRaw && !this._hitFxCanvas) {
      this._hitFxCanvas = this._buildHitFxCanvas(hitFxRaw);
    }
    const hitFx = this._hitFxCanvas || null;

    for (const effect of gameState.effects) {
      const t = effect.t / effect.max;
      const scale = 1 + (1 - t) * 1.8;
      const size = 64 * scale;

      rc.save();
      rc.globalAlpha = Math.pow(t, 0.6);
      rc.translate(effect.x, effect.y);

      if (hitFx) {
        if (!effect._drawn) {
          effect._drawn = true;
        }
        rc.drawImage(hitFx, -size / 2, -size / 2, size, size);
      } else {
        rc.strokeStyle = effect.grade === 'PERFECT' ? NEON.GOLD : NEON.CYAN;
        rc.lineWidth = 3;
        rc.shadowBlur = 22;
        rc.shadowColor = rc.strokeStyle;
        rc.beginPath();
        rc.arc(0, 0, 22 * scale, 0, Math.PI * 2);
        rc.stroke();
      }
      
      rc.restore();
    }
  }

  drawKeyButtons(rc) {
    const lc      = gameState.laneCount;
    const lw      = gameState.laneW;
    // Position buttons further below hit line to prevent overlap
    const buttonY = gameState.hitY + 80;
    const size    = Math.min(52, lw - 6);

    for (let i = 0; i < lc; i++) {
      const cx = i * lw + lw / 2;
      const col = gameState.getLaneColor(i);
      const pressed = gameState.keyDown[i];

      rc.save();
      
      // Button glow - stronger for better visibility
      rc.shadowBlur = pressed ? 35 : 15;
      rc.shadowColor = col;
      
      // Glassmorphism button background
      const grad = rc.createLinearGradient(cx - size / 2, buttonY - size / 2, cx + size / 2, buttonY + size / 2);
      if (pressed) {
        grad.addColorStop(0, col);
        grad.addColorStop(1, col);
      } else {
        grad.addColorStop(0, 'rgba(25, 15, 50, 0.9)');
        grad.addColorStop(1, 'rgba(15, 8, 35, 0.95)');
      }
      rc.fillStyle = grad;
      rc.strokeStyle = col;
      rc.lineWidth = pressed ? 3 : 2;
      rc.beginPath();
      rc.roundRect(cx - size / 2, buttonY - size / 2, size, size, 12);
      rc.fill();
      rc.stroke();
      
      // Inner glow highlight
      if (!pressed) {
        rc.strokeStyle = 'rgba(255,255,255,0.15)';
        rc.lineWidth = 1;
        rc.beginPath();
        rc.roundRect(cx - size / 2 + 2, buttonY - size / 2 + 2, size - 4, size - 4, 10);
        rc.stroke();
      }

      // Button label - larger and more visible
      const fontSize = lc === 6 ? 16 : 20;
      rc.font = `bold ${fontSize}px Orbitron,monospace`;
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = pressed ? '#000' : '#ffffff';
      rc.shadowBlur = pressed ? 0 : 8;
      rc.shadowColor = col;
      rc.fillText(gameState.getKeyLabel(i), cx, buttonY);
      rc.restore();
    }
  }

  drawHUD(rc) {
    rc.save();
    
    // Score display with glassmorphism background
    this.drawGlassPanel(rc, GAME.W - 145, 12, 130, 50, 10, { glowColor: NEON.CYAN, fillOpacity: 0.45 });
    
    rc.font = 'bold 22px Orbitron,monospace';
    rc.textAlign = 'right';
    rc.textBaseline = 'top';
    rc.fillStyle = '#fff';
    rc.shadowBlur = 12;
    rc.shadowColor = NEON.CYAN;
    rc.fillText(gameState.score.toString().padStart(8, '0'), GAME.W - 20, 20);
    
    rc.font = '400 10px Orbitron,monospace';
    rc.fillStyle = 'rgba(255,255,255,0.85)';
    rc.shadowBlur = 0;
    rc.fillText('SCORE', GAME.W - 20, 46);

    // Combo display with glassmorphism
    if (gameState.combo > 1) {
      let comboColor;
      if (gameState.combo >= 50) comboColor = NEON.PINK;
      else if (gameState.combo >= 25) comboColor = NEON.GOLD;
      else if (gameState.combo >= 10) comboColor = NEON.CYAN;
      else comboColor = NEON.WHITE;

      const comboSize = Math.min(48, 26 + Math.sqrt(gameState.combo) * 1.8) | 0;
      
      this.drawGlassPanel(rc, 12, 12, 100, 55, 10, { glowColor: comboColor, fillOpacity: 0.45 });
      
      rc.textAlign = 'left';
      rc.font = `900 ${comboSize}px Orbitron,monospace`;
      rc.fillStyle = comboColor;
      rc.shadowBlur = 18;
      rc.shadowColor = comboColor;
      rc.fillText(`${gameState.combo}×`, 22, 18);

      rc.font = '400 10px Orbitron,monospace';
      rc.fillStyle = 'rgba(255,255,255,0.85)';
      rc.shadowBlur = 0;
      rc.fillText('COMBO', 22, 18 + comboSize + 4);
    }

    // NOTE SPEED flash
    if (gameState.noteSpeedChangeT > 0) {
      const alpha = Math.min(1, gameState.noteSpeedChangeT / 300);
      rc.save();
      rc.globalAlpha = alpha;
      rc.textAlign = 'left';
      rc.font = 'bold 16px Orbitron,monospace';
      rc.fillStyle = NEON.GOLD;
      rc.shadowBlur = 16;
      rc.shadowColor = NEON.GOLD;
      rc.fillText(`SPEED  ${NOTE_SPEED_LEVELS[gameState.noteSpeedIdx]}×`, 22, gameState.combo > 1 ? 85 : 22);
      rc.restore();
    }

    rc.restore();
  }

  drawJudgment(rc) {
    if (!gameState.judgeText || gameState.judgeT <= 0) return;
    
    const t = gameState.judgeT / 600;
    let color, glow;
    
    if (gameState.judgeText === 'PERFECT') {
      color = NEON.GOLD;
      glow = '#ff8000';
    } else if (gameState.judgeText === 'GOOD') {
      color = NEON.CYAN;
      glow = '#0055ff';
    } else {
      color = '#ff4455';
      glow = '#ff0000';
    }
    
    rc.save();
    rc.globalAlpha = Math.min(1, t * 2);
    rc.translate(GAME.W / 2, gameState.hitY - 90);
    rc.scale(1 + 0.05 * (1 - t), 1 + 0.05 * (1 - t));
    rc.font = '900 34px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = color;
    rc.shadowBlur = 28;
    rc.shadowColor = glow;
    rc.fillText(gameState.judgeText, 0, 0);
    rc.restore();
  }

  drawProgressBar(rc) {
    // Song progress bar (HUD frame removed for cleaner glassmorphism look)
    const audio = musicPlayer.audio;
    const audioDur = audio && isFinite(audio.duration) && audio.duration > 0
      ? audio.duration : null;

    const notes = gameState.notes;
    const fallbackDur = notes && notes.length
      ? (notes[notes.length - 1].time + 3500) / 1000
      : null;
    const fallbackElapsed = gameState.songTime / 1000;

    const totalDur    = audioDur ?? fallbackDur;
    const elapsedSec  = audioDur ? audio.currentTime : fallbackElapsed;
    const progress    = totalDur ? Math.max(0, Math.min(1, elapsedSec / totalDur)) : 0;

    const barX = GAME.W * 0.08;
    const barY = 74;
    const barW = GAME.W * 0.84;
    const barH = 5;
    const track = TRACKS[gameState.selectedTrack];
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    rc.save();

    // Track title
    rc.font = '400 11px Orbitron,monospace';
    rc.textAlign = 'left';
    rc.textBaseline = 'bottom';
    rc.fillStyle = 'rgba(255,255,255,0.7)';
    rc.fillText(track ? track.title.toUpperCase() : '', barX, barY - 3);

    // Progress bar background
    rc.fillStyle = 'rgba(30, 15, 50, 0.7)';
    rc.strokeStyle = 'rgba(255,255,255,0.12)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.roundRect(barX, barY, barW, barH, 3);
    rc.fill();
    rc.stroke();

    // Filled portion with neon gradient
    if (progress > 0) {
      const grad = rc.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, NEON.CYAN);
      grad.addColorStop(1, NEON.PINK);
      rc.fillStyle = grad;
      rc.shadowBlur = 8;
      rc.shadowColor = NEON.CYAN;
      rc.beginPath();
      rc.roundRect(barX, barY, barW * progress, barH, 3);
      rc.fill();
    }

    // Time display
    if (totalDur) {
      rc.shadowBlur = 0;
      rc.font = '400 10px Orbitron,monospace';
      rc.textAlign = 'right';
      rc.textBaseline = 'top';
      rc.fillStyle = audioDur ? NEON.CYAN : 'rgba(0,255,255,0.5)';
      rc.fillText(`${fmt(elapsedSec)} / ${fmt(totalDur)}`, barX + barW, barY + barH + 4);
    }

    // Chart offset badge
    if (gameState.chartOffset !== 0) {
      rc.shadowBlur = 0;
      rc.font = '400 9px Orbitron,monospace';
      rc.textAlign = 'left';
      rc.textBaseline = 'top';
      rc.fillStyle = 'rgba(255,204,0,0.8)';
      const offLabel = `OFF ${gameState.chartOffset > 0 ? '+' : ''}${gameState.chartOffset}ms`;
      rc.fillText(offLabel, barX, barY + barH + 4);
    }

    rc.restore();
  }

  drawScanlines(rc) {
    rc.save();
    rc.globalAlpha = 0.025;
    rc.fillStyle = '#000';
    for (let y = 0; y < GAME.H; y += 3) {
      rc.fillRect(0, y, GAME.W, 1);
    }
    rc.restore();
  }

  // ── Ambient Rising Particles (Cyberpunk Atmosphere) ─────────────
  drawAmbientParticles(rc) {
    rc.save();
    
    for (const p of gameState.ambientParticles) {
      // Pulsing alpha effect
      const pulseAlpha = p.alpha * (0.7 + 0.3 * Math.sin(p.pulse));
      
      rc.globalAlpha = pulseAlpha;
      rc.fillStyle = p.color;
      rc.shadowBlur = p.size * 4;
      rc.shadowColor = p.color;
      
      // Draw particle as a small glowing circle
      rc.beginPath();
      rc.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      rc.fill();
      
      // Inner bright core
      rc.shadowBlur = 0;
      rc.globalAlpha = pulseAlpha * 0.8;
      rc.fillStyle = '#ffffff';
      rc.beginPath();
      rc.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
      rc.fill();
    }
    
    rc.restore();
  }

  applyGlitch() {
    const progress = gameState.glitchT / 520;
    const intensity = progress * gameState.glitchStr;
    
    this.ctx.save();

    // Horizontal slice shift
    let y = 0;
    while (y < GAME.H) {
      const sliceHeight = Math.max(1, Math.floor(3 + Math.random() * 20 * intensity));
      const actualHeight = Math.min(sliceHeight, GAME.H - y);
      const dx = Math.random() < 0.28 * intensity ? (Math.random() - 0.5) * 60 * intensity : 0;
      
      this.ctx.drawImage(this.offCanvas, 0, y, GAME.W, actualHeight, dx, y, GAME.W, actualHeight);
      y += sliceHeight;
    }

    // Chromatic fringe
    this.ctx.globalCompositeOperation = 'screen';
    this.ctx.globalAlpha = 0.10 * intensity;
    this.ctx.drawImage(this.offCanvas, -8 * intensity, 0, GAME.W, GAME.H);
    this.ctx.globalAlpha = 0.10 * intensity;
    this.ctx.drawImage(this.offCanvas, 8 * intensity, 0, GAME.W, GAME.H);

    // Bright flash at trigger peak
    if (progress > 0.80) {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = ((progress - 0.80) / 0.20) * 0.35 * gameState.glitchStr;
      this.ctx.fillStyle = NEON.PINK;
      this.ctx.fillRect(0, 0, GAME.W, GAME.H);
    }

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  renderTitle(rc) {
    // Dark cyberpunk background
    rc.fillStyle = '#06001a';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // Animated road background
    const road = getImage('bg_road');
    if (road) {
      const th = road.naturalHeight * (GAME.W / road.naturalWidth);
      const offset = gameState.bgRoad % th;
      rc.save();
      rc.globalAlpha = 0.45;
      for (let y = -offset; y < GAME.H; y += th) {
        rc.drawImage(road, 0, y, GAME.W, th);
      }
      rc.restore();
    }

    // Grid overlay
    rc.save();
    rc.strokeStyle = 'rgba(0, 255, 255, 0.06)';
    rc.lineWidth = 1;
    for (let x = 0; x < GAME.W; x += 50) {
      rc.beginPath(); rc.moveTo(x, 0); rc.lineTo(x, GAME.H); rc.stroke();
    }
    for (let y = 0; y < GAME.H; y += 50) {
      rc.beginPath(); rc.moveTo(0, y); rc.lineTo(GAME.W, y); rc.stroke();
    }
    rc.restore();

    // Atmospheric vignette
    const vignette = rc.createRadialGradient(GAME.W / 2, GAME.H * 0.4, 50, GAME.W / 2, GAME.H * 0.4, GAME.H * 0.8);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,10,0.65)');
    rc.fillStyle = vignette;
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // Logo with enhanced glow
    const logo = getImage('logo');
    if (logo) {
      const logoWidth = 280;
      const logoHeight = 280;
      rc.save();
      rc.shadowBlur = 40;
      rc.shadowColor = NEON.CYAN;
      rc.drawImage(logo, GAME.W / 2 - logoWidth / 2, 130, logoWidth, logoHeight);
      rc.restore();
    } else {
      this.drawNeonText(rc, 'NEON BEAT', GAME.W / 2, 260, {
        font: '900 44px Orbitron,monospace',
        color: NEON.CYAN,
        glowIntensity: 30,
      });
    }
    
    // Subtitle
    this.drawNeonText(rc, 'CYBERPUNK RHYTHM GAME  ♦  128 BPM', GAME.W / 2, 440, {
      font: '400 11px Orbitron,monospace',
      color: NEON.CYAN,
      glowIntensity: 8,
    });

    // Blink prompt
    if (Math.sin(gameState.pulse * Math.PI * 2 * 1.2) > 0) {
      const startKeys = [0, 1, 2, 3].map(i => gameState.getKeyLabel(i)).join(' / ');
      this.drawNeonText(rc, `PRESS  ${startKeys}  TO START`, GAME.W / 2, 540, {
        font: 'bold 13px Orbitron,monospace',
        color: NEON.WHITE,
        glowIntensity: 14,
      });
    }

    // Key row with glassmorphism
    const keyY = 600;
    for (let i = 0; i < 4; i++) {
      const cx  = GAME.W / 2 + (i - 1.5) * 65;
      const col = VISUAL.LANE_COL[i];
      
      this.drawGlassPanel(rc, cx - 20, keyY - 20, 40, 40, 8, { glowColor: col, fillOpacity: 0.5 });
      
      rc.save();
      rc.font = 'bold 14px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = col;
      rc.shadowBlur = 10;
      rc.shadowColor = col;
      rc.fillText(gameState.getKeyLabel(i), cx, keyY);
      rc.restore();
    }

    // Bottom utility buttons with glassmorphism
    const btnY = 670, btnH = 30;
    const activeTheme = gameState.getTheme();
    const themeCol = activeTheme.colors.glow;

    rc.font = 'bold 10px Orbitron,monospace';
    const shapeLabel = `NOTE: ${gameState.noteShape === 'circle' ? '● CIRCLE' : '■ RECT'}`;
    const themeLabel = `◆ ${activeTheme.name}`;
    const kbLabel    = 'KEYBINDS';
    const shapeW = rc.measureText(shapeLabel).width + 24;
    const themeW = rc.measureText(themeLabel).width + 24;
    const kbW    = rc.measureText(kbLabel).width + 24;
    const totalW = shapeW + themeW + kbW + 16;
    let bx = (GAME.W - totalW) / 2;

    // Shape button
    this.drawGlassPanel(rc, bx, btnY, shapeW, btnH, 6, { glowColor: NEON.CYAN, fillOpacity: 0.4 });
    this.drawNeonText(rc, shapeLabel, bx + shapeW / 2, btnY + btnH / 2, { font: 'bold 10px Orbitron,monospace', color: NEON.CYAN, glowIntensity: 8 });
    bx += shapeW + 8;

    // Theme button
    this.drawGlassPanel(rc, bx, btnY, themeW, btnH, 6, { glowColor: themeCol, fillOpacity: 0.4 });
    this.drawNeonText(rc, themeLabel, bx + themeW / 2, btnY + btnH / 2, { font: 'bold 10px Orbitron,monospace', color: themeCol, glowIntensity: 8 });
    bx += themeW + 8;

    // Keybinds button
    this.drawGlassPanel(rc, bx, btnY, kbW, btnH, 6, { glowColor: NEON.PINK, fillOpacity: 0.4 });
    this.drawNeonText(rc, kbLabel, bx + kbW / 2, btnY + btnH / 2, { font: 'bold 10px Orbitron,monospace', color: NEON.PINK, glowIntensity: 8 });

    // Hint below buttons
    this.drawNeonText(rc, 'S → SHAPE   •   T → THEME   •   K → KEYBINDS', GAME.W / 2, btnY + btnH + 18, {
      font: '400 9px Orbitron,monospace',
      color: 'rgba(255,255,255,0.75)',
      glowIntensity: 0,
    });
  }

  drawMuteButton(rc) {
    const mx = 12, my = 12, mw = 55, mh = 28;
    
    // Mute toggle with glassmorphism
    this.drawGlassPanel(rc, mx, my, mw, mh, 6, {
      glowColor: gameState.isMuted ? '#ff4444' : NEON.WHITE,
      fillOpacity: gameState.isMuted ? 0.5 : 0.35,
    });
    
    rc.save();
    rc.font = 'bold 9px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = gameState.isMuted ? '#ff6666' : 'rgba(255,255,255,0.9)';
    rc.fillText(gameState.isMuted ? '♪ OFF' : '♪  ON', mx + mw / 2, my + mh / 2);
    rc.restore();

    // Menu button
    const bx = GAME.W - 67, by = 12, bw = 55, bh = 28;
    this.drawGlassPanel(rc, bx, by, bw, bh, 6, { glowColor: NEON.WHITE, fillOpacity: 0.35 });
    
    rc.save();
    rc.font = 'bold 9px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.9)';
    rc.fillText('MENU', bx + bw / 2, by + bh / 2);
    rc.restore();
  }

  drawTrackName(rc) {
    if (gameState.trackNameT <= 0) return;
    const track = TRACKS[gameState.selectedTrack];
    if (!track) return;

    const elapsed = 2000 - gameState.trackNameT;
    const fadeIn  = Math.min(1, elapsed / 350);
    const fadeOut = Math.min(1, gameState.trackNameT / 350);
    const alpha   = Math.min(fadeIn, fadeOut);

    rc.save();
    rc.globalAlpha = alpha;
    const text = `♪  ${track.title}`;
    rc.font = 'bold 12px Orbitron,monospace';
    const tw = rc.measureText(text).width + 30;
    const px = (GAME.W - tw) / 2;
    const py = 100;
    const ph = 28;

    this.drawGlassPanel(rc, px, py, tw, ph, 8, { glowColor: NEON.CYAN, fillOpacity: 0.6 });
    
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#ffffff';
    rc.fillText(text, GAME.W / 2, py + ph / 2);
    rc.restore();
  }

  renderMusicSelect(rc) {
    // Background
    rc.fillStyle = '#06001a';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    const sky = getImage('bg_sky');
    if (sky) {
      const th = sky.naturalHeight * (GAME.W / sky.naturalWidth);
      const offset = gameState.bgSky % th;
      rc.save();
      rc.globalAlpha = 0.5;
      for (let y = -offset; y < GAME.H; y += th) {
        rc.drawImage(sky, 0, y, GAME.W, th);
      }
      rc.restore();
    }

    // Grid overlay
    rc.save();
    rc.strokeStyle = 'rgba(255, 0, 255, 0.04)';
    rc.lineWidth = 1;
    for (let x = 0; x < GAME.W; x += 40) {
      rc.beginPath(); rc.moveTo(x, 0); rc.lineTo(x, GAME.H); rc.stroke();
    }
    for (let y = 0; y < GAME.H; y += 40) {
      rc.beginPath(); rc.moveTo(0, y); rc.lineTo(GAME.W, y); rc.stroke();
    }
    rc.restore();

    // Main glassmorphism panel
    const px = 20, py = 55, pw = GAME.W - 40, ph = 720;
    this.drawGlassPanel(rc, px, py, pw, ph, 16, { glowColor: NEON.CYAN, fillOpacity: 0.5 });

    // Header
    this.drawNeonText(rc, 'SELECT TRACK', GAME.W / 2, py + 32, {
      font: '900 20px Orbitron,monospace',
      color: NEON.CYAN,
      glowIntensity: 22,
    });

    // Divider
    rc.save();
    const grad = rc.createLinearGradient(px + 20, 0, px + pw - 20, 0);
    grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
    grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.5)');
    grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
    rc.strokeStyle = grad;
    rc.lineWidth = 1;
    rc.beginPath();
    rc.moveTo(px + 20, py + 54);
    rc.lineTo(px + pw - 20, py + 54);
    rc.stroke();
    rc.restore();

    // Track cards
    const cardX  = px + 12;
    const cardW  = pw - 24;
    const cardH  = 75;
    const startY = py + 65;

    for (let i = 0; i < TRACKS.length; i++) {
      const track    = TRACKS[i];
      const cardY    = startY + i * cardH;
      const sel      = i === gameState.musicSelectCursor;
      const vc       = VIBE_COLORS[track.vibe] || '#ffffff';

      // Card with glassmorphism
      this.drawGlassPanel(rc, cardX, cardY + 3, cardW, cardH - 6, 10, {
        glowColor: sel ? NEON.CYAN : 'rgba(255, 255, 255, 0.3)',
        fillOpacity: sel ? 0.45 : 0.25,
        glowIntensity: sel ? 18 : 0,
      });

      // Selected indicator
      if (sel) {
        rc.save();
        rc.fillStyle = NEON.CYAN;
        rc.shadowBlur = 12;
        rc.shadowColor = NEON.CYAN;
        rc.fillRect(cardX, cardY + 12, 3, cardH - 22);
        rc.restore();
      }

      const midY  = cardY + cardH / 2;
      const lineA = midY - 10;
      const lineB = midY + 10;

      // Track number
      rc.save();
      rc.font = 'bold 11px Orbitron,monospace';
      rc.textAlign = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle = sel ? NEON.CYAN : 'rgba(255,255,255,0.8)';
      rc.shadowBlur = sel ? 6 : 0;
      rc.shadowColor = NEON.CYAN;
      rc.fillText(`${i + 1}.`, cardX + 16, lineA);
      rc.restore();

      // Track title
      rc.save();
      rc.font = 'bold 13px Orbitron,monospace';
      rc.textAlign = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle = sel ? '#ffffff' : 'rgba(255,255,255,0.85)';
      rc.shadowBlur = sel ? 8 : 0;
      rc.shadowColor = '#fff';
      rc.fillText(track.title, cardX + 40, lineA, 180);
      rc.restore();

      // Artist
      rc.save();
      rc.font = '400 10px Orbitron,monospace';
      rc.textAlign = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle = 'rgba(255,255,255,0.85)';
      rc.fillText(track.artist, cardX + 40, lineB);
      rc.restore();

      // Vibe pill
      rc.save();
      rc.font = 'bold 9px Orbitron,monospace';
      rc.textBaseline = 'middle';
      rc.textAlign = 'center';
      const vibeW = rc.measureText(track.vibe).width + 14;
      const vx = cardX + cardW - vibeW - 12;
      const vy = lineA - 8;
      const vh = 16;
      
      rc.fillStyle = `rgba(${_hexToRgb(vc)},0.3)`;
      rc.strokeStyle = vc;
      rc.lineWidth = 1;
      rc.shadowBlur = 6;
      rc.shadowColor = vc;
      rc.beginPath();
      rc.roundRect(vx, vy, vibeW, vh, 8);
      rc.fill();
      rc.stroke();
      rc.fillStyle = vc;
      rc.shadowBlur = 0;
      rc.fillText(track.vibe, vx + vibeW / 2, vy + vh / 2);
      rc.restore();

      // Preview hint
      if (sel) {
        rc.save();
        rc.font = '400 9px Orbitron,monospace';
        rc.textAlign = 'right';
        rc.textBaseline = 'middle';
        rc.fillStyle = 'rgba(255,255,255,0.85)';
        rc.fillText('▶ SPACE', cardX + cardW - 12, lineB);
        rc.restore();
      }
    }

    // Speed multiplier selector
    const selectorY = startY + TRACKS.length * cardH + 18;

    rc.save();
    rc.font = 'bold 10px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.65)';
    rc.fillText('FALL SPEED', GAME.W / 2, selectorY);
    rc.restore();

    const optW = 55, optH = 26, optGap = 8;
    const totalOptW = SPEED_MULTIPLIERS.length * optW + (SPEED_MULTIPLIERS.length - 1) * optGap;
    const optStartX = (GAME.W - totalOptW) / 2;

    for (let i = 0; i < SPEED_MULTIPLIERS.length; i++) {
      const active = i === gameState.speedMultiplierIdx;
      const ox = optStartX + i * (optW + optGap);
      const oy = selectorY + 14;
      
      this.drawGlassPanel(rc, ox, oy, optW, optH, 6, {
        glowColor: active ? NEON.CYAN : 'rgba(255, 255, 255, 0.3)',
        fillOpacity: active ? 0.4 : 0.2,
        glowIntensity: active ? 12 : 0,
      });
      
      rc.save();
      rc.font = 'bold 11px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = active ? NEON.CYAN : 'rgba(255,255,255,0.85)';
      rc.fillText(`${SPEED_MULTIPLIERS[i]}x`, ox + optW / 2, oy + optH / 2);
      rc.restore();
    }

    // Arrow hints
    rc.save();
    rc.font = 'bold 11px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.6)';
    rc.fillText('←', optStartX - 16, selectorY + 14 + optH / 2);
    rc.fillText('→', optStartX + totalOptW + 16, selectorY + 14 + optH / 2);
    rc.restore();

    // SETTINGS button
    const settingsBtnY = selectorY + 14 + optH + 16;
    const settingsBtnW = 160, settingsBtnH = 30;
    const settingsBtnX = (GAME.W - settingsBtnW) / 2;
    
    this.drawGlassPanel(rc, settingsBtnX, settingsBtnY, settingsBtnW, settingsBtnH, 8, {
      glowColor: NEON.PINK,
      fillOpacity: 0.35,
    });
    this.drawNeonText(rc, '⚙  SETTINGS', GAME.W / 2, settingsBtnY + settingsBtnH / 2, {
      font: 'bold 10px Orbitron,monospace',
      color: NEON.PINK,
      glowIntensity: 8,
    });

    // Footer hints
    this.drawNeonText(rc, '↑↓ NAVIGATE  •  ←→ SPEED  •  T SETTINGS', GAME.W / 2, py + ph - 34, {
      font: '400 9px Orbitron,monospace',
      color: 'rgba(255,255,255,0.8)',
      glowIntensity: 0,
    });
    this.drawNeonText(rc, 'ENTER/TAP×2 SELECT  •  SPACE PREVIEW  •  ESC BACK', GAME.W / 2, py + ph - 18, {
      font: '400 9px Orbitron,monospace',
      color: 'rgba(255,255,255,0.8)',
      glowIntensity: 0,
    });

    // BACK button
    rc.save();
    rc.font = 'bold 11px Orbitron,monospace';
    rc.textAlign = 'left';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#ffffff';
    rc.shadowBlur = 6;
    rc.shadowColor = NEON.WHITE;
    rc.fillText('← BACK', px + 6, py - 16);
    rc.restore();

    // START button
    const btnW = 200, btnH = 40;
    const btnX = (GAME.W - btnW) / 2;
    const btnY = 793;
    const selTrack = TRACKS[gameState.musicSelectCursor];
    
    this.drawGlassPanel(rc, btnX, btnY, btnW, btnH, 10, {
      glowColor: NEON.CYAN,
      fillOpacity: 0.4,
      glowIntensity: 20,
    });
    
    this.drawNeonText(rc, `▶  ${selTrack ? selTrack.title.toUpperCase() : 'PLAY'}`, GAME.W / 2, btnY + btnH / 2, {
      font: 'bold 12px Orbitron,monospace',
      color: NEON.CYAN,
      glowIntensity: 10,
    });
  }

  renderShop(rc) {
    // Background
    rc.fillStyle = '#08001a';
    rc.fillRect(0, 0, GAME.W, GAME.H);
    
    const shopBg = getImage('theme_shop');
    if (shopBg) {
      rc.save();
      rc.globalAlpha = 0.5;
      rc.drawImage(shopBg, 0, 0, GAME.W, GAME.H);
      rc.restore();
    }

    // Grid lines
    rc.save();
    rc.strokeStyle = 'rgba(255,0,255,0.05)';
    rc.lineWidth = 1;
    for (let x = 0; x < GAME.W; x += 35) { rc.beginPath(); rc.moveTo(x,0); rc.lineTo(x,GAME.H); rc.stroke(); }
    for (let y = 0; y < GAME.H; y += 35) { rc.beginPath(); rc.moveTo(0,y); rc.lineTo(GAME.W,y); rc.stroke(); }
    rc.restore();

    // Header - centered title
    this.drawNeonText(rc, 'SHOP', GAME.W / 2, 36, {
      font: '900 24px Orbitron,monospace',
      color: NEON.PINK,
      glowIntensity: 26,
    });

    // Credits display - positioned below title, centered
    this.drawGlassPanel(rc, GAME.W / 2 - 70, 56, 140, 34, 10, { glowColor: NEON.GOLD, fillOpacity: 0.45 });
    this.drawNeonText(rc, `◆ ${gameState.credits} CR`, GAME.W / 2, 73, {
      font: 'bold 15px Orbitron,monospace',
      color: NEON.GOLD,
      glowIntensity: 14,
    });

    // Divider
    rc.save();
    const grad = rc.createLinearGradient(20, 0, GAME.W - 20, 0);
    grad.addColorStop(0, 'rgba(255, 0, 255, 0)');
    grad.addColorStop(0.5, 'rgba(255, 0, 255, 0.4)');
    grad.addColorStop(1, 'rgba(255, 0, 255, 0)');
    rc.strokeStyle = grad;
    rc.lineWidth = 1;
    rc.beginPath();
    rc.moveTo(20, 100); rc.lineTo(GAME.W - 20, 100);
    rc.stroke();
    rc.restore();

    // Item cards - smaller cards with better spacing
    const items  = gameState.shopItems;
    const nCards = items.length;
    const cardX  = 16, cardW = GAME.W - 32, cardH = 90, cardGap = 8;
    const cardY0 = 112;

    for (let i = 0; i < nCards; i++) {
      const item   = items[i];
      const cy     = cardY0 + i * (cardH + cardGap);
      const sel    = i === gameState.shopCursor;
      const owned  = item.purchased || gameState.hasModifier(item.id);
      const canBuy = !owned && gameState.credits >= item.cost;

      // Card with glassmorphism
      this.drawGlassPanel(rc, cardX, cy, cardW, cardH, 12, {
        glowColor: sel ? NEON.PINK : 'rgba(255, 255, 255, 0.2)',
        fillOpacity: sel ? 0.45 : 0.3,
        glowIntensity: sel ? 18 : 0,
      });

      // Selected indicator
      if (sel) {
        rc.save();
        rc.fillStyle = NEON.PINK;
        rc.shadowBlur = 10;
        rc.shadowColor = NEON.PINK;
        rc.fillRect(cardX, cy + 12, 3, cardH - 24);
        rc.restore();
      }

      // Item name - compact layout
      const textX = cardX + 18;
      this.drawNeonText(rc, item.name, textX, cy + 18, {
        font: 'bold 13px Orbitron,monospace',
        color: sel ? '#ffffff' : 'rgba(255,255,255,0.9)',
        glowIntensity: sel ? 10 : 0,
        align: 'left',
      });

      // Description - single line, compact
      const desc = item.desc.replace(/\//g, '  •  ');
      rc.save();
      rc.font = '400 9px Orbitron,monospace';
      rc.textAlign = 'left';
      rc.textBaseline = 'top';
      rc.fillStyle = 'rgba(255,255,255,0.8)';
      rc.fillText(desc, textX, cy + 36);
      rc.restore();

      // Cost display - right side, vertically centered
      const rightX = cardX + cardW - 90;

      rc.save();
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      if (owned) {
        rc.font = 'bold 11px Orbitron,monospace';
        rc.fillStyle = 'rgba(255,255,255,0.6)';
        rc.fillText('OWNED', rightX + 35, cy + 26);
      } else {
        const costColor = canBuy ? NEON.GOLD : '#ff8888';
        rc.font = 'bold 18px Orbitron,monospace';
        rc.fillStyle = costColor;
        rc.shadowBlur = canBuy ? 10 : 0;
        rc.shadowColor = NEON.GOLD;
        rc.fillText(item.cost === 0 ? 'FREE' : `${item.cost}`, rightX + 35, cy + 22);
        if (item.cost > 0) {
          rc.font = 'bold 9px Orbitron,monospace';
          rc.shadowBlur = 0;
          rc.fillStyle = canBuy ? 'rgba(255,204,0,0.7)' : 'rgba(255,120,120,0.5)';
          rc.fillText('CR', rightX + 35, cy + 40);
        }
      }
      rc.restore();

      // Buy button - smaller and repositioned
      const btnW2 = 70, btnH2 = 24;
      const btnX2 = rightX, btnY2 = cy + cardH - btnH2 - 10;
      
      this.drawGlassPanel(rc, btnX2, btnY2, btnW2, btnH2, 6, {
        glowColor: owned ? 'rgba(255,255,255,0.3)' : canBuy ? NEON.PINK : '#ff6666',
        fillOpacity: owned ? 0.2 : canBuy ? 0.4 : 0.2,
        glowIntensity: (sel && canBuy) ? 12 : 0,
      });
      
      rc.save();
      rc.font = 'bold 9px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = owned ? 'rgba(255,255,255,0.5)' : canBuy ? '#ff88ff' : '#ff8888';
      rc.fillText(owned ? 'OWNED' : canBuy ? 'BUY' : 'NO CR', btnX2 + btnW2 / 2, btnY2 + btnH2 / 2);
      rc.restore();
    }

    // Active modifiers row
    const modsY = cardY0 + nCards * (cardH + cardGap) + 12;
    const mods = gameState.currentRun.modifiers;
    if (mods.length > 0) {
      rc.save();
      rc.font = 'bold 10px Orbitron,monospace';
      rc.textAlign = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle = 'rgba(255,255,255,0.8)';
      rc.fillText('ACTIVE MODS:', cardX + 6, modsY + 12);
      
      let pillX = cardX + 105;
      for (const id of mods) {
        const it = SHOP_ITEMS.find(s => s.id === id);
        const label = it ? it.name : id.toUpperCase();
        rc.font = 'bold 9px Orbitron,monospace';
        const pillW = rc.measureText(label).width + 16;
        
        this.drawGlassPanel(rc, pillX, modsY + 3, pillW, 20, 10, { glowColor: NEON.PINK, fillOpacity: 0.35 });
        
        rc.fillStyle = '#ff88ff';
        rc.textAlign = 'center';
        rc.fillText(label, pillX + pillW / 2, modsY + 13);
        pillX += pillW + 8;
        if (pillX > GAME.W - 20) break;
      }
      rc.restore();
    }

    // START button
    const startY = Math.max(modsY + (mods.length > 0 ? 40 : 14), 460);
    const btnW3 = 220, btnH3 = 46;
    const btnX3 = (GAME.W - btnW3) / 2;
    
    this.drawGlassPanel(rc, btnX3, startY, btnW3, btnH3, 12, {
      glowColor: NEON.CYAN,
      fillOpacity: 0.4,
      glowIntensity: 20,
    });
    
    this.drawNeonText(rc, '▶  START GAME', GAME.W / 2, startY + btnH3 / 2, {
      font: 'bold 14px Orbitron,monospace',
      color: NEON.CYAN,
      glowIntensity: 12,
    });

    // Keyboard hints
    this.drawNeonText(rc, '↑↓ SELECT   •   ENTER / TAP  BUY   •   S  START', GAME.W / 2, startY + btnH3 + 24, {
      font: '400 10px Orbitron,monospace',
      color: 'rgba(255,255,255,0.8)',
      glowIntensity: 0,
    });
  }

  drawGimmickOverlay(rc) {
    const gimmick = gameState.getTheme().gimmick;
    if (!gimmick) return;

    // OCEAN: current warning banner + lane arrows during shift
    if (gimmick === 'current') {
      if (gameState.currentWarningActive) {
        const dir  = gameState.currentShiftDir;
        const fade = Math.min(1, gameState.currentWarningT / 500);
        rc.save();
        rc.globalAlpha = fade * 0.9;
        
        // Glassmorphism warning bar
        this.drawGlassPanel(rc, 0, GAME.H / 2 - 30, GAME.W, 60, 0, {
          glowColor: NEON.CYAN,
          fillOpacity: 0.5,
        });
        
        this.drawNeonText(rc, dir > 0 ? '▶ CURRENT SHIFTING' : 'CURRENT SHIFTING ◀', GAME.W / 2, GAME.H / 2, {
          font: 'bold 16px Orbitron,monospace',
          color: '#00cfff',
          glowIntensity: 18,
        });
        rc.restore();
      }
      if (gameState.currentShifting) {
        const lw = gameState.laneW;
        const lc = gameState.laneCount;
        const dir  = gameState.currentShiftDir;
        rc.save();
        rc.globalAlpha = 0.65;
        rc.font = 'bold 16px Orbitron,monospace';
        rc.textAlign = 'center';
        rc.textBaseline = 'middle';
        rc.fillStyle = '#00cfff';
        rc.shadowBlur = 12;
        rc.shadowColor = '#00cfff';
        for (let i = 0; i < lc; i++) {
          const cx = i * lw + lw / 2;
          rc.fillText(dir > 0 ? '→' : '←', cx, gameState.hitY - 45);
        }
        rc.restore();
      }
    }
  }

  renderThemeSelect(rc) {
    rc.fillStyle = '#06001a';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // Grid
    rc.save();
    rc.strokeStyle = 'rgba(0,255,255,0.06)';
    rc.lineWidth = 1;
    for (let x = 0; x < GAME.W; x += 45) { rc.beginPath(); rc.moveTo(x,0); rc.lineTo(x,GAME.H); rc.stroke(); }
    for (let y = 0; y < GAME.H; y += 45) { rc.beginPath(); rc.moveTo(0,y); rc.lineTo(GAME.W,y); rc.stroke(); }
    rc.restore();

    // Back hint
    rc.save();
    rc.font = 'bold 11px Orbitron,monospace';
    rc.textAlign = 'left'; rc.textBaseline = 'middle';
    rc.fillStyle = '#ffffff';
    rc.shadowBlur = 6;
    rc.shadowColor = NEON.WHITE;
    rc.fillText('← BACK', 22, 42);
    rc.restore();

    // Header
    this.drawNeonText(rc, 'SELECT THEME', GAME.W / 2, 42, {
      font: '900 20px Orbitron,monospace',
      color: NEON.CYAN,
      glowIntensity: 22,
    });

    // Theme cards
    const cardX = 26, cardW = GAME.W - 52, cardH = 88, cardGap = 12, cardY0 = 72;
    for (let i = 0; i < THEME_ORDER.length; i++) {
      const key     = THEME_ORDER[i];
      const theme   = THEMES[key];
      const cy      = cardY0 + i * (cardH + cardGap);
      const sel     = i === gameState.themeCursor;
      const active  = key === gameState.activeTheme;
      const locked  = !gameState.unlockedThemes.includes(key);
      const col     = theme.colors.glow;

      // Card with glassmorphism
      rc.save();
      rc.globalAlpha = locked ? 0.5 : 1;
      this.drawGlassPanel(rc, cardX, cy, cardW, cardH, 12, {
        glowColor: active ? col : sel ? col : 'rgba(255, 255, 255, 0.2)',
        fillOpacity: sel ? 0.45 : 0.3,
        glowIntensity: active ? 20 : sel ? 15 : 0,
        borderOpacity: active ? 0.6 : 0.25,
      });
      rc.restore();

      if (active) {
        rc.save();
        rc.fillStyle = col;
        rc.shadowBlur = 10;
        rc.shadowColor = col;
        rc.fillRect(cardX, cy + 12, 3, cardH - 24);
        rc.restore();
      }

      if (locked) {
        rc.save();
        rc.globalAlpha = 0.55;
        rc.font = 'bold 14px Orbitron,monospace';
        rc.textAlign = 'left'; rc.textBaseline = 'middle';
        rc.fillStyle = 'rgba(255,255,255,0.75)';
        rc.fillText(`🔒 ${theme.name}`, cardX + 20, cy + 28);
        rc.font = '400 10px Orbitron,monospace';
        rc.fillStyle = 'rgba(255,255,255,0.6)';
        rc.fillText(theme.unlockCondition || '', cardX + 20, cy + 50);
        if (theme.gimmickLabel) {
          rc.fillStyle = 'rgba(255,255,255,0.5)';
          rc.fillText(theme.gimmickLabel, cardX + 20, cy + 68);
        }
        rc.restore();
      } else {
        // Theme name
        this.drawNeonText(rc, theme.name + (active ? '  ◀ ACTIVE' : ''), cardX + 20, cy + 26, {
          font: 'bold 15px Orbitron,monospace',
          color: sel ? '#ffffff' : col,
          glowIntensity: sel ? 10 : 0,
          align: 'left',
        });

        // Color swatches
        for (let s = 0; s < 4; s++) {
          rc.save();
          rc.fillStyle = theme.colors.note[s];
          rc.shadowBlur = 6;
          rc.shadowColor = theme.colors.note[s];
          rc.beginPath();
          rc.arc(cardX + 20 + s * 18, cy + 50, 6, 0, Math.PI * 2);
          rc.fill();
          rc.restore();
        }

        // Gimmick label
        rc.save();
        rc.font = '400 10px Orbitron,monospace';
        rc.textAlign = 'left';
        rc.textBaseline = 'middle';
        rc.fillStyle = sel ? `rgba(${_hexToRgb(col)},0.9)` : 'rgba(255,255,255,0.75)';
        rc.fillText(theme.gimmickLabel || 'NO GIMMICK', cardX + 20, cy + 72);
        rc.restore();
      }
    }

    // Hint
    this.drawNeonText(rc, '↑↓ NAVIGATE   •   ENTER / TAP  SELECT   •   ESC BACK', GAME.W / 2, cardY0 + THEME_ORDER.length * (cardH + cardGap) + 20, {
      font: '400 10px Orbitron,monospace',
      color: 'rgba(255,255,255,0.8)',
      glowIntensity: 0,
    });
  }

  renderKeyBindings(rc) {
    rc.fillStyle = '#06001a';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // hud_frame overlay
    const frame = getImage('hud_frame');
    if (frame) {
      rc.save();
      rc.globalAlpha = 0.45;
      rc.drawImage(frame, 35, 95, GAME.W - 70, 500);
      rc.restore();
    }

    // Grid
    rc.save();
    rc.strokeStyle = 'rgba(0,255,255,0.04)';
    rc.lineWidth = 1;
    for (let x = 0; x < GAME.W; x += 40) { rc.beginPath(); rc.moveTo(x,0); rc.lineTo(x,GAME.H); rc.stroke(); }
    for (let y = 0; y < GAME.H; y += 40) { rc.beginPath(); rc.moveTo(0,y); rc.lineTo(GAME.W,y); rc.stroke(); }
    rc.restore();

    // Back hint
    rc.save();
    rc.font = 'bold 10px Orbitron,monospace';
    rc.textAlign = 'left';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#ffffff';
    rc.shadowBlur = 6;
    rc.shadowColor = NEON.WHITE;
    rc.fillText('← BACK', 22, 58);
    rc.restore();

    // Header
    this.drawNeonText(rc, 'KEY  BINDINGS', GAME.W / 2, 150, {
      font: '900 20px Orbitron,monospace',
      color: NEON.CYAN,
      glowIntensity: 20,
    });

    // Divider
    rc.save();
    const grad = rc.createLinearGradient(65, 0, GAME.W - 65, 0);
    grad.addColorStop(0, 'rgba(0, 255, 255, 0)');
    grad.addColorStop(0.5, 'rgba(0, 255, 255, 0.4)');
    grad.addColorStop(1, 'rgba(0, 255, 255, 0)');
    rc.strokeStyle = grad;
    rc.lineWidth = 1;
    rc.beginPath();
    rc.moveTo(65, 175); rc.lineTo(GAME.W - 65, 175);
    rc.stroke();
    rc.restore();

    // 4 lane slots
    const laneNames  = ['LANE 1', 'LANE 2', 'LANE 3', 'LANE 4'];
    const slotStartY = 215;
    const slotGap    = 82;

    for (let i = 0; i < 4; i++) {
      const cy  = slotStartY + i * slotGap;
      const sel = gameState.keybindingSlot === i;
      const col = VISUAL.LANE_COL[i];
      const lbl = gameState.getKeyLabel(i);

      // Lane name label
      this.drawNeonText(rc, laneNames[i], 75, cy, {
        font: 'bold 13px Orbitron,monospace',
        color: sel ? '#ffffff' : col,
        glowIntensity: sel ? 10 : 6,
        align: 'left',
      });

      // Key slot box with glassmorphism
      const bx = 235, bw = 75, bh = 44, by = cy - bh / 2;
      const flash = sel && Math.sin(gameState.pulse * Math.PI * 2 * 3) > 0;
      
      this.drawGlassPanel(rc, bx, by, bw, bh, 8, {
        glowColor: sel ? NEON.PINK : NEON.CYAN,
        fillOpacity: sel ? (flash ? 0.5 : 0.35) : 0.25,
        glowIntensity: sel ? 18 : 8,
      });

      // Key label
      this.drawNeonText(rc, sel && flash ? '_' : lbl, bx + bw / 2, cy, {
        font: 'bold 20px Orbitron,monospace',
        color: sel ? '#ff88ff' : NEON.CYAN,
        glowIntensity: 10,
      });
    }

    // Hint text
    const hintText = gameState.keybindingSlot >= 0
      ? 'PRESS ANY KEY TO ASSIGN  •  ESC TO CANCEL'
      : '↑↓ / TAP TO SELECT   •   ENTER TO ASSIGN   •   ESC BACK';
    
    this.drawNeonText(rc, hintText, GAME.W / 2, 555, {
      font: '400 10px Orbitron,monospace',
      color: 'rgba(255,255,255,0.85)',
      glowIntensity: 0,
    });
  }

  renderSettings(rc) {
    rc.fillStyle = '#06001a';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // Grid
    rc.save();
    rc.strokeStyle = 'rgba(255,0,255,0.04)';
    rc.lineWidth = 1;
    for (let x = 0; x < GAME.W; x += 40) { rc.beginPath(); rc.moveTo(x,0); rc.lineTo(x,GAME.H); rc.stroke(); }
    for (let y = 0; y < GAME.H; y += 40) { rc.beginPath(); rc.moveTo(0,y); rc.lineTo(GAME.W,y); rc.stroke(); }
    rc.restore();

    // Back hint
    rc.save();
    rc.font = 'bold 11px Orbitron,monospace';
    rc.textAlign = 'left';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#ffffff';
    rc.shadowBlur = 6;
    rc.shadowColor = NEON.WHITE;
    rc.fillText('← BACK', 22, 58);
    rc.restore();

    // Header
    this.drawNeonText(rc, 'SETTINGS', GAME.W / 2, 150, {
      font: '900 20px Orbitron,monospace',
      color: NEON.PINK,
      glowIntensity: 20,
    });

    // Divider
    rc.save();
    const grad = rc.createLinearGradient(45, 0, GAME.W - 45, 0);
    grad.addColorStop(0, 'rgba(255, 0, 255, 0)');
    grad.addColorStop(0.5, 'rgba(255, 0, 255, 0.4)');
    grad.addColorStop(1, 'rgba(255, 0, 255, 0)');
    rc.strokeStyle = grad;
    rc.lineWidth = 1;
    rc.beginPath();
    rc.moveTo(45, 175); rc.lineTo(GAME.W - 45, 175);
    rc.stroke();
    rc.restore();

    const pillW = 54, pillH = 30, pillGap = 7;
    const _drawPills = (label, levels, activeIdx, rowY) => {
      // Label
      this.drawNeonText(rc, label, 26, rowY, {
        font: 'bold 11px Orbitron,monospace',
        color: NEON.WHITE,
        glowIntensity: 0,
        align: 'left',
      });

      const totalW = levels.length * pillW + (levels.length - 1) * pillGap;
      const startX = (GAME.W - totalW) / 2;
      for (let i = 0; i < levels.length; i++) {
        const active = i === activeIdx;
        const ox = startX + i * (pillW + pillGap);
        
        this.drawGlassPanel(rc, ox, rowY + 16, pillW, pillH, 6, {
          glowColor: active ? NEON.PINK : 'rgba(255, 255, 255, 0.3)',
          fillOpacity: active ? 0.45 : 0.2,
          glowIntensity: active ? 12 : 0,
        });
        
        rc.save();
        rc.font = 'bold 10px Orbitron,monospace';
        rc.textAlign = 'center';
        rc.textBaseline = 'middle';
        rc.fillStyle = active ? '#ff88ff' : 'rgba(255,255,255,0.85)';
        rc.fillText(String(levels[i]), ox + pillW / 2, rowY + 16 + pillH / 2);
        rc.restore();
      }
    };

    // NOTE SPEED row
    _drawPills(
      'NOTE SPEED',
      NOTE_SPEED_LEVELS.map(v => `${v}×`),
      gameState.noteSpeedIdx,
      215
    );

    // JUDGMENT LINE row
    _drawPills(
      'JUDGMENT LINE',
      JUDGMENT_LINE_LEVELS.map(v => `${Math.round(v * 100)}%`),
      JUDGMENT_LINE_LEVELS.indexOf(gameState.judgmentLineY),
      315
    );

    // Live judgment line preview
    rc.save();
    const previewTop = 425, previewH = 120, previewX = 45, previewW = GAME.W - 90;
    
    this.drawNeonText(rc, 'PREVIEW', GAME.W / 2, previewTop - 12, {
      font: '400 9px Orbitron,monospace',
      color: 'rgba(255,255,255,0.5)',
      glowIntensity: 0,
    });
    
    this.drawGlassPanel(rc, previewX, previewTop, previewW, previewH, 8, {
      glowColor: 'rgba(255, 255, 255, 0.2)',
      fillOpacity: 0.2,
    });
    
    // Scaled judgment line inside preview
    const lineRelY = previewTop + previewH * gameState.judgmentLineY;
    rc.shadowBlur = 14;
    rc.shadowColor = NEON.CYAN;
    rc.strokeStyle = NEON.CYAN;
    rc.lineWidth = 3;
    rc.beginPath();
    rc.moveTo(previewX + 5, lineRelY);
    rc.lineTo(previewX + previewW - 5, lineRelY);
    rc.stroke();
    rc.restore();

    // Hints
    this.drawNeonText(rc, '←→ / TAP  •  [ ] SPEED  •  , . LINE  •  ESC BACK', GAME.W / 2, 585, {
      font: '400 10px Orbitron,monospace',
      color: 'rgba(255,255,255,0.55)',
      glowIntensity: 0,
    });
  }

  renderEscConfirm(rc) {
    rc.save();

    // Upper half = YES zone (glassmorphism)
    rc.fillStyle = 'rgba(0,0,20,0.8)';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // Glassmorphism dialog
    const dialogX = 30, dialogY = GAME.H / 2 - 90, dialogW = GAME.W - 60, dialogH = 180;
    this.drawGlassPanel(rc, dialogX, dialogY, dialogW, dialogH, 16, {
      glowColor: NEON.CYAN,
      fillOpacity: 0.7,
      glowIntensity: 25,
    });

    this.drawNeonText(rc, 'RETURN TO MENU?', GAME.W / 2, dialogY + 45, {
      font: '900 20px Orbitron,monospace',
      color: NEON.WHITE,
      glowIntensity: 16,
    });

    // YES button
    const yesBtnX = (GAME.W - 200) / 2, yesBtnY = dialogY + 75, yesBtnW = 200, yesBtnH = 38;
    this.drawGlassPanel(rc, yesBtnX, yesBtnY, yesBtnW, yesBtnH, 8, {
      glowColor: NEON.CYAN,
      fillOpacity: 0.4,
    });
    this.drawNeonText(rc, 'Y / ENTER → YES', GAME.W / 2, yesBtnY + yesBtnH / 2 - 2, {
      font: 'bold 12px Orbitron,monospace',
      color: NEON.CYAN,
      glowIntensity: 10,
    });
    this.drawNeonText(rc, 'TAP TOP', GAME.W / 2, yesBtnY + yesBtnH / 2 + 12, {
      font: '400 8px Orbitron,monospace',
      color: 'rgba(0,255,255,0.5)',
      glowIntensity: 0,
    });

    // NO button
    const noBtnX = (GAME.W - 200) / 2, noBtnY = yesBtnY + yesBtnH + 12, noBtnW = 200, noBtnH = 38;
    this.drawGlassPanel(rc, noBtnX, noBtnY, noBtnW, noBtnH, 8, {
      glowColor: NEON.PINK,
      fillOpacity: 0.4,
    });
    this.drawNeonText(rc, 'N / ESC → CANCEL', GAME.W / 2, noBtnY + noBtnH / 2 - 2, {
      font: 'bold 12px Orbitron,monospace',
      color: NEON.PINK,
      glowIntensity: 10,
    });
    this.drawNeonText(rc, 'TAP BOTTOM', GAME.W / 2, noBtnY + noBtnH / 2 + 12, {
      font: '400 8px Orbitron,monospace',
      color: 'rgba(255,0,255,0.5)',
      glowIntensity: 0,
    });

    rc.restore();
  }

  renderGameOver(rc) {
    rc.save();
    rc.fillStyle = 'rgba(4,0,20,0.94)';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // Grid overlay
    rc.save();
    rc.strokeStyle = 'rgba(255,0,255,0.03)';
    rc.lineWidth = 1;
    for (let x = 0; x < GAME.W; x += 35) { rc.beginPath(); rc.moveTo(x,0); rc.lineTo(x,GAME.H); rc.stroke(); }
    for (let y = 0; y < GAME.H; y += 35) { rc.beginPath(); rc.moveTo(0,y); rc.lineTo(GAME.W,y); rc.stroke(); }
    rc.restore();

    // Header
    this.drawNeonText(rc, 'NEON//BEAT', GAME.W / 2, 62, {
      font: '900 18px Orbitron,monospace',
      color: NEON.PINK,
      glowIntensity: 20,
    });

    // Track title
    const track = TRACKS[gameState.selectedTrack];
    if (track) {
      this.drawNeonText(rc, track.title.toUpperCase(), GAME.W / 2, 88, {
        font: '400 12px Orbitron,monospace',
        color: 'rgba(255,255,255,0.7)',
        glowIntensity: 0,
      });
    }

    // Stats table
    const total    = gameState.perfectCount + gameState.goodCount + gameState.missCount;
    const accuracy = total > 0
      ? (gameState.perfectCount + gameState.goodCount * 0.5) / total * 100
      : 100;

    const rows = [
      { label: 'PERFECT',   value: String(gameState.perfectCount),           color: NEON.CYAN  },
      { label: 'GOOD',      value: String(gameState.goodCount),               color: NEON.GOLD  },
      { label: 'MISS',      value: String(gameState.missCount),               color: '#ff4444'  },
      { label: 'MAX COMBO', value: `${gameState.maxCombo}×`,                  color: NEON.PINK  },
      { label: 'ACCURACY',  value: `${accuracy.toFixed(1)}%`,                 color: NEON.WHITE },
    ];

    const rowStartY = 122;
    const rowH      = 46;
    const labelX    = 55;
    const valueBoxX = GAME.W - 150;
    const valueBoxW = 115;
    const valueBoxH = 32;

    for (let i = 0; i < rows.length; i++) {
      const { label, value, color } = rows[i];
      const cy = rowStartY + i * rowH + rowH / 2;

      // Label
      rc.save();
      rc.font = 'bold 12px Orbitron,monospace';
      rc.textAlign    = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle    = 'rgba(255,255,255,0.8)';
      rc.fillText(label, labelX, cy);
      rc.restore();

      // Value box with glassmorphism
      this.drawGlassPanel(rc, valueBoxX, cy - valueBoxH / 2, valueBoxW, valueBoxH, 6, {
        glowColor: color,
        fillOpacity: 0.25,
        glowIntensity: 8,
      });

      // Value text
      this.drawNeonText(rc, value, valueBoxX + valueBoxW / 2, cy, {
        font: 'bold 13px Orbitron,monospace',
        color: color,
        glowIntensity: 10,
      });
    }

    // Score
    const scoreY = rowStartY + rows.length * rowH + 30;
    this.drawNeonText(rc, 'SCORE', GAME.W / 2, scoreY - 4, {
      font: '400 11px Orbitron,monospace',
      color: 'rgba(255,255,255,0.65)',
      glowIntensity: 0,
    });
    this.drawNeonText(rc, gameState.score.toLocaleString(), GAME.W / 2, scoreY + 28, {
      font: 'bold 32px Orbitron,monospace',
      color: NEON.GOLD,
      glowIntensity: 22,
    });

    // Grade
    let grade, gradeColor;
    if (accuracy >= 100) { grade = 'S'; gradeColor = NEON.GOLD; }
    else if (accuracy >= 95) { grade = 'A'; gradeColor = NEON.CYAN; }
    else if (accuracy >= 85) { grade = 'B'; gradeColor = '#00ff88'; }
    else if (accuracy >= 70) { grade = 'C'; gradeColor = NEON.GOLD; }
    else                      { grade = 'D'; gradeColor = '#ff4422'; }

    const gradeY = scoreY + 82;
    this.drawNeonText(rc, 'GRADE', GAME.W / 2, gradeY - 4, {
      font: '400 11px Orbitron,monospace',
      color: 'rgba(255,255,255,0.65)',
      glowIntensity: 0,
    });
    this.drawNeonText(rc, grade, GAME.W / 2, gradeY + 40, {
      font: '900 52px Orbitron,monospace',
      color: gradeColor,
      glowIntensity: 28,
    });

    // Divider
    const divY = gradeY + 76;
    rc.save();
    const divGrad = rc.createLinearGradient(45, 0, GAME.W - 45, 0);
    divGrad.addColorStop(0, 'rgba(255, 255, 255, 0)');
    divGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.15)');
    divGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    rc.strokeStyle = divGrad;
    rc.lineWidth   = 1;
    rc.beginPath();
    rc.moveTo(45, divY); rc.lineTo(GAME.W - 45, divY);
    rc.stroke();
    rc.restore();

    // Buttons
    const retryBtnY = divY + 26;
    const retryBtnX = (GAME.W - 180) / 2;
    
    this.drawGlassPanel(rc, retryBtnX, retryBtnY, 180, 42, 10, {
      glowColor: NEON.PINK,
      fillOpacity: 0.35,
      glowIntensity: 16,
    });
    this.drawNeonText(rc, '↻  RETRY', GAME.W / 2, retryBtnY + 21, {
      font: 'bold 13px Orbitron,monospace',
      color: NEON.PINK,
      glowIntensity: 10,
    });

    const menuBtnY = retryBtnY + 54;
    const menuBtnX = (GAME.W - 130) / 2;
    
    this.drawGlassPanel(rc, menuBtnX, menuBtnY, 130, 34, 8, {
      glowColor: NEON.CYAN,
      fillOpacity: 0.25,
      glowIntensity: 10,
    });
    this.drawNeonText(rc, 'MENU', GAME.W / 2, menuBtnY + 17, {
      font: 'bold 11px Orbitron,monospace',
      color: 'rgba(0,255,255,0.85)',
      glowIntensity: 6,
    });

    // Keyboard hints
    this.drawNeonText(rc, 'R / ENTER → RETRY   •   ESC → MENU', GAME.W / 2, menuBtnY + 54, {
      font: '400 10px Orbitron,monospace',
      color: 'rgba(255,255,255,0.55)',
      glowIntensity: 0,
    });

    rc.restore();
  }
}

// ── Module-level hex→rgb helper ───────────────────────────────────
function _hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0,2),16),
    g: parseInt(h.slice(2,4),16),
    b: parseInt(h.slice(4,6),16),
    toString() { return `${this.r},${this.g},${this.b}`; }
  };
}
