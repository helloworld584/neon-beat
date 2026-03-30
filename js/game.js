// ================================================================
// NEON BEAT – Game Logic
// ================================================================

import { GAME, GAME_STATES, SPEED_MULTIPLIERS } from './constants.js';
import { gameState } from './state.js';
import { soundEngine } from './sound.js';

// ── Shared scoring helper ─────────────────────────────────────────
function applyScore(lane, grade) {
  gameState.combo++;
  if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;

  if (grade === 'PERFECT') gameState.perfectCount++;
  else                     gameState.goodCount++;
  if (grade !== 'PERFECT') gameState.allPerfect = false;

  let comboMult = 1 + Math.floor(gameState.combo / 10) * 0.5;
  let modMult   = 1;

  if (gameState.hasModifier('overclock'))   modMult *= 2;
  if (gameState.hasModifier('mirror'))      modMult *= 1.5;
  if (gameState.hasModifier('score_virus')) modMult *= 1;  // virus handled at clear

  let baseScore = grade === 'PERFECT' ? 300 : 100;
  let pts = Math.floor(baseScore * comboMult * modMult);

  // auto_heal: bonus ×1.5 every 10 consecutive PERFECTs
  if (gameState.hasModifier('auto_heal') && grade === 'PERFECT' && gameState.combo % 10 === 0) {
    pts = Math.floor(pts * 1.5);
    gameState.glitchT = 300;
    gameState.glitchStr = 0.4;
  }

  gameState.score += pts;

  // Earn credits
  gameState.credits += grade === 'PERFECT' ? 2 : 1;

  gameState.judgeText = grade;
  gameState.judgeT = 600;

  gameState.effects.push({
    x: lane * gameState.laneW + gameState.laneW / 2,
    y: gameState.hitY,
    t: 380,
    max: 380,
    grade,
  });

  soundEngine.playHit(grade);

  if ([10, 25, 50].includes(gameState.combo)) {
    gameState.glitchT = 520;
    gameState.glitchStr = gameState.combo >= 50 ? 1.0 : gameState.combo >= 25 ? 0.7 : 0.45;
  }
}

// ── Called when a lane key is pressed ────────────────────────────
export function hitLane(lane) {
  const overclock = gameState.hasModifier('overclock') ? 1.2 : 1.0;
  const spd = gameState.baseSpd * SPEED_MULTIPLIERS[gameState.speedMultiplierIdx] * gameState.noteSpeed * overclock;
  const hitY = gameState.hitY;
  let bestNote = null;
  let bestDistance = Infinity;

  for (const note of gameState.notes) {
    if (note.lane !== lane || note.state !== 'active') continue;

    let distance;
    if (note.type === 'hold') {
      const tailY = note.y - note.duration * spd;
      // Body covers hit zone → distance = 0 so it always qualifies
      if (tailY <= hitY && note.y >= hitY - GAME.NOTE_H) {
        distance = 0;
      } else {
        distance = Math.abs(note.y - hitY);
      }
    } else {
      distance = Math.abs(note.y - hitY);
    }

    if (distance < bestDistance) {
      bestNote = note;
      bestDistance = distance;
    }
  }

  if (!bestNote) return;

  const ms = bestDistance / spd;
  if (ms > GAME.GOOD_WIN) return;

  if (bestNote.type === 'hold') {
    bestNote.state = 'holding';
    bestNote.holdTime = 0;
  } else {
    const perfWin2 = GAME.PERF_WIN + (gameState.hasModifier('ghost_notes') ? 50 : 0);
    const grade = ms <= perfWin2 ? 'PERFECT' : 'GOOD';
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

  // overclock: speed +20%
  const overclock = gameState.hasModifier('overclock') ? 1.2 : 1.0;
  const spd = gameState.baseSpd * SPEED_MULTIPLIERS[gameState.speedMultiplierIdx] * gameState.noteSpeed * overclock;
  const hitY = gameState.hitY;
  const missThreshold = hitY + GAME.GOOD_WIN * spd + 8;

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
      note.y = hitY - timeToHit * spd;
    }

    // ── Miss check ────────────────────────────────────────────────
    if (note.state === 'active' && note.y > missThreshold) {
      const doMiss = () => {
        note.state = 'missed';
        gameState.combo = 0;
        gameState.allPerfect = false;
        gameState.missCount++;
        gameState.judgeText = 'MISS';
        gameState.judgeT = 600;
        // score_virus: miss deducts 100 pts
        if (gameState.hasModifier('score_virus')) {
          gameState.score = Math.max(0, gameState.score - 100);
        }
      };
      if (note.type === 'hold') {
        const tailY = note.y - note.duration * spd;
        if (tailY > missThreshold) doMiss();
      } else {
        doMiss();
      }
    }
  }

  // ── Game over: last note (+ hold tail) has passed ────────────────
  const lastNote = gameState.notes[gameState.notes.length - 1];
  if (lastNote) {
    const tailEnd = lastNote.time + (lastNote.duration || 0);
    if (gameState.songTime > tailEnd + 3500) {
      // Clear bonuses
      gameState.credits += 50;                         // song clear bonus
      if (gameState.allPerfect) gameState.credits += 200; // full perfect bonus
      // score_virus: cleared alive → ×3 reward
      if (gameState.hasModifier('score_virus')) gameState.score = Math.floor(gameState.score * 3);
      gameState.saveCredits();
      gameState.gameState = GAME_STATES.GAMEOVER;
    }
  }
}
