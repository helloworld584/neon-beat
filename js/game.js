// ================================================================
// NEON BEAT – Game Logic
// ================================================================

import { GAME, GAME_STATES, SPEED_MULTIPLIERS } from './constants.js';
import { gameState } from './state.js';
import { soundEngine } from './sound.js';

// ── Shared scoring helper ─────────────────────────────────────────
function applyScore(lane, grade, isTrunk) {
  if (!isTrunk) {
    gameState.combo++;
    if (gameState.combo > gameState.maxCombo) gameState.maxCombo = gameState.combo;
  }

  if (grade === 'PERFECT') gameState.perfectCount++;
  else                     gameState.goodCount++;
  if (grade !== 'PERFECT') gameState.allPerfect = false;

  let comboMult = 1 + Math.floor(gameState.combo / 10) * 0.5;
  let modMult   = 1;
  if (gameState.hasModifier('overclock'))   modMult *= 2;
  if (gameState.hasModifier('mirror'))      modMult *= 1.5;

  let baseScore = isTrunk ? 500 : (grade === 'PERFECT' ? 300 : 100);
  let pts = Math.floor(baseScore * comboMult * modMult);

  if (gameState.hasModifier('auto_heal') && grade === 'PERFECT' && gameState.combo % 10 === 0) {
    pts = Math.floor(pts * 1.5);
    gameState.glitchT = 300;
    gameState.glitchStr = 0.4;
  }

  gameState.score += pts;
  gameState.credits += grade === 'PERFECT' ? 2 : 1;
  gameState.judgeText = isTrunk ? 'BONUS!' : grade;
  gameState.judgeT = 600;

  gameState.effects.push({
    x: lane * gameState.laneW + gameState.laneW / 2,
    y: gameState.hitY,
    t: 380, max: 380, grade,
  });

  soundEngine.playHit(grade);

  if (!isTrunk && [10, 25, 50].includes(gameState.combo)) {
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
    // trunk/phantom/petal use their own lane; zigzag uses final lane (note.lane)
    if (note.lane !== lane || note.state !== 'active') continue;

    let distance;
    if (note.type === 'hold') {
      const tailY = note.y - note.duration * spd;
      distance = (tailY <= hitY && note.y >= hitY - GAME.NOTE_H) ? 0 : Math.abs(note.y - hitY);
    } else {
      distance = Math.abs(note.y - hitY);
    }
    if (distance < bestDistance) { bestNote = note; bestDistance = distance; }
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
    const isTrunk = bestNote.type === 'trunk';
    if (isTrunk) gameState.trunkHitCount++;
    applyScore(bestNote.lane, grade, isTrunk);
  }
}

// ── Called when a lane key is released ───────────────────────────
export function releaseLane(lane) {
  for (const note of gameState.notes) {
    if (note.lane !== lane || note.state !== 'holding') continue;
    const remaining = note.duration - note.holdTime;
    const grade = remaining <= GAME.PERF_WIN ? 'PERFECT' : 'GOOD';
    note.state = 'released';
    applyScore(note.lane, grade, false);
    break;
  }
}

// ── Ocean current gimmick ─────────────────────────────────────────
function updateCurrentGimmick(dt) {
  const gs = gameState;

  if (gs.currentShifting) {
    gs.currentShiftAnimT -= dt;
    gs.currentShiftLerp   = Math.max(0, 1 - gs.currentShiftAnimT / 1000);
    if (gs.currentShiftAnimT <= 0) {
      // Apply the shift: remap all pending/active note lanes
      const dir = gs.currentShiftDir;
      const lc  = gs.laneCount;
      for (const n of gs.notes) {
        if (n.state === 'hit' || n.state === 'missed' || n.state === 'released') continue;
        n.prevLane = undefined;
        n.lane = (n.lane + dir + lc) % lc;
      }
      gs.currentShiftOffset = (gs.currentShiftOffset + dir + lc) % lc;
      gs.currentShiftLerp   = 0;
      gs.currentShifting    = false;
    }
    return;
  }

  if (gs.currentWarningActive) {
    gs.currentWarningT -= dt;
    if (gs.currentWarningT <= 0) {
      gs.currentWarningActive = false;
      // Start shift animation
      gs.currentShifting   = true;
      gs.currentShiftAnimT = 1000;
      gs.currentShiftLerp  = 0;
      gs.currentShiftDir   = Math.random() < 0.5 ? 1 : -1;
      // Pre-mark notes with prevLane for smooth animation
      for (const n of gs.notes) {
        if (n.state === 'hit' || n.state === 'missed' || n.state === 'released') continue;
        n.prevLane = n.lane;
      }
    }
    return;
  }

  gs.gimmickTimer -= dt;
  if (gs.gimmickTimer <= 0) {
    gs.currentWarningActive = true;
    gs.currentWarningT      = 2000;
    gs.gimmickTimer         = 10000;
  }
}

// ── Spring wind gimmick ───────────────────────────────────────────
function updateWindGimmick(dt) {
  gameState.windTimer -= dt;
  if (gameState.windTimer <= 0) {
    gameState.spawnPetalBurst();
    gameState.windTimer = 12000;
  }
}

// ── Main update loop ──────────────────────────────────────────────
export function update(dt) {
  gameState.updateSongTime();

  const gimmick = gameState.getTheme().gimmick;
  if (gimmick === 'current') updateCurrentGimmick(dt);
  if (gimmick === 'wind')    updateWindGimmick(dt);

  const overclock = gameState.hasModifier('overclock') ? 1.2 : 1.0;
  const spd = gameState.baseSpd * SPEED_MULTIPLIERS[gameState.speedMultiplierIdx] * gameState.noteSpeed * overclock;
  const hitY = gameState.hitY;
  const missThreshold = hitY + GAME.GOOD_WIN * spd + 8;

  for (const note of gameState.notes) {
    if (note.state === 'hit' || note.state === 'missed' || note.state === 'released') continue;

    if (note.state === 'holding') {
      note.holdTime += dt;
      if (note.holdTime >= note.duration) {
        note.state = 'hit';
        applyScore(note.lane, 'PERFECT', false);
      }
      continue;
    }

    const timeToHit = note.time - gameState.songTime;
    if (timeToHit <= GAME.LEAD_MS) {
      note.state = 'active';
      note.y = hitY - timeToHit * spd;
      // Cache timeToHit on phantom notes for opacity calculation
      if (note.type === 'phantom') note._timeToHit = timeToHit;
    }

    if (note.state === 'active' && note.y > missThreshold) {
      const doMiss = () => {
        note.state = 'missed';
        // trunk: miss does NOT break combo
        if (note.type !== 'trunk') {
          gameState.combo = 0;
          gameState.allPerfect = false;
        }
        gameState.missCount++;
        gameState.judgeText = 'MISS';
        gameState.judgeT = 600;
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

  const lastNote = gameState.notes[gameState.notes.length - 1];
  if (lastNote) {
    const tailEnd = lastNote.time + (lastNote.duration || 0);
    if (gameState.songTime > tailEnd + 3500) {
      gameState.credits += 50;
      if (gameState.allPerfect) gameState.credits += 200;
      if (gameState.hasModifier('score_virus')) gameState.score = Math.floor(gameState.score * 3);
      gameState.saveCredits();
      gameState.checkUnlocks();
      gameState.gameState = GAME_STATES.GAMEOVER;
    }
  }
}
