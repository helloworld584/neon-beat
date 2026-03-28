// ================================================================
// NEON BEAT – Note Chart Data
// ================================================================

import { GAME } from './constants.js';

// Bar patterns: [beatOffset, lane, holdBeats?]
// holdBeats present → hold note with that many beats duration
// holdBeats absent  → tap note
export const PATTERNS = {
  INTRO1:   [[0,0],[2,2]],
  INTRO2:   [[0,1],[2,3]],
  SIMPLE:   [[0,0],[1,1],[2,2],[3,3]],
  SIMREV:   [[0,3],[1,2],[2,1],[3,0]],
  ALT_C:    [[0,0],[1,2],[2,0],[3,2]],
  ALT_M:    [[0,1],[1,3],[2,1],[3,3]],
  CASC_U:   [[0,0],[0.5,1],[1,2],[1.5,3],[2,0],[2.5,1],[3,2],[3.5,3]],
  CASC_D:   [[0,3],[0.5,2],[1,1],[1.5,0],[2,3],[2.5,2],[3,1],[3.5,0]],
  TRILL_L:  [[0,0],[0.5,1],[1,0],[1.5,1],[2,0],[2.5,1],[3,0],[3.5,1]],
  TRILL_R:  [[0,2],[0.5,3],[1,2],[1.5,3],[2,2],[2.5,3],[3,2],[3.5,3]],
  CROSS:    [[0,0],[0.5,3],[1,1],[1.5,2],[2,3],[2.5,0],[3,2],[3.5,1]],
  DBL_A:    [[0,0],[0,3],[1,1],[1,2],[2,0],[2,3],[3,1],[3,2]],
  DBL_B:    [[0,0],[0,1],[2,2],[2,3]],
  QUAD:     [[0,0],[0,1],[0,2],[0,3],[2,0],[2,1],[2,2],[2,3]],
  DENSE:    [[0,0],[0.5,2],[1,1],[1.5,3],[2,0],[2.5,2],[3,1],[3.5,3]],
  BREAK1:   [[0,0],[3,3]],
  BREAK2:   [[1,1],[2,2]],
  // Hold-note break patterns (2-beat holds per note)
  HBREAK1:  [[0,0,2],[3,3,2]],
  HBREAK2:  [[1,1,2],[2,2,2]],
};

export const SONG = [
  // Intro (bars 1-4)
  'INTRO1','INTRO2','HBREAK1','HBREAK2',
  // Build (bars 5-8)
  'SIMPLE','SIMPLE','SIMREV','SIMPLE',
  // Verse A (bars 9-16)
  'SIMPLE','DBL_B','SIMREV','DBL_B',
  'CASC_U','TRILL_L','CASC_D','TRILL_R',
  // Drop 1 (bars 17-24)
  'CROSS','DBL_A','CASC_U','QUAD',
  'DBL_A','CASC_D','CROSS','DENSE',
  // Breakdown (bars 25-28)
  'INTRO1','INTRO2','HBREAK1','HBREAK2',
  // Build 2 (bars 29-32)
  'SIMPLE','SIMREV','CASC_U','CROSS',
  // Final drop (bars 33-40)
  'DENSE','DBL_A','QUAD','CROSS',
  'TRILL_L','TRILL_R','DENSE','QUAD',
];

export function makeChart() {
  const LEAD = 4; // beat lead-in
  const notes = [];

  SONG.forEach((name, barIndex) => {
    PATTERNS[name].forEach(([beat, lane, holdBeats]) => {
      const time = (LEAD + barIndex * 4 + beat) * GAME.BEAT_MS;
      if (holdBeats) {
        notes.push({
          time, lane,
          type: 'hold',
          duration: holdBeats * GAME.BEAT_MS,
          y: GAME.SPAWN_Y,
          state: 'pending',
        });
      } else {
        notes.push({
          time, lane,
          type: 'tap',
          y: GAME.SPAWN_Y,
          state: 'pending',
        });
      }
    });
  });

  return notes.sort((a, b) => a.time - b.time);
}
