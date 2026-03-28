// ================================================================
// NEON BEAT – Game Logic
// ================================================================

import { GAME, GAME_STATES, SPEED_MULTIPLIERS } from './constants.js';
import { gameState } from './state.js';

// ── Shared scoring helper ─────────────────────────────────────────
function applyScore(lane, grade) {
  gameState.combo++;
  if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;

  const multiplier = 1 + Math.floor(gameState.combo / 10) * 0.5;
  gameState.score += Math.floor((grade === 'PERFECT' ? 300 : 100) * multiplier);

  gameState.judgeText = grade;
  gameState.judgeT = 550;

  gameState.effects.push({
    x: lane * GAME.LANE_W + GAME.LANE_W / 2,
    y: GAME.HIT_Y,
    t: 380,
    max: 380,
    grade,
  });

  if ([10, 25, 50].includes(gameState.combo)) {
    gameState.glitchT = 520;
    gameState.glitchStr = gameState.combo >= 50 ? 1.0 : gameState.combo >= 25 ? 0.7 : 0.45;
  }
}

// ── Called when a lane key is pressed ────────────────────────────
export function hitLane(lane) {
  let bestNote = null;
  let bestDistance = Infinity;

  for (const note of gameState.notes) {
    if (note.lane !== lane || note.state !== 'active') continue;
    const distance = Math.abs(note.y - GAME.HIT_Y);
    if (distance < bestDistance) {
      bestNote = note;
      bestDistance = distance;
    }
  }

  if (!bestNote) return;

  const spd = GAME.SPD * SPEED_MULTIPLIERS[gameState.speedMultiplierIdx];
  const ms = bestDistance / spd;

  if (ms > GAME.GOOD_WIN) return; // too far, ignore

  if (bestNote.type === 'hold') {
    // Start hold — score awarded on completion or early release
    bestNote.state = 'holding';
    bestNote.holdTime = 0;
  } else {
    // Tap note — score immediately
    const grade = ms <= GAME.PERF_WIN ? 'PERFECT' : 'GOOD';
    bestNote.state = 'hit';
    applyScore(bestNote.lane, grade);
  }
}

// ── Called when a lane key is released ───────────────────────────
export function releaseLane(lane) {
  for (const note of gameState.notes) {
    if (note.lane !== lane || note.state !== 'holding') continue;
    const remaining = note.duration - note.holdTime;
    // Release within the final PERF_WIN window → counts as PERFECT
    const grade = remaining <= GAME.PERF_WIN ? 'PERFECT' : 'GOOD';
    note.state = 'released';
    applyScore(note.lane, grade);
    break;
  }
}

// ── Main update loop (called every frame while PLAYING) ──────────
export function update(dt) {
  gameState.updateSongTime();

  const spd = GAME.SPD * SPEED_MULTIPLIERS[gameState.speedMultiplierIdx];
  const missThreshold = GAME.HIT_Y + GAME.GOOD_WIN * spd + 8;

  for (const note of gameState.notes) {
    if (note.state === 'hit' || note.state === 'missed' || note.state === 'released') continue;

    // ── Active hold: advance hold timer ──────────────────────────
    if (note.state === 'holding') {
      note.holdTime += dt;
      if (note.holdTime >= note.duration) {
        note.state = 'hit';
        applyScore(note.lane, 'PERFECT');
      }
      continue; // no position update needed while holding
    }

    // ── Position update for pending/active notes ──────────────────
    const timeToHit = note.time - gameState.songTime;

    if (timeToHit <= GAME.LEAD_MS) {
      note.state = 'active';
      note.y = GAME.HIT_Y - timeToHit * spd;
    }

    // ── Miss check ────────────────────────────────────────────────
    if (note.state === 'active' && note.y > missThreshold) {
      note.state = 'missed';
      gameState.combo = 0;
      gameState.judgeText = 'MISS';
      gameState.judgeT = 420;
    }
  }

  // ── Game over: last note (+ hold tail) has passed ────────────────
  const lastNote = gameState.notes[gameState.notes.length - 1];
  if (lastNote) {
    const tailEnd = lastNote.time + (lastNote.duration || 0);
    if (gameState.songTime > tailEnd + 3500) {
      gameState.gameState = GAME_STATES.GAMEOVER;
    }
  }
}
