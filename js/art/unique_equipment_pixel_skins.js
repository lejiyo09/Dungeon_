'use strict';

/*
 * Dungeon_ : Unique character-skin equipment pixel-art variants.
 * This module consumes the game's existing WPIX / WEAPON_SPRITE / DATA_WEAPONS /
 * TREASURE_ICONS objects. It does not alter item stats, pivots, dimensions, hitboxes,
 * projectiles, or any gameplay values.
 *
 * Usage:
 * const UNIQUE_EQUIPMENT_PIXEL_SKINS = createUniqueEquipmentPixelSkins({
 *   WPIX, WEAPON_SPRITE, DATA_WEAPONS, TREASURE_ICONS
 * });
 * const themedWpix = UNIQUE_EQUIPMENT_PIXEL_SKINS.resolveWeapon(weaponDef, 'unrecorded');
 * const themedTreasure = UNIQUE_EQUIPMENT_PIXEL_SKINS.resolveTreasure('excalibur', 'first_explorer');
 */

const UNIQUE_EQUIPMENT_SKIN_THEMES = Object.freeze({
  unrecorded: Object.freeze({
    heroId: 'hero_engineer', skinKey: 'unrecorded', name: '미기록자',
    palette: {
      k: '#0b1018', a: '#4a5664', b: '#252f3c', c: '#bdcbd8',
      o: '#48eaff', w: '#efffff', d: '#586372', e: '#1b2430',
      y: '#58eaff', s: '#c2d2dc', m: '#8696a8', n: '#202a36',
      g: '#121b28', r: '#55dce9', i: '#24eaff', j: '#d7ffff', q: '#17778d',
      t: '#5e8390', T: '#a4c5ce'
    },
    fallback: '#8ba2b2', white: '#efffff', detail: '#24eaff', darkDetail: '#17778d'
  }),
  first_explorer: Object.freeze({
    heroId: 'hero_swordsman', skinKey: 'first_explorer', name: '최초의 탐험가',
    palette: {
      k: '#1b1a20', a: '#24365b', b: '#14213c', c: '#f1e8cf',
      o: '#d9ab4e', w: '#fff8e7', d: '#886642', e: '#493421',
      y: '#d5a33d', s: '#e0d4b8', m: '#a9844c', n: '#51412f',
      g: '#241c20', r: '#a8753f', i: '#f2cc68', j: '#fff2c4', q: '#78603a',
      t: '#b38b4c', T: '#e0c277'
    },
    fallback: '#d7c49a', white: '#fff8e7', detail: '#f2cc68', darkDetail: '#78603a'
  }),
  primordial: Object.freeze({
    heroId: 'hero_druid', skinKey: 'primordial', name: '시원체',
    palette: {
      k: '#30243c', a: '#ddd5e9', b: '#ab9cbd', c: '#faf5ff',
      o: '#e7ad50', w: '#fff8e8', d: '#927b9c', e: '#52415f',
      y: '#e8bc68', s: '#e7def3', m: '#c5b8d9', n: '#675474',
      g: '#453551', r: '#c28b55', i: '#f3c46c', j: '#fff1c5', q: '#9dbb93',
      t: '#bcaad0', T: '#f0d9a0'
    },
    fallback: '#c6b6d6', white: '#fff8e8', detail: '#f3c46c', darkDetail: '#9dbb93'
  })
});

const UNIQUE_EQUIPMENT_HERO_THEME = Object.freeze({
  hero_engineer: 'unrecorded',
  hero_swordsman: 'first_explorer',
  hero_druid: 'primordial'
});


