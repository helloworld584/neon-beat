// ================================================================
// NEON BEAT – Rendering System
// ================================================================

import { GAME, INPUT, VISUAL, GAME_STATES, TRACKS, VIBE_COLORS } from './constants.js';
import { getImage } from './assets.js';
import { gameState } from './state.js';

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
    rc.save();
    
    // Dividers
    for (let i = 1; i < GAME.LANES; i++) {
      rc.strokeStyle = 'rgba(255,255,255,0.06)';
      rc.lineWidth = 1;
      rc.beginPath();
      rc.moveTo(i * GAME.LANE_W, 0);
      rc.lineTo(i * GAME.LANE_W, GAME.H);
      rc.stroke();
    }
    
    // Key-press lane glow
    for (let i = 0; i < GAME.LANES; i++) {
      const alpha = (gameState.keyDown[i] ? 0.13 : 0) + (gameState.keyFlash[i] / 200) * 0.14;
      if (alpha > 0.01) {
        rc.fillStyle = `rgba(${i % 2 === 0 ? '0,255,255' : '255,0,255'},${alpha.toFixed(3)})`;
        rc.fillRect(i * GAME.LANE_W, 0, GAME.LANE_W, GAME.H);
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
    for (let i = 0; i < GAME.LANES; i++) {
      const cx = i * GAME.LANE_W + GAME.LANE_W / 2;
      const col = VISUAL.LANE_COL[i];
      const pressed = gameState.keyDown[i] || gameState.keyFlash[i] > 0;
      
      rc.shadowBlur = pressed ? 24 : 8;
      rc.shadowColor = col;
      rc.strokeStyle = col;
      rc.lineWidth = pressed ? 3 : 1.5;
      rc.beginPath();
      rc.arc(cx, GAME.HIT_Y, GAME.LANE_W / 2 - 12, 0, Math.PI * 2);
      rc.stroke();
      
      if (pressed) {
        rc.globalAlpha = 0.22;
        rc.fillStyle = col;
        rc.beginPath();
        rc.arc(cx, GAME.HIT_Y, GAME.LANE_W / 2 - 12, 0, Math.PI * 2);
        rc.fill();
        rc.globalAlpha = 1;
      }
    }
    
    rc.restore();
  }

  drawNotes(rc) {
    const noteCyan = getImage('note_cyan');
    const noteMagenta = getImage('note_magenta');
    
    for (const note of gameState.notes) {
      if (note.state !== 'active') continue;
      if (note.y < GAME.SPAWN_Y - 10 || note.y > GAME.HIT_Y + 60) continue;
      
      const x = note.lane * GAME.LANE_W + (GAME.LANE_W - GAME.NOTE_W) / 2;
      const y = note.y - GAME.NOTE_H / 2;
      const isCyan = note.lane % 2 === 0;
      
      rc.save();
      const noteImg = isCyan ? noteCyan : noteMagenta;
      
      if (noteImg) {
        rc.drawImage(noteImg, x, y, GAME.NOTE_W, GAME.NOTE_H);
      } else {
        rc.fillStyle = VISUAL.LANE_COL[note.lane];
        rc.shadowBlur = 10;
        rc.shadowColor = VISUAL.LANE_COL[note.lane];
        rc.fillRect(x, y, GAME.NOTE_W, GAME.NOTE_H);
      }
      
      rc.restore();
    }
  }

  drawEffects(rc) {
    const hitFx = getImage('hit_fx');
    
    for (const effect of gameState.effects) {
      const t = effect.t / effect.max;
      const scale = 1 + (1 - t) * 1.8;
      const size = 64 * scale;
      
      rc.save();
      rc.globalAlpha = Math.pow(t, 0.6);
      rc.translate(effect.x, effect.y);
      
      if (hitFx) {
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
    const buttonY = GAME.HIT_Y + 58;
    const size = 40;
    
    for (let i = 0; i < GAME.LANES; i++) {
      const cx = i * GAME.LANE_W + GAME.LANE_W / 2;
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
      
      rc.font = 'bold 14px Orbitron,monospace';
      rc.textAlign = 'center';
      rc.textBaseline = 'middle';
      rc.fillStyle = pressed ? '#000' : col;
      rc.shadowBlur = 0;
      rc.fillText(INPUT.KEY_LABELS[i], cx, buttonY);
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
    const frame = getImage('hud_frame');
    if (frame) {
      rc.save();
      rc.globalAlpha = 0.55;
      rc.drawImage(frame, 0, 0, GAME.W, GAME.H);
      rc.restore();
    }
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
    
    // Blink prompt
    if (Math.sin(gameState.pulse * Math.PI * 2 * 1.2) > 0) {
      rc.font = 'bold 12px Orbitron,monospace';
      rc.fillStyle = '#fff';
      rc.shadowBlur = 10;
      rc.shadowColor = '#fff';
      rc.fillText('PRESS  D / F / J / K  TO START', GAME.W / 2, 540);
    }
    
    // Key row
    const keyY = 598;
    for (let i = 0; i < 4; i++) {
      const cx = GAME.W / 2 + (i - 1.5) * 62;
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
      rc.fillText(INPUT.KEY_LABELS[i], cx, keyY);
      rc.restore();
    }
  }

  // ── Mute button (top-left during gameplay) ──────────────────────
  drawMuteButton(rc) {
    const x = 8, y = 8, w = 50, h = 24;
    rc.save();
    rc.fillStyle = gameState.isMuted ? 'rgba(255,40,40,0.35)' : 'rgba(0,0,0,0.55)';
    rc.strokeStyle = gameState.isMuted ? '#ff4444' : 'rgba(255,255,255,0.25)';
    rc.lineWidth = 1;
    rc.beginPath();
    rc.roundRect(x, y, w, h, 5);
    rc.fill();
    rc.stroke();
    rc.font = 'bold 9px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = gameState.isMuted ? '#ff6666' : 'rgba(255,255,255,0.55)';
    rc.fillText(gameState.isMuted ? '\u266a OFF' : '\u266a  ON', x + w / 2, y + h / 2);
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

    // Footer hints
    rc.save();
    rc.font = '400 9px Orbitron,monospace';
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';
    rc.fillStyle = 'rgba(255,255,255,0.28)';
    rc.fillText('\u2191\u2193 NAVIGATE  \u2022  SPACE PREVIEW  \u2022  ENTER SELECT  \u2022  ESC BACK',
      GAME.W / 2, py + ph - 20);
    rc.restore();
  }

  renderGameOver(rc) {
    rc.save();
    rc.fillStyle = 'rgba(0,0,0,0.75)';
    rc.fillRect(0, 0, GAME.W, GAME.H);
    rc.textAlign = 'center';
    rc.textBaseline = 'middle';

    rc.font = '900 36px Orbitron,monospace';
    rc.fillStyle = '#ff00ff';
    rc.shadowBlur = 22;
    rc.shadowColor = '#ff00ff';
    rc.fillText('GAME OVER', GAME.W / 2, GAME.H / 2 - 92);

    rc.font = 'bold 20px Orbitron,monospace';
    rc.fillStyle = '#fff';
    rc.shadowColor = '#00ffff';
    rc.shadowBlur = 12;
    rc.fillText(gameState.score.toString().padStart(8, '0'), GAME.W / 2, GAME.H / 2 - 34);

    rc.font = '400 10px Orbitron,monospace';
    rc.fillStyle = 'rgba(255,255,255,0.45)';
    rc.shadowBlur = 0;
    rc.fillText('FINAL SCORE', GAME.W / 2, GAME.H / 2 - 6);

    rc.font = 'bold 15px Orbitron,monospace';
    rc.fillStyle = '#00ffff';
    rc.shadowBlur = 10;
    rc.shadowColor = '#00ffff';
    rc.fillText(`MAX COMBO  ${gameState.maxCombo}×`, GAME.W / 2, GAME.H / 2 + 36);

    if (Math.sin(gameState.pulse * Math.PI * 2 * 1.2) > 0) {
      rc.font = 'bold 11px Orbitron,monospace';
      rc.fillStyle = '#fff';
      rc.shadowBlur = 6;
      rc.shadowColor = '#fff';
      rc.fillText('PRESS  R  TO CONTINUE', GAME.W / 2, GAME.H / 2 + 88);
    }
    rc.restore();
  }
}
