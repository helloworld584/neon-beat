// ================================================================
// NEON BEAT – Asset Loader
// ================================================================

const IMG = {};

const BASE_ASSETS = {
  bg_road:     'assets/bg_road.png',
  bg_sky:      'assets/bg_skyline.png',
  note_cyan:   'assets/note_cyan.png',
  note_magenta:'assets/note_magenta.png',
  hit_fx:      'assets/hit_effect.png',
  hud_frame:   'assets/hud_frame.png',
  logo:        'assets/logo_framed.png',
};

function loadImage(key, src) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = img.onerror = () => resolve();
    img.src = src;
    IMG[key] = img;
  });
}

export function loadAssets() {
  return Promise.all(
    Object.entries(BASE_ASSETS).map(([k, src]) => loadImage(k, src))
  );
}

export function loadThemeAssets(theme) {
  if (!theme) return Promise.resolve();
  const promises = [];
  const a = theme.assets;
  if (a.bg)          promises.push(loadImage('theme_bg',      a.bg));
  if (a.bgRoad)      promises.push(loadImage('theme_bg_road', a.bgRoad));
  if (a.shop)        promises.push(loadImage('theme_shop',    a.shop));
  if (a.hitEffect)   promises.push(loadImage('theme_hit_fx',  a.hitEffect));
  if (a.creditIcon)  promises.push(loadImage('theme_credit',  a.creditIcon));
  if (a.specialNote) promises.push(loadImage('theme_note',    a.specialNote));
  return Promise.all(promises);
}

export function getImage(key) {
  const img = IMG[key];
  return img && img.naturalWidth ? img : null;
}
