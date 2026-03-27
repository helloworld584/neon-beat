// ================================================================
// NEON BEAT – Asset Loader
// ================================================================

const IMG = {};
const ASSETS = {
  bg_road:     'assets/bg_road.png',
  bg_sky:      'assets/bg_skyline.png',
  note_cyan:   'assets/note_cyan.png',
  note_magenta:'assets/note_magenta.png',
  hit_fx:      'assets/hit_effect.png',
  hud_frame:   'assets/hud_frame.png',
  logo:        'assets/logo_framed.png',
};

export function loadAssets() {
  return new Promise(resolve => {
    let loaded = 0;
    const total = Object.keys(ASSETS).length;
    
    for (const [key, src] of Object.entries(ASSETS)) {
      const img = new Image();
      img.onload = img.onerror = () => {
        if (++loaded === total) resolve();
      };
      img.src = src;
      IMG[key] = img;
    }
  });
}

export function getImage(key) {
  const img = IMG[key];
  return img && img.naturalWidth ? img : null;
}