// 23 existing DATA_WEAPONS entries had no WEAPON_SPRITE link in the source game
// and silently fell back to the generic pistol. Give each one a native WPIX silhouette.
const UNIQUE_EQUIPMENT_MISSING_WEAPON_SPRITES = Object.freeze({
  weapon_brandiron_001: 'brandiron',
  weapon_brandshot_001: 'brandshot',
  weapon_frostshard_001: 'frostshard',
  weapon_detonator_001: 'detonator',
  weapon_pinspear_001: 'pinspear',
  weapon_singularity_001: 'singularity',
  weapon_flashpistol_001: 'flashpistol',
  weapon_radiantshot_001: 'radiantshot',
  weapon_dawnbeam_001: 'dawnbeam',
  weapon_corrosiverivet_001: 'corrosiverivet',
  weapon_plaguethrower_001: 'plaguethrower',
  weapon_judgflash_001: 'judgflash',
  weapon_grailight_001: 'grailight',
  weapon_archangel_001: 'archangel',
  weapon_staticpistol_001: 'staticpistol',
  weapon_arcsmg_001: 'arcsmg',
  weapon_voltspear_001: 'voltspear',
  weapon_stormscepter_001: 'stormscepter',
  weapon_clustergrenade_001: 'clustergrenade',
  weapon_boltsentry_001: 'boltsentry',
  weapon_infernosentry_001: 'infernosentry',
  weapon_wavesentry_001: 'wavesentry',
  weapon_thundersentry_001: 'thundersentry'
});

const UNIQUE_EQUIPMENT_MISSING_WEAPON_ART = Object.freeze({
  brandiron: { auto: true, p: [2, 3], rows: ['..mmmmmm....', '.mccccccmm..', 'naaaaaaaaaan', '.nbbbbbbnn..', '.gg..gg.....', '.gg.........'] },
  brandshot: { auto: true, p: [3, 3], rows: ['..mmmmmmmmmm..', '.mccccccccccm.', 'naaaaaaaaaaaann', 'nbbbbbbbbbbbbnn', '.gg..gg........', '.gg............'] },
  frostshard: { auto: true, p: [2, 3], rows: ['...cc....', '..cccc...', '.ccaaac..', '..cbbbc..', '...cba...', '...gg....', '...gg....'] },
  detonator: { auto: true, p: [5, 4], rows: ['...nnnnnnnn....', '..ncccccccnn...', '.naaaaaaaaaan..', '.nbbbbbbbooon..', '....gg..gg.....', '....gg.........'] },
  pinspear: { auto: true, p: [6, 2], rows: ['....................c.', '...................ccc.', 'ddddddddddddddddddcaaac', '...................ccc..', '....................c...'] },
  singularity: { auto: true, p: [3, 5], rows: ['...nnnnnn....', '..naaaaaan...', '.naacccaaaan..', '.naaoooaaaan..', '..nbbbbbbn...', '...gg.........', '...gg.........'] },
  flashpistol: { auto: true, p: [2, 3], rows: ['...ccccccc...', '.caaaaaaaaann', 'naabbbbbbbnn.', '.gg..ooo.....', '.gg..........'] },
  radiantshot: { auto: true, p: [3, 3], rows: ['...wwwwwwww...', '..wccccccccw..', '.naaaaaaaaaann', '.nbbbbbbbbbbn.', '...gg..gg......'] },
  dawnbeam: { auto: true, p: [4, 4], rows: ['....wwwwwwwwwwww..', '...wccccccccccccw.', '..naaaaaaaaaaaaaan', '..nbbbbbbbbbbbbboo', '....gg..gg.........', '....gg.............'] },
  corrosiverivet: { auto: true, p: [2, 3], rows: ['..nnnnnnnn...', '.naaaaaaaann.', 'naacccccccaan.', '.nbbbbbbbnn...', '.gg..nn.......', '.gg...........'] },
  plaguethrower: { auto: true, p: [5, 4], rows: ['..gg...........', '..nnnnnnnnnnn...', '.noooaaaaaaaan..', '.noooabbbbbbbn..', '..gg..gg........', '......gg........'] },
  judgflash: { auto: true, p: [3, 3], rows: ['....wwwwww...', '..wwccccccww.', '.naaaaaaaaaann', '.nbbbbooobbn..', '..gg..gg......'] },
  grailight: { auto: true, p: [3, 2], rows: ['..........y....', '.........ywy...', 'ddddddddddoy...', '.........ywy...', '..........y....'] },
  archangel: { auto: true, p: [3, 3], rows: ['...........ww..', '.........wwww..', 'dddddddddooyy...', '.........wwww..', '...........ww..'] },
  staticpistol: { auto: true, p: [2, 3], rows: ['..cccccccc...', '.caaaaaaaaann', 'naabbbbbbbbn..', '.gg..oo.......', '.gg...........'] },
  arcsmg: { auto: true, p: [2, 3], rows: ['..cccccccccc..', 'naaaaaaaaaaann', 'nbboobboobbbb..', '.gg...nn.......', '.gg...nn.......'] },
  voltspear: { auto: true, p: [5, 2], rows: ['..................oo.', '.................ooo.', 'dddddddddddddddcaaaaac', '.................ooo..', '..................o...'] },
  stormscepter: { auto: true, p: [3, 2], rows: ['...........oooo.', '..........oowoo.', 'dddddddddddooooo', '..........oowoo.', '...........oooo.'] },
  clustergrenade: { auto: true, p: [3, 4], rows: ['...nnnnn...', '..naaaaann..', '.naaooaaaan.', '.naaaaaaaan.', '..nbbbbnn...', '...gg.......'] },
  boltsentry: { auto: true, p: [3, 4], rows: ['...oooo......', '..oocccoo....', '.naaaaaaann..', '.nbbbbbbbn...', '...gg..gg.....', '..gg....gg....'] },
  infernosentry: { auto: true, p: [5, 4], rows: ['..rrr...........', '.rrwrrmmmmmmm...', 'rrrrraaaaaaaaan.', 'rrrrrabbbbbbbbn.', '.rrr..gg.........', '......gg.........'] },
  wavesentry: { auto: true, p: [4, 4], rows: ['...ooooo.......', '..oowwooo......', '.naaaaaaaaann..', '.nbbbbbbbbbbn..', '...gg..gg.......', '...gg...........'] },
  thundersentry: { auto: true, p: [3, 4], rows: ['...oo....oo...', '..oooo..oooo..', '.naaaaaaaaann.', '.nbbbbbbbbbbn.', '...gg..gg......', '...gg..........'] }
});

