// ================================================================
// NEON BEAT – Rendering System
// ================================================================

import { GAME, INPUT, VISUAL, GAME_STATES, TRACKS, VIBE_COLORS, SPEED_MULTIPLIERS, SHOP_ITEMS } from './constants.js';
import { getImage } from './assets.js';
import { gameState } from './state.js';
import { musicPlayer } from './music.js';

export class Renderer {
  constructor(ctx, offCtx, offCanvas) {
    this.ctx = ctx;
    this.offCtx = offCtx;
    this.offCanvas = offCanvas;
  }

  render() {
    // Clear and render to offscreen buffer
    this.offCtx.clearRect(0, 0, GAME.W, GAME.H);

    if (gameState.gameState === GAME_STATES.TITLE) {
      this.renderTitle(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else if (gameState.gameState === GAME_STATES.MUSIC_SELECT) {
      this.renderMusicSelect(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else if (gameState.gameState === GAME_STATES.SHOP) {
      this.renderShop(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else if (gameState.gameState === GAME_STATES.KEYBINDINGS) {
      this.renderKeyBindings(this.offCtx);
      this.drawScanlines(this.offCtx);
    } else {
      this.drawScrollBG(this.offCtx);
      this.drawLanes(this.offCtx);
      this.drawKeyButtons(this.offCtx);
      this.drawNotes(this.offCtx);
      this.drawHitZone(this.offCtx);
      this.drawEffects(this.offCtx);
      this.drawHUDFrame(this.offCtx);
      this.drawHUD(this.offCtx);
      this.drawMuteButton(this.offCtx);
      this.drawTrackName(this.offCtx);
      this.drawJudgment(this.offCtx);
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
      this.drawScanlines(this.ctx);
    }

    // ESC-to-menu confirmation overlay
    if (gameState.escConfirm) {
      this.renderEscConfirm(this.ctx);
    }
  }

  drawScrollBG(rc) {
    rc.fillStyle = '#06001a';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // Skyline (upper half, slower)
    const sky = getImage('bg_sky');
    if (sky) {
      const th = sky.naturalHeight * (GAME.W / sky.naturalWidth);
      const offset = gameState.bgSky % th;
      rc.save();
      rc.globalAlpha = 0.6;
      for (let y = -offset; y < GAME.H * 0.55; y += th) {
        rc.drawImage(sky, 0, y, GAME.W, th);
      }
      rc.restore();
    }

    // Road (full canvas, faster)
    const road = getImage('bg_road');
    if (road) {
      const th = road.naturalHeight * (GAME.W / road.naturalWidth);
      const offset = gameState.bgRoad % th;
      for (let y = -offset; y < GAME.H; y += th) {
        rc.drawImage(road, 0, y, GAME.W, th);
      }
    }

    // Atmospheric vignette
    const vignette = rc.createRadialGradient(
      GAME.W / 2, GAME.H * 0.55, GAME.H * 0.15,
      GAME.W / 2, GAME.H * 0.55, GAME.H * 0.65
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(4,0,20,0.7)');
    rc.fillStyle = vignette;
    rc.fillRect(0, 0, GAME.W, GAME.H);
  }

  drawLanes(rc) {
    const lc = gameState.laneCount;
    const lw = gameState.laneW;
    rc.save();

    // Dividers
    for (let i = 1; i < lc; i++) {
      rc.strokeStyle = 'rgba(255,255,255,0.06)';
      rc.lineWidth = 1;
      rc.beginPath();
      rc.moveTo(i * lw, 0);
      rc.lineTo(i * lw, GAME.H);
      rc.stroke();
    }

    // Key-press lane glow
    for (let i = 0; i < lc; i++) {
      const alpha = (gameState.keyDown[i] ? 0.13 : 0) + ((gameState.keyFlash[i] || 0) / 200) * 0.14;
      if (alpha > 0.01) {
        rc.fillStyle = `rgba(${i % 2 === 0 ? '0,255,255' : '255,0,255'},${alpha.toFixed(3)})`;
        rc.fillRect(i * lw, 0, lw, GAME.H);
      }
    }

    rc.restore();
  }

  drawHitZone(rc) {
    rc.save();
    
    // Glow line
    rc.shadowBlur = 18;
    rc.shadowColor = 'rgba(255,255,255,0.9)';
    rc.strokeStyle = 'rgba(255,255,255,0.5)';
    rc.lineWidth = 2;
    rc.beginPath();
    rc.moveTo(0, GAME.HIT_Y);
    rc.lineTo(GAME.W, GAME.HIT_Y);
    rc.stroke();

    // Per-lane circles
    const lc = gameState.laneCount;
    const lw = gameState.laneW;
    for (let i = 0; i < lc; i++) {
      const cx = i * lw + lw / 2;
      const col = VISUAL.LANE_COL[i];
      const pressed = gameState.keyDown[i] || (gameState.keyFlash[i] || 0) > 0;

      rc.shadowBlur = pressed ? 24 : 8;
      rc.shadowColor = col;
      rc.strokeStyle = col;
      rc.lineWidth = pressed ? 3 : 1.5;
      rc.beginPath();
      rc.arc(cx, GAME.HIT_Y, lw / 2 - 12, 0, Math.PI * 2);
      rc.stroke();

      if (pressed) {
        rc.globalAlpha = 0.22;
        rc.fillStyle = col;
        rc.beginPath();
        rc.arc(cx, GAME.HIT_Y, lw / 2 - 12, 0, Math.PI * 2);
        rc.fill();
        rc.globalAlpha = 1;
      }
    }
    
    rc.restore();
  }

  drawNotes(rc) {
    const noteCyan    = getImage('note_cyan');
    const noteMagenta = getImage('note_magenta');
    const overclock   = gameState.hasModifier('overclock') ? 1.2 : 1.0;
    const spd = GAME.SPD * SPEED_MULTIPLIERS[gameState.speedMultiplierIdx] * overclock;
    const ghostNotes  = gameState.hasModifier('ghost_notes');
    const lw = gameState.laneW;
    const nw = gameState.noteW;

    // First pass: hold bodies (drawn behind note caps)
    for (const note of gameState.notes) {
      if (note.type !== 'hold') continue;
      if (note.state === 'active' || note.state === 'holding') {
        this._drawHoldBody(rc, note, spd);
      }
    }

    // Second pass: note caps (tap + hold head)
    for (const note of gameState.notes) {
      if (note.state !== 'active') continue;
      if (note.y < GAME.SPAWN_Y - 10 || note.y > GAME.HIT_Y + 60) continue;

      const x   = note.lane * lw + (lw - nw) / 2;
      const y   = note.y - GAME.NOTE_H / 2;
      const col = VISUAL.LANE_COL[note.lane];

      // ghost_notes: fade out as the note approaches the hit zone
      let alpha = 1;
      if (ghostNotes) {
        const dist = Math.max(0, GAME.HIT_Y - note.y);
        alpha = Math.min(1, dist / (GAME.HIT_Y * 0.5));
      }

      rc.save();
      rc.globalAlpha = alpha;
      rc.shadowBlur  = 20;
      rc.shadowColor = col;

      if (gameState.noteShape === 'circle') {
        const cx2    = x + nw / 2;
        const cy2    = y + GAME.NOTE_H / 2;
        const radius = Math.min(nw, GAME.NOTE_H) / 2 - 1;
        rc.fillStyle = col;
        rc.beginPath();
        rc.arc(cx2, cy2, radius, 0, Math.PI * 2);
        rc.fill();
        // White ring
        rc.shadowBlur  = 0;
        rc.strokeStyle = 'rgba(255,255,255,0.9)';
        rc.lineWidth   = 2;
        rc.beginPath();
        rc.arc(cx2, cy2, radius, 0, Math.PI * 2);
        rc.stroke();
      } else {
        // Rectangle — full opacity, strong glow, white border
        rc.fillStyle = col;
        rc.beginPath();
        rc.roundRect(x, y, nw, GAME.NOTE_H, 4);
        rc.fill();
        rc.shadowBlur  = 0;
        rc.strokeStyle = 'rgba(255,255,255,0.85)';
        rc.lineWidth   = 2;
        rc.beginPath();
        rc.roundRect(x + 1, y + 1, nw - 2, GAME.NOTE_H - 2, 3);
        rc.stroke();
      }

      rc.restore();
    }
  }

  // ── Hold note body renderer ──────────────────────────────────────
  _drawHoldBody(rc, note, spd) {
    const lw      = gameState.laneW;
    const nw      = gameState.noteW;
    const col     = VISUAL.LANE_COL[note.lane];
    const laneX   = note.lane * lw;
    const capX    = laneX + (lw - nw) / 2;
    const isCyan  = note.lane % 2 === 0;
    const bodyW   = nw - 20;
    const bodyX   = laneX + (lw - bodyW) / 2;
    const fillRgb = isCyan ? '0,255,255' : '255,0,255';

    rc.save();

    if (note.state === 'active') {
      const durationPx = note.duration * spd;
      const headY      = note.y;
      const tailY      = note.y - durationPx;

      // Body rect (clamped to screen, clipped at HIT_Y since head-passed portion is "past")
      const drawTop = Math.max(0, tailY);
      const drawBot = Math.min(GAME.HIT_Y + GAME.NOTE_H / 2, Math.min(GAME.H, headY));
      if (drawBot > drawTop) {
        rc.fillStyle = `rgba(${fillRgb},0.18)`;
        rc.fillRect(bodyX, drawTop, bodyW, drawBot - drawTop);
        rc.strokeStyle = `rgba(${fillRgb},0.45)`;
        rc.lineWidth = 1.5;
        rc.strokeRect(bodyX, drawTop, bodyW, drawBot - drawTop);
      }

      // Tail cap (bright bar at the end of the hold)
      if (tailY >= -8 && tailY <= GAME.H) {
        rc.globalAlpha = 0.80;
        rc.fillStyle = col;
        rc.shadowBlur = 10;
        rc.shadowColor = col;
        rc.beginPath();
        rc.roundRect(capX, tailY - 4, nw, 8, 2);
        rc.fill();
      }

    } else if (note.state === 'holding') {
      const remaining   = Math.max(0, note.duration - note.holdTime);
      const remainingPx = remaining * spd;

      if (remainingPx > 4) {
        const topY = GAME.HIT_Y - remainingPx;

        // Shrinking body above hit line
        rc.fillStyle = `rgba(${fillRgb},0.28)`;
        rc.fillRect(bodyX, topY, bodyW, remainingPx);

        // Moving tail cap
        rc.globalAlpha = 0.90;
        rc.fillStyle = col;
        rc.shadowBlur = 12;
        rc.shadowColor = col;
        rc.beginPath();
        rc.roundRect(capX, topY - 4, nw, 8, 2);
        rc.fill();
      }
    }

    rc.restore();
  }

  // Build a black-background-removed version of hit_fx once, on first use.
  // Maps each pixel's luminance to its alpha so pure black → transparent.
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
      d[i + 3] = Math.min(255, Math.round(lum * 2.2)); // luminance → alpha
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
          console.log(`[hit_fx] drawing effect grade=${effect.grade} at (${effect.x.toFixed(0)},${effect.y.toFixed(0)}) size=${size.toFixed(1)}`);
          effect._drawn = true;
        }
        rc.drawImage(hitFx, -size / 2, -size / 2, size, size);
      } else {
        rc.strokeStyle = effect.grade === 'PERFECT' ? '#ffff00' : '#00ffff';
        rc.lineWidth = 3;
        rc.shadowBlur = 18;
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
    const labels  = lc === 6 ? INPUT.KEY_LABELS_6 : INPUT.KEY_LABELS_4;
    const buttonY = GAME.HIT_Y + 58;
    const size    = Math.min(40, lw - 10);

    for (let i = 0; i < lc; i++) {
      const cx = i * lw + lw / 2;
      const col = VISUAL.LANE_COL[i];
      const pressed = gameState.keyDown[i];

      rc.save();
      rc.shadowBlur = pressed ? 20 : 6;
      rc.shadowColor = col;
      rc.strokeStyle = col;
      rc.lineWidth = 1.5;
      rc.fillStyle = pressed ? col : 'rgba(0,0,0,0.6)';
      rc.beginPath();
      rc.roundRect(cx - size / 2, buttonY - size / 2, size, size, 7);
      rc.fill();
      rc.stroke();

      rc.font = `bold ${lc === 6 ? 11 : 14}px Orbitron,monospace`;
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = pressed ? '#000' : col;
      rc.shadowBlur = 0;
      rc.fillText(labels[i], cx, buttonY);
      rc.restore();
    }
  }

  drawHUD(rc) {
    rc.save();
    
    // Score (top-right)
    rc.font = 'bold 24px Orbitron,monospace';
    rc.textAlign = 'right';
    rc.textBaseline = 'top';
    rc.fillStyle = '#fff';
    rc.shadowBlur = 10;
    rc.shadowColor = '#00ffff';
    rc.fillText(gameState.score.toString().padStart(8, '0'), GAME.W - 14, 18);
    
    rc.font = '400 9px Orbitron,monospace';
    rc.fillStyle = 'rgba(255,255,255,0.4)';
    rc.shadowBlur = 0;
    rc.fillText('SCORE', GAME.W - 14, 48);

    // Combo (top-left)
    if (gameState.combo > 1) {
      let comboColor;
      if (gameState.combo >= 50) comboColor = '#ff00ff';
      else if (gameState.combo >= 25) comboColor = '#ffff00';
      else if (gameState.combo >= 10) comboColor = '#00ffff';
      else comboColor = '#ffffff';
      
      const comboSize = Math.min(50, 28 + Math.sqrt(gameState.combo) * 1.8) | 0;
      rc.textAlign = 'left';
      rc.font = `900 ${comboSize}px Orbitron,monospace`;
      rc.fillStyle = comboColor;
      rc.shadowBlur = 16;
      rc.shadowColor = comboColor;
      rc.fillText(`${gameState.combo}×`, 14, 16);
      
      rc.font = '400 9px Orbitron,monospace';
      rc.fillStyle = 'rgba(255,255,255,0.4)';
      rc.shadowBlur = 0;
      rc.fillText('COMBO', 14, 16 + comboSize + 4);
    }
    
    rc.restore();
  }

  drawJudgment(rc) {
    if (!gameState.judgeText || gameState.judgeT <= 0) return;
    
    const t = gameState.judgeT / 550;
    let color, glow;
    
    if (gameState.judgeText === 'PERFECT') {
      color = '#ffe040';
      glow = '#ff8000';
    } else if (gameState.judgeText === 'GOOD') {
      color = '#00ffff';
      glow = '#0055ff';
    } else {
      color = '#ff4455';
      glow = '#ff0000';
    }
    
    rc.save();
    rc.globalAlpha = Math.min(1, t * 2);
    rc.translate(GAME.W / 2, GAME.HIT_Y - 86);
    rc.scale(1 + 0.04 * (1 - t), 1 + 0.04 * (1 - t));
    rc.font = '900 21px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = color;
    rc.shadowBlur = 22;
    rc.shadowColor = glow;
    rc.fillText(gameState.judgeText, 0, 0);
    rc.restore();
  }

  drawHUDFrame(rc) {
    const fx = 0, fy = 0, fw = GAME.W, fh = GAME.H;
    if (!this._hudFrameLogged) {
      console.log(`[hud_frame] position=(${fx},${fy}) size=(${fw}x${fh})`);
      this._hudFrameLogged = true;
    }
    const frame = getImage('hud_frame');
    if (frame) {
      rc.save();
      rc.globalAlpha = 0.55;
      rc.drawImage(frame, fx, fy, fw, fh);
      rc.restore();
    }

    // ── Song progress bar (immediately after frame) ─────────────────
    const audio = musicPlayer.audio;
    const audioDur = audio && isFinite(audio.duration) && audio.duration > 0
      ? audio.duration : null;

    // Fallback: derive progress from songTime when audio duration unavailable
    const notes = gameState.notes;
    const fallbackDur = notes && notes.length
      ? (notes[notes.length - 1].time + 3500) / 1000   // ms → seconds
      : null;
    const fallbackElapsed = gameState.songTime / 1000;

    const totalDur    = audioDur ?? fallbackDur;
    const elapsedSec  = audioDur ? audio.currentTime : fallbackElapsed;
    const progress    = totalDur ? Math.max(0, Math.min(1, elapsedSec / totalDur)) : 0;

    const barX = GAME.W * 0.1;
    const barY = 67;
    const barW = GAME.W * 0.8;
    const barH = 6;
    const track = TRACKS[gameState.selectedTrack];
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    rc.save();

    // Track title — top-left, 11px gray
    rc.font = '400 11px Orbitron,monospace';
    rc.textAlign = 'left';
    rc.textBaseline = 'bottom';
    rc.fillStyle = '#888888';
    rc.fillText(track ? track.title.toUpperCase() : '', barX, barY - 2);

    // Progress bar background
    rc.fillStyle = '#2a2a2a';
    rc.strokeStyle = 'rgba(255,255,255,0.08)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.roundRect(barX, barY, barW, barH, 3);
    rc.fill();
    rc.stroke();

    // Filled portion — cyan→magenta gradient
    if (progress > 0) {
      const grad = rc.createLinearGradient(barX, 0, barX + barW, 0);
      grad.addColorStop(0, '#00ffff');
      grad.addColorStop(1, '#ff00ff');
      rc.fillStyle = grad;
      rc.shadowBlur = 4;
      rc.shadowColor = '#00ffff';
      rc.beginPath();
      rc.roundRect(barX, barY, barW * progress, barH, 3);
      rc.fill();
    }

    // Elapsed / total — bottom-right, 11px cyan
    if (totalDur) {
      rc.shadowBlur = 0;
      rc.font = '400 11px Orbitron,monospace';
      rc.textAlign = 'right';
      rc.textBaseline = 'top';
      rc.fillStyle = audioDur ? '#00ffff' : 'rgba(0,255,255,0.45)';
      rc.fillText(`${fmt(elapsedSec)} / ${fmt(totalDur)}`, barX + barW, barY + barH + 3);
    }

    // Chart offset badge — shown only when non-zero
    if (gameState.chartOffset !== 0) {
      rc.shadowBlur = 0;
      rc.font = '400 9px Orbitron,monospace';
      rc.textAlign = 'left';
      rc.textBaseline = 'top';
      rc.fillStyle = 'rgba(255,204,0,0.75)';
      const offLabel = `OFF ${gameState.chartOffset > 0 ? '+' : ''}${gameState.chartOffset}ms`;
      rc.fillText(offLabel, barX, barY + barH + 3);
    }

    rc.restore();
  }

  drawScanlines(rc) {
    rc.save();
    rc.globalAlpha = 0.032;
    rc.fillStyle = '#000';
    for (let y = 0; y < GAME.H; y += 4) {
      rc.fillRect(0, y, GAME.W, 2);
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
    this.ctx.globalAlpha = 0.08 * intensity;
    this.ctx.drawImage(this.offCanvas, -8 * intensity, 0, GAME.W, GAME.H);
    this.ctx.globalAlpha = 0.08 * intensity;
    this.ctx.drawImage(this.offCanvas, 8 * intensity, 0, GAME.W, GAME.H);

    // Bright flash at trigger peak
    if (progress > 0.80) {
      this.ctx.globalCompositeOperation = 'source-over';
      this.ctx.globalAlpha = ((progress - 0.80) / 0.20) * 0.30 * gameState.glitchStr;
      this.ctx.fillStyle = '#ff00ff';
      this.ctx.fillRect(0, 0, GAME.W, GAME.H);
    }

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.globalAlpha = 1;
    this.ctx.restore();
  }

  renderTitle(rc) {
    rc.fillStyle = '#04000f';
    rc.fillRect(0, 0, GAME.W, GAME.H);
    
    const road = getImage('bg_road');
    if (road) {
      const th = road.naturalHeight * (GAME.W / road.naturalWidth);
      const offset = gameState.bgRoad % th;
      rc.save();
      rc.globalAlpha = 0.22;
      for (let y = -offset; y < GAME.H; y += th) {
        rc.drawImage(road, 0, y, GAME.W, th);
      }
      rc.restore();
    }
    
    // Logo
    const logo = getImage('logo');
    if (logo) {
      const logoWidth = 270;
      const logoHeight = 270;
      rc.drawImage(logo, GAME.W / 2 - logoWidth / 2, 140, logoWidth, logoHeight);
    } else {
      rc.font = '900 42px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = '#00ffff';
      rc.shadowBlur = 24;
      rc.shadowColor = '#00ffff';
      rc.fillText('NEON BEAT', GAME.W / 2, 260);
    }
    
    // Subtitle
    rc.font = '400 10px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(0,255,255,0.5)';
    rc.shadowBlur = 0;
    rc.fillText('CYBERPUNK RHYTHM GAME  ♦  128 BPM', GAME.W / 2, 432);
    
    // Blink prompt — show actual bound keys
    if (Math.sin(gameState.pulse * Math.PI * 2 * 1.2) > 0) {
      const startKeys = [0, 1, 2, 3].map(i => gameState.getKeyLabel(i)).join(' / ');
      rc.font = 'bold 12px Orbitron,monospace';
      rc.fillStyle = '#fff';
      rc.shadowBlur = 10;
      rc.shadowColor = '#fff';
      rc.fillText(`PRESS  ${startKeys}  TO START`, GAME.W / 2, 540);
    }

    // Key row (4 keys with current labels)
    const keyY = 598;
    for (let i = 0; i < 4; i++) {
      const cx  = GAME.W / 2 + (i - 1.5) * 62;
      const col = VISUAL.LANE_COL[i];
      rc.save();
      rc.strokeStyle = col;
      rc.lineWidth = 1.5;
      rc.shadowBlur = 8;
      rc.shadowColor = col;
      rc.fillStyle = 'rgba(0,0,0,0.55)';
      rc.beginPath();
      rc.roundRect(cx - 17, keyY - 17, 34, 34, 6);
      rc.fill();
      rc.stroke();
      rc.font = 'bold 13px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = col;
      rc.shadowBlur = 0;
      rc.fillText(gameState.getKeyLabel(i), cx, keyY);
      rc.restore();
    }

    // ── Bottom utility buttons ────────────────────────────────────────
    // [NOTE SHAPE]  [KEYBINDS]
    const btnY  = 656;
    const btnH  = 26;

    // NOTE SHAPE toggle
    const shapeLabel = `NOTE: ${gameState.noteShape === 'circle' ? '\u25cf CIRCLE' : '\u25a0 RECT'}`;
    rc.save();
    rc.font = 'bold 9px Orbitron,monospace';
    const shapeW = rc.measureText(shapeLabel).width + 20;
    const shapeX = GAME.W / 2 - shapeW - 6;
    rc.fillStyle  = 'rgba(0,255,255,0.10)';
    rc.strokeStyle = 'rgba(0,255,255,0.5)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.roundRect(shapeX, btnY, shapeW, btnH, 5);
    rc.fill();
    rc.stroke();
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#00ffff';
    rc.shadowBlur = 0;
    rc.fillText(shapeLabel, shapeX + shapeW / 2, btnY + btnH / 2);
    rc.restore();

    // KEYBINDS button
    const kbLabel = 'KEYBINDS';
    rc.save();
    rc.font = 'bold 9px Orbitron,monospace';
    const kbW = rc.measureText(kbLabel).width + 20;
    const kbX = GAME.W / 2 + 6;
    rc.fillStyle   = 'rgba(255,0,255,0.10)';
    rc.strokeStyle = 'rgba(255,0,255,0.5)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.roundRect(kbX, btnY, kbW, btnH, 5);
    rc.fill();
    rc.stroke();
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#ff00ff';
    rc.shadowBlur = 0;
    rc.fillText(kbLabel, kbX + kbW / 2, btnY + btnH / 2);
    rc.restore();

    // Hint below buttons
    rc.save();
    rc.font = '400 8px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.22)';
    rc.fillText('S \u2192 NOTE SHAPE   \u2022   K \u2192 KEYBINDS', GAME.W / 2, btnY + btnH + 10);
    rc.restore();
  }

  // ── HUD overlay buttons (mute top-left, menu top-right) ─────────
  drawMuteButton(rc) {
    // Mute toggle
    const mx = 8, my = 8, mw = 50, mh = 24;
    rc.save();
    rc.fillStyle = gameState.isMuted ? 'rgba(255,40,40,0.35)' : 'rgba(0,0,0,0.55)';
    rc.strokeStyle = gameState.isMuted ? '#ff4444' : 'rgba(255,255,255,0.25)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.roundRect(mx, my, mw, mh, 5);
    rc.fill();
    rc.stroke();
    rc.font = 'bold 9px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = gameState.isMuted ? '#ff6666' : 'rgba(255,255,255,0.55)';
    rc.fillText(gameState.isMuted ? '\u266a OFF' : '\u266a  ON', mx + mw / 2, my + mh / 2);

    // Menu / back button (top-right, touch-friendly)
    const bx = 332, by = 8, bw = 50, bh = 24;
    rc.fillStyle = 'rgba(0,0,0,0.55)';
    rc.strokeStyle = 'rgba(255,255,255,0.25)';
    rc.lineWidth = 1;
    rc.shadowBlur = 0;
    rc.beginPath();
    rc.roundRect(bx, by, bw, bh, 5);
    rc.fill();
    rc.stroke();
    rc.fillStyle = 'rgba(255,255,255,0.55)';
    rc.fillText('MENU', bx + bw / 2, by + bh / 2);

    rc.restore();
  }

  // ── Track name overlay (shown 2s after track selection) ──────────
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
    const text = `\u266a  ${track.title}`;
    rc.font = 'bold 12px Orbitron,monospace';
    const tw = rc.measureText(text).width + 26;
    const px = (GAME.W - tw) / 2;
    const py = 62;
    const ph = 26;

    rc.fillStyle = 'rgba(0,0,0,0.75)';
    rc.strokeStyle = 'rgba(0,255,255,0.6)';
    rc.lineWidth = 1;
    rc.shadowBlur = 10;
    rc.shadowColor = '#00ffff';
    rc.beginPath();
    rc.roundRect(px, py, tw, ph, 6);
    rc.fill();
    rc.stroke();

    rc.shadowBlur = 0;
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#ffffff';
    rc.fillText(text, GAME.W / 2, py + ph / 2);
    rc.restore();
  }

  // ── Music selection screen ────────────────────────────────────────
  renderMusicSelect(rc) {
    // Background
    rc.fillStyle = '#04001a';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    const sky = getImage('bg_sky');
    if (sky) {
      const th = sky.naturalHeight * (GAME.W / sky.naturalWidth);
      const offset = gameState.bgSky % th;
      rc.save();
      rc.globalAlpha = 0.30;
      for (let y = -offset; y < GAME.H; y += th) {
        rc.drawImage(sky, 0, y, GAME.W, th);
      }
      rc.restore();
    }

    // Panel
    const px = 15, py = 58, pw = 360, ph = 724;
    rc.save();
    rc.fillStyle = 'rgba(4,0,24,0.93)';
    rc.shadowBlur = 28;
    rc.shadowColor = '#00ffff';
    rc.beginPath();
    rc.roundRect(px, py, pw, ph, 10);
    rc.fill();
    rc.strokeStyle = 'rgba(0,255,255,0.45)';
    rc.lineWidth = 1.5;
    rc.stroke();
    rc.restore();

    // hud_frame overlay on panel
    const frame = getImage('hud_frame');
    if (frame) {
      rc.save();
      rc.globalAlpha = 0.14;
      rc.drawImage(frame, px, py, pw, ph);
      rc.restore();
    }

    // Header
    rc.save();
    rc.font = '900 19px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#00ffff';
    rc.shadowBlur = 18;
    rc.shadowColor = '#00ffff';
    rc.fillText('SELECT TRACK', GAME.W / 2, py + 30);
    rc.restore();

    // Divider
    rc.save();
    rc.strokeStyle = 'rgba(0,255,255,0.22)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.moveTo(px + 20, py + 50);
    rc.lineTo(px + pw - 20, py + 50);
    rc.stroke();
    rc.restore();

    // Track cards
    const cardX  = px + 10;
    const cardW  = pw - 20;
    const cardH  = 77;
    const startY = py + 58;

    for (let i = 0; i < TRACKS.length; i++) {
      const track    = TRACKS[i];
      const cardY    = startY + i * cardH;
      const sel      = i === gameState.musicSelectCursor;
      const vc       = VIBE_COLORS[track.vibe] || '#ffffff';
      const [vr, vg, vb] = [
        parseInt(vc.slice(1, 3), 16),
        parseInt(vc.slice(3, 5), 16),
        parseInt(vc.slice(5, 7), 16),
      ];

      // Card bg
      rc.save();
      rc.fillStyle = sel ? 'rgba(0,255,255,0.07)' : 'rgba(255,255,255,0.025)';
      rc.strokeStyle = sel ? 'rgba(0,255,255,0.55)' : 'rgba(255,255,255,0.07)';
      rc.lineWidth = sel ? 1.5 : 1;
      rc.shadowBlur = sel ? 10 : 0;
      rc.shadowColor = '#00ffff';
      rc.beginPath();
      rc.roundRect(cardX, cardY + 3, cardW, cardH - 6, 6);
      rc.fill();
      rc.stroke();
      rc.restore();

      // Selected left bar
      if (sel) {
        rc.save();
        rc.fillStyle = '#00ffff';
        rc.shadowBlur = 8;
        rc.shadowColor = '#00ffff';
        rc.fillRect(cardX, cardY + 10, 3, cardH - 20);
        rc.restore();
      }

      const midY  = cardY + cardH / 2;
      const lineA = midY - 11;
      const lineB = midY + 10;

      // Track number
      rc.save();
      rc.font = `bold 10px Orbitron,monospace`;
      rc.textAlign = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle = sel ? '#00ffff' : 'rgba(255,255,255,0.28)';
      rc.shadowBlur = sel ? 5 : 0;
      rc.shadowColor = '#00ffff';
      rc.fillText(`${i + 1}.`, cardX + 14, lineA);
      rc.restore();

      // Track title
      rc.save();
      rc.font = `bold 13px Orbitron,monospace`;
      rc.textAlign = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle = sel ? '#ffffff' : 'rgba(255,255,255,0.82)';
      rc.shadowBlur = sel ? 5 : 0;
      rc.shadowColor = '#fff';
      rc.fillText(track.title, cardX + 38, lineA, 185);
      rc.restore();

      // Artist
      rc.save();
      rc.font = `400 10px Orbitron,monospace`;
      rc.textAlign = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle = 'rgba(255,255,255,0.38)';
      rc.fillText(track.artist, cardX + 38, lineB);
      rc.restore();

      // Vibe pill (top-right of card)
      rc.save();
      rc.font = 'bold 9px Orbitron,monospace';
      rc.textBaseline = 'middle';
      rc.textAlign = 'center';
      const vibeW = rc.measureText(track.vibe).width + 14;
      const vx = cardX + cardW - vibeW - 10;
      const vy = lineA - 9;
      const vh = 18;
      rc.fillStyle = `rgba(${vr},${vg},${vb},0.18)`;
      rc.strokeStyle = vc;
      rc.lineWidth = 1;
      rc.beginPath();
      rc.roundRect(vx, vy, vibeW, vh, 9);
      rc.fill();
      rc.stroke();
      rc.fillStyle = vc;
      rc.shadowBlur = 4;
      rc.shadowColor = vc;
      rc.fillText(track.vibe, vx + vibeW / 2, vy + vh / 2);
      rc.restore();

      // Preview hint (selected card only)
      if (sel) {
        rc.save();
        rc.font = '400 9px Orbitron,monospace';
        rc.textAlign = 'right';
        rc.textBaseline = 'middle';
        rc.fillStyle = 'rgba(255,255,255,0.32)';
        rc.fillText('\u25b6 SPACE', cardX + cardW - 10, lineB);
        rc.restore();
      }
    }

    // ── Speed multiplier selector ─────────────────────────────────
    const selectorY = startY + TRACKS.length * cardH + 16;

    rc.save();
    rc.font = 'bold 10px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.38)';
    rc.fillText('FALL SPEED', GAME.W / 2, selectorY);

    const optW = 58, optH = 26, optGap = 8;
    const totalW = SPEED_MULTIPLIERS.length * optW + (SPEED_MULTIPLIERS.length - 1) * optGap;
    const optStartX = (GAME.W - totalW) / 2;

    for (let i = 0; i < SPEED_MULTIPLIERS.length; i++) {
      const active = i === gameState.speedMultiplierIdx;
      const ox = optStartX + i * (optW + optGap);
      const oy = selectorY + 14;
      rc.fillStyle = active ? 'rgba(0,255,255,0.18)' : 'rgba(255,255,255,0.04)';
      rc.strokeStyle = active ? '#00ffff' : 'rgba(255,255,255,0.12)';
      rc.lineWidth = active ? 1.5 : 1;
      rc.shadowBlur = active ? 8 : 0;
      rc.shadowColor = '#00ffff';
      rc.beginPath();
      rc.roundRect(ox, oy, optW, optH, 5);
      rc.fill();
      rc.stroke();
      rc.shadowBlur = 0;
      rc.fillStyle = active ? '#00ffff' : 'rgba(255,255,255,0.42)';
      rc.fillText(`${SPEED_MULTIPLIERS[i]}x`, ox + optW / 2, oy + optH / 2);
    }

    // Arrow hints
    rc.fillStyle = 'rgba(255,255,255,0.25)';
    rc.fillText('\u2190', optStartX - 14, selectorY + 14 + optH / 2);
    rc.fillText('\u2192', optStartX + totalW + 14, selectorY + 14 + optH / 2);
    rc.restore();

    // ── Chart offset display ──────────────────────────────────────
    const offsetY = selectorY + 14 + optH + 16;
    rc.save();
    rc.font = 'bold 10px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    const off = gameState.chartOffset;
    const offStr = off === 0 ? 'OFFSET  0 ms' : `OFFSET  ${off > 0 ? '+' : ''}${off} ms`;
    rc.fillStyle = off !== 0 ? '#ffcc00' : 'rgba(255,255,255,0.28)';
    rc.shadowBlur = off !== 0 ? 6 : 0;
    rc.shadowColor = '#ffcc00';
    rc.fillText(offStr, GAME.W / 2, offsetY);
    rc.font = '400 8px Orbitron,monospace';
    rc.fillStyle = 'rgba(255,255,255,0.2)';
    rc.shadowBlur = 0;
    rc.fillText('[ \u2212 10ms       ] + 10ms', GAME.W / 2, offsetY + 14);
    rc.restore();

    // ── Footer hints ──────────────────────────────────────────────
    rc.save();
    rc.font = '400 9px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.28)';
    rc.fillText('\u2191\u2193 NAVIGATE  \u2022  \u2190\u2192 SPEED  \u2022  [ ] OFFSET',
      GAME.W / 2, py + ph - 32);
    rc.fillText('ENTER/TAP\u00d72 SELECT  \u2022  SPACE PREVIEW  \u2022  ESC BACK',
      GAME.W / 2, py + ph - 16);
    rc.restore();

    // ── BACK button (above panel, top-left) ───────────────────────
    rc.save();
    rc.font = 'bold 10px Orbitron,monospace';
    rc.textAlign = 'left';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.38)';
    rc.shadowBlur = 0;
    rc.fillText('\u2190 BACK', px + 4, py - 18);
    rc.restore();

    // ── START button (below panel) ────────────────────────────────
    const btnW = 200, btnH = 36;
    const btnX = (GAME.W - btnW) / 2;
    const btnY = 793;
    const selTrack = TRACKS[gameState.musicSelectCursor];
    rc.save();
    rc.fillStyle = 'rgba(0,255,255,0.14)';
    rc.strokeStyle = '#00ffff';
    rc.lineWidth = 1.5;
    rc.shadowBlur = 14;
    rc.shadowColor = '#00ffff';
    rc.beginPath();
    rc.roundRect(btnX, btnY, btnW, btnH, 8);
    rc.fill();
    rc.stroke();
    rc.shadowBlur = 6;
    rc.font = 'bold 13px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#00ffff';
    rc.fillText(`\u25b6  ${selTrack ? selTrack.title.toUpperCase() : 'PLAY'}`,
      GAME.W / 2, btnY + btnH / 2);
    rc.restore();
  }

  // ── Shop screen ───────────────────────────────────────────────────
  renderShop(rc) {
    // Background
    rc.fillStyle = '#02000d';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // Grid lines
    rc.save();
    rc.strokeStyle = 'rgba(255,0,255,0.07)';
    rc.lineWidth = 1;
    for (let x = 0; x < GAME.W; x += 32) { rc.beginPath(); rc.moveTo(x,0); rc.lineTo(x,GAME.H); rc.stroke(); }
    for (let y = 0; y < GAME.H; y += 32) { rc.beginPath(); rc.moveTo(0,y); rc.lineTo(GAME.W,y); rc.stroke(); }
    rc.restore();

    // Header
    rc.save();
    rc.font = '900 22px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#ff00ff';
    rc.shadowBlur = 20;
    rc.shadowColor = '#ff00ff';
    rc.fillText('JACK IN  //  SHOP', GAME.W / 2, 52);
    rc.restore();

    // Credits display (top-right)
    rc.save();
    rc.font = 'bold 14px Orbitron,monospace';
    rc.textAlign = 'right';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#00ffff';
    rc.shadowBlur = 8;
    rc.shadowColor = '#00ffff';
    rc.fillText(`\u25c6 ${gameState.credits} CR`, GAME.W - 16, 52);
    rc.restore();

    // Active track name
    const track = TRACKS[gameState.selectedTrack];
    if (track) {
      rc.save();
      rc.font = '400 9px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = 'rgba(255,255,255,0.30)';
      rc.fillText(`\u266a  ${track.title.toUpperCase()}`, GAME.W / 2, 76);
      rc.restore();
    }

    // Divider
    rc.save();
    rc.strokeStyle = 'rgba(255,0,255,0.25)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.moveTo(20, 88); rc.lineTo(GAME.W - 20, 88);
    rc.stroke();
    rc.restore();

    // ── Item cards ───────────────────────────────────────────────────
    const items   = gameState.shopItems;
    const nCards  = items.length;
    const cardW   = 110;
    const cardH   = 236;
    const gap     = (GAME.W - nCards * cardW) / (nCards + 1);
    const cardY   = 104;

    for (let i = 0; i < nCards; i++) {
      const item  = items[i];
      const cx    = gap + i * (cardW + gap);
      const sel   = i === gameState.shopCursor;
      const owned = item.purchased || gameState.hasModifier(item.id);
      const canBuy = !owned && gameState.credits >= item.cost;

      // Card bg
      rc.save();
      rc.fillStyle = sel
        ? 'rgba(255,0,255,0.10)'
        : 'rgba(255,255,255,0.03)';
      rc.strokeStyle = sel
        ? '#ff00ff'
        : owned ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.08)';
      rc.lineWidth = sel ? 1.5 : 1;
      rc.shadowBlur = sel ? 12 : 0;
      rc.shadowColor = '#ff00ff';
      rc.beginPath();
      rc.roundRect(cx, cardY, cardW, cardH, 8);
      rc.fill();
      rc.stroke();
      rc.restore();

      // Item name
      rc.save();
      rc.font = 'bold 10px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'top';
      rc.fillStyle = sel ? '#ff88ff' : 'rgba(255,255,255,0.85)';
      rc.shadowBlur = sel ? 6 : 0;
      rc.shadowColor = '#ff00ff';
      // wrap long names
      const words = item.name.split(' ');
      if (words.length > 1 && rc.measureText(item.name).width > cardW - 12) {
        rc.fillText(words[0], cx + cardW / 2, cardY + 14);
        rc.fillText(words.slice(1).join(' '), cx + cardW / 2, cardY + 26);
      } else {
        rc.fillText(item.name, cx + cardW / 2, cardY + 18);
      }
      rc.restore();

      // Description
      rc.save();
      rc.font = '400 8px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'top';
      rc.fillStyle = 'rgba(255,255,255,0.45)';
      // Split desc at '/' for two lines
      const parts = item.desc.split('/');
      parts.forEach((p, idx) => {
        rc.fillText(p.trim(), cx + cardW / 2, cardY + 52 + idx * 14);
      });
      rc.restore();

      // Cost
      rc.save();
      rc.font = 'bold 18px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      const costColor = owned ? 'rgba(255,255,255,0.2)'
        : canBuy ? '#ffcc00'
        : 'rgba(255,100,100,0.7)';
      rc.fillStyle = costColor;
      rc.shadowBlur = canBuy && !owned ? 8 : 0;
      rc.shadowColor = '#ffcc00';
      rc.fillText(item.cost === 0 ? 'FREE' : `${item.cost}`, cx + cardW / 2, cardY + 118);
      if (!owned && item.cost > 0) {
        rc.font = '400 8px Orbitron,monospace';
        rc.shadowBlur = 0;
        rc.fillStyle = 'rgba(255,204,0,0.5)';
        rc.fillText('CR', cx + cardW / 2, cardY + 134);
      }
      rc.restore();

      // BUY / OWNED button
      const btnW = cardW - 20, btnH = 28;
      const btnX = cx + 10, btnY = cardY + cardH - 44;
      rc.save();
      if (owned) {
        rc.fillStyle = 'rgba(255,255,255,0.06)';
        rc.strokeStyle = 'rgba(255,255,255,0.15)';
      } else if (canBuy) {
        rc.fillStyle = sel ? 'rgba(255,0,255,0.22)' : 'rgba(255,0,255,0.10)';
        rc.strokeStyle = '#ff00ff';
        rc.shadowBlur = sel ? 10 : 0;
        rc.shadowColor = '#ff00ff';
      } else {
        rc.fillStyle = 'rgba(255,255,255,0.03)';
        rc.strokeStyle = 'rgba(255,255,255,0.10)';
      }
      rc.lineWidth = 1;
      rc.beginPath();
      rc.roundRect(btnX, btnY, btnW, btnH, 5);
      rc.fill();
      rc.stroke();
      rc.shadowBlur = 0;
      rc.font = 'bold 9px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = owned
        ? 'rgba(255,255,255,0.25)'
        : canBuy ? '#ff88ff' : 'rgba(255,80,80,0.5)';
      rc.fillText(
        owned ? '[ OWNED ]' : canBuy ? '[ BUY ]' : '[ N/A ]',
        btnX + btnW / 2, btnY + btnH / 2
      );
      rc.restore();
    }

    // ── Active modifiers row ─────────────────────────────────────────
    const mods = gameState.currentRun.modifiers;
    if (mods.length > 0) {
      const rowY = cardY + cardH + 16;
      rc.save();
      rc.font = '400 8px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = 'rgba(255,255,255,0.30)';
      rc.fillText('ACTIVE MODS', GAME.W / 2, rowY);
      let pillX = 16;
      const pillY = rowY + 14;
      for (const id of mods) {
        const item = SHOP_ITEMS.find(s => s.id === id);
        const label = item ? item.name : id.toUpperCase();
        rc.font = 'bold 8px Orbitron,monospace';
        const pw = rc.measureText(label).width + 12;
        rc.fillStyle = 'rgba(255,0,255,0.18)';
        rc.strokeStyle = 'rgba(255,0,255,0.6)';
        rc.lineWidth = 1;
        rc.beginPath();
        rc.roundRect(pillX, pillY, pw, 18, 9);
        rc.fill();
        rc.stroke();
        rc.fillStyle = '#ff88ff';
        rc.shadowBlur = 0;
        rc.fillText(label, pillX + pw / 2, pillY + 9);
        pillX += pw + 6;
        if (pillX > GAME.W - 20) break;
      }
      rc.restore();
    }

    // ── START button ─────────────────────────────────────────────────
    const btnW2 = 200, btnH2 = 38;
    const btnX2 = (GAME.W - btnW2) / 2, btnY2 = 770;
    rc.save();
    rc.fillStyle = 'rgba(0,255,255,0.12)';
    rc.strokeStyle = '#00ffff';
    rc.lineWidth = 1.5;
    rc.shadowBlur = 12;
    rc.shadowColor = '#00ffff';
    rc.beginPath();
    rc.roundRect(btnX2, btnY2, btnW2, btnH2, 8);
    rc.fill();
    rc.stroke();
    rc.shadowBlur = 5;
    rc.font = 'bold 13px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#00ffff';
    rc.fillText('\u25b6  START', GAME.W / 2, btnY2 + btnH2 / 2);
    rc.restore();

    // Keyboard hints
    rc.save();
    rc.font = '400 9px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.22)';
    rc.fillText('\u2190\u2192 SELECT   \u2022   ENTER BUY   \u2022   S / TAP START', GAME.W / 2, 820);
    rc.restore();
  }

  // ── Key bindings screen ───────────────────────────────────────────
  renderKeyBindings(rc) {
    rc.fillStyle = '#02000d';
    rc.fillRect(0, 0, GAME.W, GAME.H);

    // hud_frame overlay
    const frame = getImage('hud_frame');
    if (frame) {
      rc.save();
      rc.globalAlpha = 0.35;
      rc.drawImage(frame, 30, 90, GAME.W - 60, 520);
      rc.restore();
    }

    // Back hint (top-left)
    rc.save();
    rc.font = 'bold 10px Orbitron,monospace';
    rc.textAlign = 'left';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.35)';
    rc.fillText('\u2190 BACK', 20, 56);
    rc.restore();

    // Header
    rc.save();
    rc.font = '900 20px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = '#00ffff';
    rc.shadowBlur = 16;
    rc.shadowColor = '#00ffff';
    rc.fillText('KEY  BINDINGS', GAME.W / 2, 148);
    rc.restore();

    // Divider
    rc.save();
    rc.strokeStyle = 'rgba(0,255,255,0.25)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.moveTo(60, 172); rc.lineTo(GAME.W - 60, 172);
    rc.stroke();
    rc.restore();

    // 4 lane slots
    const laneNames  = ['LANE 1', 'LANE 2', 'LANE 3', 'LANE 4'];
    const slotStartY = 210;
    const slotGap    = 80;

    for (let i = 0; i < 4; i++) {
      const cy  = slotStartY + i * slotGap;
      const sel = gameState.keybindingSlot === i;
      const col = VISUAL.LANE_COL[i];
      const lbl = gameState.getKeyLabel(i);

      rc.save();

      // Lane name label (left side)
      rc.font = `bold 13px Orbitron,monospace`;
      rc.textAlign = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle   = sel ? '#ffffff' : col;
      rc.shadowBlur  = sel ? 8 : 0;
      rc.shadowColor = col;
      rc.fillText(laneNames[i], 70, cy);

      // Key slot box (right side)
      const bx = 240, bw = 70, bh = 40, by = cy - bh / 2;
      const flash = sel && Math.sin(gameState.pulse * Math.PI * 2 * 3) > 0;
      rc.fillStyle   = sel ? (flash ? 'rgba(255,0,255,0.30)' : 'rgba(255,0,255,0.10)')
                           : 'rgba(0,255,255,0.08)';
      rc.strokeStyle = sel ? '#ff00ff' : 'rgba(0,255,255,0.4)';
      rc.lineWidth   = sel ? 2 : 1;
      rc.shadowBlur  = sel ? 14 : 0;
      rc.shadowColor = '#ff00ff';
      rc.beginPath();
      rc.roundRect(bx, by, bw, bh, 6);
      rc.fill();
      rc.stroke();

      // Key label
      rc.font = 'bold 20px Orbitron,monospace';
      rc.textAlign    = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle    = sel ? '#ff88ff' : '#00ffff';
      rc.shadowBlur   = 0;
      rc.fillText(sel && flash ? '_' : lbl, bx + bw / 2, cy);

      rc.restore();
    }

    // Hint text
    rc.save();
    rc.font = '400 9px Orbitron,monospace';
    rc.textAlign    = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle    = 'rgba(255,255,255,0.30)';
    if (gameState.keybindingSlot >= 0) {
      rc.fillText('PRESS ANY KEY TO ASSIGN  \u2022  ESC TO CANCEL', GAME.W / 2, 550);
    } else {
      rc.fillText('\u2191\u2193 / TAP TO SELECT   \u2022   ENTER TO ASSIGN   \u2022   ESC BACK', GAME.W / 2, 550);
    }
    rc.restore();
  }

  renderEscConfirm(rc) {
    rc.save();

    // Upper half = YES zone
    rc.fillStyle = 'rgba(0,0,0,0.72)';
    rc.fillRect(0, 0, GAME.W, GAME.H / 2);
    // Lower half = NO zone (slightly different tint so they feel distinct)
    rc.fillStyle = 'rgba(0,0,20,0.72)';
    rc.fillRect(0, GAME.H / 2, GAME.W, GAME.H / 2);

    // Divider
    rc.strokeStyle = 'rgba(255,255,255,0.12)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.moveTo(0, GAME.H / 2);
    rc.lineTo(GAME.W, GAME.H / 2);
    rc.stroke();

    rc.textAlign = 'center';
    rc.textBaseline = 'middle';

    rc.font = '900 22px Orbitron,monospace';
    rc.fillStyle = '#ffffff';
    rc.shadowBlur = 16;
    rc.shadowColor = '#00ffff';
    rc.fillText('RETURN TO MENU?', GAME.W / 2, GAME.H / 2 - 52);

    // YES button area
    rc.font = 'bold 14px Orbitron,monospace';
    rc.fillStyle = '#00ffff';
    rc.shadowColor = '#00ffff';
    rc.shadowBlur = 10;
    rc.fillText('Y  /  ENTER  \u2192  YES', GAME.W / 2, GAME.H / 2 - 18);
    rc.font = '400 9px Orbitron,monospace';
    rc.fillStyle = 'rgba(0,255,255,0.40)';
    rc.shadowBlur = 0;
    rc.fillText('TAP TOP HALF', GAME.W / 2, GAME.H / 2 - 2);

    // NO button area
    rc.font = 'bold 14px Orbitron,monospace';
    rc.fillStyle = '#ff00ff';
    rc.shadowColor = '#ff00ff';
    rc.shadowBlur = 10;
    rc.fillText('N  /  ESC  \u2192  CANCEL', GAME.W / 2, GAME.H / 2 + 22);
    rc.font = '400 9px Orbitron,monospace';
    rc.fillStyle = 'rgba(255,0,255,0.40)';
    rc.shadowBlur = 0;
    rc.fillText('TAP BOTTOM HALF', GAME.W / 2, GAME.H / 2 + 38);

    rc.restore();
  }

  renderGameOver(rc) {
    rc.save();
    rc.fillStyle = 'rgba(4,0,20,0.92)';
    rc.fillRect(0, 0, GAME.W, GAME.H);
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';

    // ── Header ──────────────────────────────────────────────────────
    rc.font = '900 18px Orbitron,monospace';
    rc.fillStyle = '#ff00ff';
    rc.shadowBlur = 16;
    rc.shadowColor = '#ff00ff';
    rc.fillText('NEON//BEAT', GAME.W / 2, 60);

    // Track title
    const track = TRACKS[gameState.selectedTrack];
    if (track) {
      rc.font = '400 10px Orbitron,monospace';
      rc.fillStyle = 'rgba(255,255,255,0.45)';
      rc.shadowBlur = 0;
      rc.fillText(track.title.toUpperCase(), GAME.W / 2, 84);
    }

    // ── Stats table ──────────────────────────────────────────────────
    const total    = gameState.perfectCount + gameState.goodCount + gameState.missCount;
    const accuracy = total > 0
      ? (gameState.perfectCount + gameState.goodCount * 0.5) / total * 100
      : 100;

    const rows = [
      { label: 'PERFECT',   value: String(gameState.perfectCount),           color: '#00ffff'  },
      { label: 'GOOD',      value: String(gameState.goodCount),               color: '#ffcc00'  },
      { label: 'MISS',      value: String(gameState.missCount),               color: '#ff4444'  },
      { label: 'MAX COMBO', value: `${gameState.maxCombo}\u00d7`,             color: '#ff00ff'  },
      { label: 'ACCURACY',  value: `${accuracy.toFixed(1)}%`,                 color: '#ffffff'  },
    ];

    const rowStartY = 120;
    const rowH      = 48;
    const labelX    = 50;
    const valueBoxX = GAME.W - 155;
    const valueBoxW = 120;
    const valueBoxH = 32;

    for (let i = 0; i < rows.length; i++) {
      const { label, value, color } = rows[i];
      const cy = rowStartY + i * rowH + rowH / 2;

      rc.save();

      // Label
      rc.font = 'bold 11px Orbitron,monospace';
      rc.textAlign    = 'left';
      rc.textBaseline = 'middle';
      rc.fillStyle    = 'rgba(255,255,255,0.55)';
      rc.shadowBlur   = 0;
      rc.fillText(label, labelX, cy);

      // Value box
      rc.fillStyle   = `rgba(${color === '#ff4444' ? '255,68,68' : color === '#ffcc00' ? '255,204,0' : color === '#ff00ff' ? '255,0,255' : '0,255,255'},0.08)`;
      rc.strokeStyle = color;
      rc.lineWidth   = 1;
      rc.shadowBlur  = 4;
      rc.shadowColor = color;
      rc.beginPath();
      rc.roundRect(valueBoxX, cy - valueBoxH / 2, valueBoxW, valueBoxH, 4);
      rc.fill();
      rc.stroke();

      // Value text
      rc.font = 'bold 14px Orbitron,monospace';
      rc.textAlign    = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle    = color;
      rc.shadowBlur   = 6;
      rc.shadowColor  = color;
      rc.fillText(value, valueBoxX + valueBoxW / 2, cy);

      rc.restore();
    }

    // ── Score (large) ────────────────────────────────────────────────
    const scoreY = rowStartY + rows.length * rowH + 28;
    rc.save();
    rc.font = '400 10px Orbitron,monospace';
    rc.textAlign    = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle    = 'rgba(255,255,255,0.38)';
    rc.fillText('SCORE', GAME.W / 2, scoreY - 2);
    rc.font = 'bold 32px Orbitron,monospace';
    rc.fillStyle   = '#ffcc00';
    rc.shadowBlur  = 18;
    rc.shadowColor = '#ffcc00';
    rc.fillText(gameState.score.toLocaleString(), GAME.W / 2, scoreY + 26);
    rc.restore();

    // ── Grade ────────────────────────────────────────────────────────
    let grade, gradeColor;
    if (accuracy >= 100) { grade = 'S'; gradeColor = '#ffcc00'; }
    else if (accuracy >= 95) { grade = 'A'; gradeColor = '#00ffff'; }
    else if (accuracy >= 85) { grade = 'B'; gradeColor = '#00ff88'; }
    else if (accuracy >= 70) { grade = 'C'; gradeColor = '#ffcc00'; }
    else                      { grade = 'D'; gradeColor = '#ff4422'; }

    const gradeY = scoreY + 80;
    rc.save();
    rc.font = '400 9px Orbitron,monospace';
    rc.textAlign    = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle    = 'rgba(255,255,255,0.35)';
    rc.fillText('GRADE', GAME.W / 2, gradeY - 2);
    rc.font = '900 52px Orbitron,monospace';
    rc.fillStyle   = gradeColor;
    rc.shadowBlur  = 24;
    rc.shadowColor = gradeColor;
    rc.fillText(grade, GAME.W / 2, gradeY + 36);
    rc.restore();

    // ── Divider ──────────────────────────────────────────────────────
    const divY = gradeY + 72;
    rc.save();
    rc.strokeStyle = 'rgba(255,255,255,0.10)';
    rc.lineWidth   = 1;
    rc.beginPath();
    rc.moveTo(40, divY); rc.lineTo(GAME.W - 40, divY);
    rc.stroke();
    rc.restore();

    // ── Buttons ──────────────────────────────────────────────────────
    const retryBtnY = divY + 24;
    const retryBtnX = (GAME.W - 180) / 2;
    rc.save();
    rc.shadowBlur  = 12;
    rc.shadowColor = '#ff00ff';
    rc.fillStyle   = 'rgba(255,0,255,0.18)';
    rc.strokeStyle = '#ff00ff';
    rc.lineWidth   = 1.5;
    rc.beginPath();
    rc.roundRect(retryBtnX, retryBtnY, 180, 40, 8);
    rc.fill();
    rc.stroke();
    rc.font         = 'bold 13px Orbitron,monospace';
    rc.textAlign    = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle    = '#ff00ff';
    rc.shadowBlur   = 5;
    rc.fillText('\u21ba  RETRY', GAME.W / 2, retryBtnY + 20);
    rc.restore();

    const menuBtnY = retryBtnY + 52;
    const menuBtnX = (GAME.W - 130) / 2;
    rc.save();
    rc.shadowBlur  = 6;
    rc.shadowColor = '#00ffff';
    rc.fillStyle   = 'rgba(0,255,255,0.10)';
    rc.strokeStyle = 'rgba(0,255,255,0.5)';
    rc.lineWidth   = 1;
    rc.beginPath();
    rc.roundRect(menuBtnX, menuBtnY, 130, 32, 6);
    rc.fill();
    rc.stroke();
    rc.font         = 'bold 11px Orbitron,monospace';
    rc.textAlign    = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle    = 'rgba(0,255,255,0.8)';
    rc.shadowBlur   = 0;
    rc.fillText('MENU', GAME.W / 2, menuBtnY + 16);
    rc.restore();

    // Keyboard hints
    rc.save();
    rc.font      = '400 9px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.22)';
    rc.fillText('R / ENTER \u2192 RETRY   \u2022   ESC \u2192 MENU', GAME.W / 2, menuBtnY + 52);
    rc.restore();

    rc.restore();
  }
}
