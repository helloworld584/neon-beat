// ================================================================
// NEON BEAT – Game Logic
// ================================================================

import { GAME, GAME_STATES, SPEED_MULTIPLIERS } from './constants.js';
import { gameState } from './state.js';

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
  
  const ms = bestDistance / GAME.SPD;
  let grade;
  
  if (ms <= GAME.PERF_WIN) {
    grade = 'PERFECT';
  } else if (ms <= GAME.GOOD_WIN) {
    grade = 'GOOD';
  } else {
    return;
  }
  
  bestNote.state = 'hit';
  gameState.combo++;
  if (gameState.combo > gameState.maxCombo) {
    gameState.maxCombo = gameState.combo;
  }
  
  const multiplier = 1 + Math.floor(gameState.combo / 10) * 0.5;
  gameState.score += Math.floor((grade === 'PERFECT' ? 300 : 100) * multiplier);
  
  gameState.judgeText = grade;
  gameState.judgeT = 550;
  
  gameState.effects.push({
    x: lane * GAME.LANE_W + GAME.LANE_W / 2,
    y: GAME.HIT_Y,
    t: 380,
    max: 380,
    grade
  });
  
  if ([10, 25, 50].includes(gameState.combo)) {
    gameState.glitchT = 520;
    gameState.glitchStr = gameState.combo >= 50 ? 1.0 : gameState.combo >= 25 ? 0.7 : 0.45;
  }
}

export function update(dt) {
  gameState.updateSongTime();
  
  for (const note of gameState.notes) {
    if (note.state === 'hit' || note.state === 'missed') continue;
    
    const timeToHit = note.time - gameState.songTime;
    
    if (timeToHit <= GAME.LEAD_MS) {
      note.state = 'active';
      const spd = GAME.SPD * SPEED_MULTIPLIERS[gameState.speedMultiplierIdx];
      note.y = GAME.HIT_Y - timeToHit * spd;
    }
    
    if (note.state === 'active' && note.y > GAME.HIT_Y + GAME.GOOD_WIN * GAME.SPD * SPEED_MULTIPLIERS[gameState.speedMultiplierIdx] + 8) {
      note.state = 'missed';
      gameState.combo = 0;
      gameState.judgeText = 'MISS';
      gameState.judgeT = 420;
    }
  }
  
  const lastNote = gameState.notes[gameState.notes.length - 1];
  if (lastNote && gameState.songTime > lastNote.time + 3500) {
    gameState.gameState = GAME_STATES.GAMEOVER;
  }
}