function uniqueEquipmentSourceSpriteKey(def, WEAPON_SPRITE) {
  return (WEAPON_SPRITE && WEAPON_SPRITE[def.id]) || UNIQUE_EQUIPMENT_MISSING_WEAPON_SPRITES[def.id] || 'pistol';
}

function uniquePixelClamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function uniquePixelCloneRows(rows) {
  return (rows || []).map((row) => String(row).split(''));
}

function uniquePixelRowsToStrings(grid) {
  return grid.map((row) => row.join(''));
}

function uniquePixelEligible(grid) {
  const out = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const ch = grid[y][x];
      if (ch !== '.' && ch !== 'k' && ch !== undefined) out.push([x, y]);
    }
  }
  return out;
}

function uniquePixelNearest(points, x, y, used) {
  let best = null, bestScore = Infinity;
  for (const p of points) {
    const key = p[0] + ',' + p[1];
    if (used && used.has(key)) continue;
    const dx = p[0] - x, dy = p[1] - y;
    const score = dx * dx + dy * dy * 1.25;
    if (score < bestScore) { bestScore = score; best = p; }
  }
  return best;
}

function uniquePixelAccent(grid, points, x, y, glyph, used) {
  const p = uniquePixelNearest(points, x, y, used);
  if (!p) return null;
  grid[p[1]][p[0]] = glyph;
  if (used) used.add(p[0] + ',' + p[1]);
  return p;
}

