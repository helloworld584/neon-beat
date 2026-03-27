// ================================================================
// NEON BEAT – Game Constants
// ================================================================

export const GAME = {
  W: 390,
  H: 844,
  BPM: 128,
  BEAT_MS: 60000 / 128,          // 468.75 ms
  LANES: 4,
  LANE_W: 390 / 4,               // 97.5 px
  NOTE_W: 85.5,                  // LANE_W - 12
  NOTE_H: 28,
  HIT_Y: 714,                    // hit-line Y
  SPAWN_Y: -32,                  // -NOTE_H - 4
  LEAD_BEATS: 3,
  LEAD_MS: 3 * (60000 / 128),    // 1406.25 ms
  SPD: (714 - (-32)) / (3 * (60000 / 128)), // px/ms ≈ 0.5126
  PERF_WIN: 50,                  // ± ms perfect
  GOOD_WIN: 100,                 // ± ms good
};

export const INPUT = {
  KEY_MAP: { d: 0, f: 1, j: 2, k: 3 },
  KEY_LABELS: ['D', 'F', 'J', 'K'],
};

export const VISUAL = {
  LANE_COL: ['#00ffff', '#ff00ff', '#00ffff', '#ff00ff'],
};

export const GAME_STATES = {
  LOADING: 'LOADING',
  TITLE: 'TITLE',
  PLAYING: 'PLAYING',
  GAMEOVER: 'GAMEOVER',
};