function uniquePixelWeaponFamily(spriteKey) {
  const key = String(spriteKey || '').toLowerCase();
  if (/staff|scepter|wand|orb|worldtree|grailight|archangel|icicle|crystal/.test(key)) return 'staff';
  if (/bow|xbow|crossbow|string/.test(key)) return 'bow';
  if (/shield|chakram|boomerang|eclipse|ringgun|beartrap|shocktrap|singularity|clustergrenade|mine|detonator|boltsentry|infernosentry|wavesentry|thundersentry|dronectl|beehive/.test(key)) return 'relic';
  if (/sword|blade|dragonslayer|rapier|dagger|scythe|spear|lance|halberd|glaive|axe|hammer|club|shovel|whip|flail|kusarigama|pickaxe|mallet|torch|pan|executioner|earthbreaker|spinaxe|friendchain|harpoon|javelin|shortspear|boltjavelin|voltspear/.test(key)) return 'melee';
  return 'gun';
}

function uniquePixelPutBlank(grid, x, y, glyph) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return false;
  if (grid[y][x] !== '.') return false;
  grid[y][x] = glyph;
  return true;
}

// Adds one small silhouette pixel outside the source contour. For hand-outlined
// WPIX sprites, make a 1px outline and place its colored face immediately inward.
function uniquePixelAddContour(grid, auto, x, y, glyph, inwardX, inwardY) {
  if (y < 0 || y >= grid.length || x < 0 || x >= grid[y].length) return false;
  if (grid[y][x] !== '.') return false;
  if (auto) return uniquePixelPutBlank(grid, x, y, glyph);
  grid[y][x] = 'k';
  const ix = x + (inwardX || 0), iy = y + (inwardY || 0);
  if (iy >= 0 && iy < grid.length && ix >= 0 && ix < grid[iy].length && (grid[iy][ix] === '.' || grid[iy][ix] === 'k')) {
    grid[iy][ix] = glyph;
  }
  return true;
}

function uniquePixelDecorateWeapon(source, spriteKey, themeKey, theme) {
  const original = uniquePixelCloneRows(source.rows);
  const sourceW = Math.max(1, ...original.map((row) => row.length));
  const sourceH = Math.max(1, original.length);
  const pad = 2; // small ornament margin; original pixels remain in their original relative positions
  const grid = Array.from({ length: sourceH + pad * 2 }, () => Array(sourceW + pad * 2).fill('.'));
  for (let y = 0; y < original.length; y++) {
    for (let x = 0; x < original[y].length; x++) grid[y + pad][x + pad] = original[y][x];
  }

  const auto = !!source.auto;
  const body = [];
  for (let y = 0; y < grid.length; y++) for (let x = 0; x < grid[y].length; x++) {
    if (grid[y][x] !== '.') body.push([x, y]);
  }
  if (!body.length) {
    return { auto, p: source.p ? [source.p[0] + pad, source.p[1] + pad] : [pad, pad], rows: uniquePixelRowsToStrings(grid), pal: Object.assign({}, theme.palette) };
  }

  const xs = body.map((point) => point[0]), ys = body.map((point) => point[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY);
  const cx = Math.round(minX + spanX * 0.62), cy = Math.round((minY + maxY) / 2);
  const family = uniquePixelWeaponFamily(spriteKey);
  const handleX = uniquePixelClamp((source.p ? source.p[0] : 2) + pad, minX, maxX);
  const tipX = maxX;
  const used = new Set();
  const interior = uniquePixelEligible(grid);
  const accent = (x, y, glyph) => uniquePixelAccent(grid, interior, x, y, glyph, used);
  const contour = (x, y, glyph, ix, iy) => uniquePixelAddContour(grid, auto, x, y, glyph, ix, iy);

  // Theme-specific geometry. Each treatment adds only a handful of edge pixels,
  // while the original weapon body, grip and silhouette remain recognizable.
  if (themeKey === 'unrecorded') {
    // A raised data rail, a broken antenna and one detached glitch chip.
    contour(cx, minY - 1, 'i', 0, 1);
    contour(Math.min(maxX + 1, cx + 2), minY - 1, 'q', 0, 1);
    contour(Math.min(maxX + 1, tipX + 1), cy - 1, 'j', -1, 0);
    if (family === 'melee') {
      contour(Math.max(0, handleX + 1), minY - 1, 'q', 0, 1);
      contour(Math.min(grid[0].length - 1, cx + 1), maxY + 1, 'i', 0, -1);
    } else if (family === 'staff') {
      contour(Math.min(grid[0].length - 1, tipX + 1), cy + 1, 'i', -1, 0);
      accent(cx, cy, 'j');
    } else if (family === 'bow') {
      contour(cx, maxY + 1, 'q', 0, -1);
      accent(cx, cy, 'i');
    } else if (family === 'relic') {
      contour(cx, minY - 1, 'j', 0, 1);
      accent(cx, cy, 'i');
    } else {
      contour(Math.max(0, handleX), maxY + 1, 'q', 0, -1);
      accent(cx, cy, 'i');
    }
    // Two interrupted traces embedded in the weapon body.
    accent(cx + 1, cy - 1, 'j');
    accent(Math.round(minX + spanX * 0.78), cy + 1, 'i');
  } else if (themeKey === 'first_explorer') {
    // Compass-like raised sight / small brass crown and shaped metal fittings.
    contour(cx, minY - 1, 'j', 0, 1);
    contour(cx - 1, minY - 1, 'i', 1, 0);
    contour(cx + 1, minY - 1, 'i', -1, 0);
    contour(Math.min(grid[0].length - 1, tipX + 1), cy, 'y', -1, 0);
    if (family === 'melee') {
      contour(Math.max(0, handleX + 1), minY - 1, 'm', 0, 1);
      contour(Math.max(0, handleX + 1), maxY + 1, 'm', 0, -1);
      accent(Math.round(minX + spanX * 0.40), cy, 'j');
    } else if (family === 'staff') {
      contour(Math.min(grid[0].length - 1, tipX), minY - 1, 'j', 0, 1);
      contour(Math.min(grid[0].length - 1, tipX), maxY + 1, 'm', 0, -1);
      accent(cx, cy, 'i');
    } else if (family === 'bow') {
      contour(Math.max(0, minX - 1), minY + 1, 'm', 1, 0);
      contour(Math.max(0, minX - 1), maxY - 1, 'm', 1, 0);
      accent(cx, cy, 'j');
    } else if (family === 'relic') {
      contour(Math.max(0, minX - 1), cy, 'm', 1, 0);
      accent(cx, cy, 'j');
    } else {
      // A tiny brass barrel collar and inset compass jewel.
      accent(Math.round(minX + spanX * 0.76), cy, 'm');
      accent(cx, cy, 'j');
      contour(Math.max(0, handleX), maxY + 1, 'q', 0, -1);
    }
    accent(cx - 1, cy, 'i');
    accent(cx + 1, cy, 'i');
  } else if (themeKey === 'primordial') {
    // Small forked root/leaf growths integrated into the upper and lower contour.
    contour(cx - 1, minY - 1, 'q', 0, 1);
    contour(cx, minY - 2, 'j', 0, 1);
    contour(cx + 1, minY - 1, 'q', 0, 1);
    if (family === 'melee') {
      contour(Math.min(grid[0].length - 1, tipX + 1), cy - 1, 'q', -1, 0);
      contour(Math.max(0, handleX), maxY + 1, 'q', 0, -1);
      accent(Math.round(minX + spanX * 0.34), cy, 'j');
    } else if (family === 'staff') {
      contour(Math.min(grid[0].length - 1, tipX + 1), cy, 'q', -1, 0);
      contour(Math.min(grid[0].length - 1, tipX), cy - 1, 'j', 0, 1);
      contour(Math.min(grid[0].length - 1, tipX), cy + 1, 'q', 0, -1);
      accent(Math.max(minX, tipX - 1), cy, 'j');
    } else if (family === 'bow') {
      contour(cx, maxY + 1, 'q', 0, -1);
      contour(Math.max(0, minX - 1), cy, 'q', 1, 0);
      accent(cx, cy, 'j');
    } else if (family === 'relic') {
      contour(Math.max(0, minX - 1), cy - 1, 'q', 1, 0);
      contour(Math.min(grid[0].length - 1, maxX + 1), cy + 1, 'q', -1, 0);
      accent(cx, cy, 'j');
    } else {
      contour(Math.min(grid[0].length - 1, tipX + 1), cy - 1, 'q', -1, 0);
      contour(Math.max(0, handleX), maxY + 1, 'q', 0, -1);
      accent(cx, cy, 'j');
    }
    accent(cx - 1, cy, 'i');
    accent(cx + 1, cy, 'i');
  }

  // Keep legacy/custom glyphs renderable while retaining theme-specific materials.
  const pal = Object.assign({}, theme.palette);
  for (const row of grid) for (const ch of row) {
    if (ch !== '.' && !Object.prototype.hasOwnProperty.call(pal, ch)) pal[ch] = theme.fallback;
  }

  return {
    auto,
    p: source.p ? [source.p[0] + pad, source.p[1] + pad] : [pad, pad],
    rows: uniquePixelRowsToStrings(grid),
    pal
  };
}

function uniquePixelHexChannels(hex) {
  const h = String(hex || '#808080').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const n = parseInt(full, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function uniquePixelTreasurePalette(sourcePal, themeKey, theme) {
  const out = {};
  for (const [key, oldColor] of Object.entries(sourcePal || {})) {
    const [r, g, b] = uniquePixelHexChannels(oldColor);
    const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;
    if (key === 'w' || luminance > 232) out[key] = theme.white;
    else if (['y', 'Y'].includes(key)) out[key] = theme.palette.y;
    else if (['o', 'O', 'm', 'M'].includes(key)) out[key] = theme.palette.m;
    else if (['r', 'R'].includes(key)) out[key] = theme.palette.r;
    else if (['p', 'q', 'P', 'Q'].includes(key)) out[key] = themeKey === 'primordial' ? theme.palette.q : theme.palette.b;
    else if (['g', 'G', 'd', 'D'].includes(key)) out[key] = theme.palette.d;
    else if (luminance < 55) out[key] = theme.palette.k;
    else if (luminance < 125) out[key] = theme.palette.n;
    else if (luminance < 190) out[key] = theme.palette.a;
    else out[key] = theme.palette.c;
  }
  out.i = theme.palette.i; out.j = theme.palette.j; out.q = theme.palette.q;
  return out;
}

function uniquePixelWrapTreasureProc(proc, themeKey, size) {
  const dim = Math.max(16, Number(size) || 16);
  const scale = dim / 16;
  const px = (P, x, y, glyph) => P.px(Math.round(x * scale), Math.round(y * scale), glyph);
  const line = (P, x1, y1, x2, y2, glyph) => P.line(Math.round(x1 * scale), Math.round(y1 * scale), Math.round(x2 * scale), Math.round(y2 * scale), glyph);
  return function (P) {
    proc(P);
    // Tiny contour ornaments reshape the icon frame without obscuring its original symbol.
    if (themeKey === 'unrecorded') {
      line(P, 1, 3, 3, 1, 'q'); line(P, 12, 14, 14, 12, 'i');
      px(P, 2, 4, 'j'); px(P, 13, 11, 'q'); px(P, 14, 2, 'i');
    } else if (themeKey === 'first_explorer') {
      line(P, 7, 1, 8, 0, 'y'); line(P, 8, 0, 9, 1, 'j');
      line(P, 1, 8, 3, 6, 'm'); line(P, 12, 10, 14, 8, 'y');
      px(P, 8, 2, 'j'); px(P, 7, 3, 'i'); px(P, 9, 3, 'i');
    } else if (themeKey === 'primordial') {
      line(P, 1, 13, 3, 11, 'q'); line(P, 3, 11, 4, 8, 'q');
      line(P, 14, 12, 12, 10, 'q'); line(P, 12, 10, 11, 7, 'q');
      px(P, 3, 10, 'j'); px(P, 12, 9, 'j'); px(P, 8, 3, 'j');
    }
  };
}

function createUniqueEquipmentPixelSkins({ WPIX, WEAPON_SPRITE, DATA_WEAPONS, TREASURE_ICONS }) {
  if (!WPIX || !WEAPON_SPRITE || !Array.isArray(DATA_WEAPONS)) {
    throw new Error('WPIX, WEAPON_SPRITE, DATA_WEAPONS가 필요합니다.');
  }
  const skins = {};
  const weaponIdMap = {};
  const sourceKeys = new Set(DATA_WEAPONS.map((def) => uniqueEquipmentSourceSpriteKey(def, WEAPON_SPRITE)));
  for (const [skinKey, theme] of Object.entries(UNIQUE_EQUIPMENT_SKIN_THEMES)) {
    const weapons = {};
    for (const spriteKey of sourceKeys) {
      const source = WPIX[spriteKey] || UNIQUE_EQUIPMENT_MISSING_WEAPON_ART[spriteKey] || WPIX.pistol;
      if (!source) continue;
      weapons[spriteKey] = uniquePixelDecorateWeapon(source, spriteKey, skinKey, theme);
    }
    const treasures = {};
    for (const [iconKey, source] of Object.entries(TREASURE_ICONS || {})) {
      const def = Object.assign({}, source, {
        pal: uniquePixelTreasurePalette(source.pal, skinKey, theme),
        proc: uniquePixelWrapTreasureProc(source.proc, skinKey, 16)
      });
      if (source.big && source.big.proc) {
        def.big = Object.assign({}, source.big, { proc: uniquePixelWrapTreasureProc(source.big.proc, skinKey, source.big.size || 32) });
      }
      treasures[iconKey] = def;
    }
    skins[skinKey] = { name: theme.name, heroId: theme.heroId, weapons, treasures };
  }

  for (const def of DATA_WEAPONS) weaponIdMap[def.id] = uniqueEquipmentSourceSpriteKey(def, WEAPON_SPRITE);

  return Object.freeze({
    version: '1.2.0',
    themes: UNIQUE_EQUIPMENT_SKIN_THEMES,
    heroThemeMap: UNIQUE_EQUIPMENT_HERO_THEME,
    weaponCount: DATA_WEAPONS.length,
    mappedWeaponCount: DATA_WEAPONS.length,
    originalExplicitSpriteMappingCount: DATA_WEAPONS.filter((def) => !!WEAPON_SPRITE[def.id]).length,
    generatedDedicatedSpriteCount: DATA_WEAPONS.filter((def) => !WEAPON_SPRITE[def.id] && !!UNIQUE_EQUIPMENT_MISSING_WEAPON_SPRITES[def.id]).length,
    originalPistolFallbackIds: DATA_WEAPONS.filter((def) => !WEAPON_SPRITE[def.id]).map((def) => def.id),
    sourceSpriteKeys: Array.from(sourceKeys).sort(),
    weaponIdMap,
    skins,
    resolveWeapon(def, skinKey) {
      const skin = skins[skinKey];
      if (!skin || !def) return null;
      const sourceKey = weaponIdMap[def.id] || uniqueEquipmentSourceSpriteKey(def, WEAPON_SPRITE);
      return skin.weapons[sourceKey] || null;
    },
    resolveTreasure(iconKey, skinKey) {
      const skin = skins[skinKey];
      return skin && skin.treasures ? skin.treasures[iconKey] || null : null;
    },
    resolveThemeForEquippedSkin(heroId, equippedSkinKey) {
      const expected = UNIQUE_EQUIPMENT_HERO_THEME[heroId];
      return expected && expected === equippedSkinKey ? expected : null;
    }
  });
}

// Expose a stable factory for classic-script use; does not modify WPIX or game state.
if (typeof globalThis !== 'undefined') {
  globalThis.createUniqueEquipmentPixelSkins = createUniqueEquipmentPixelSkins;
  globalThis.UNIQUE_EQUIPMENT_SKIN_THEMES = UNIQUE_EQUIPMENT_SKIN_THEMES;
  globalThis.UNIQUE_EQUIPMENT_HERO_THEME = UNIQUE_EQUIPMENT_HERO_THEME;
}
