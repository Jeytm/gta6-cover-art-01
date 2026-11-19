// Neon Palms Cover Studio — cover renderer.
// Pure canvas drawing: poster layouts, colour grades, bold lettering, grain, vignette.
// No network, no DOM except the canvas it is handed. Every line below is original.

export const LAYOUT_IDS = ['hero3', 'grid4', 'strip', 'nine', 'tilt', 'triptych'];
export const LAYOUT_NAMES = {
  hero3: 'Hero + 3',
  grid4: 'Four Panel',
  strip: 'Hero Strip',
  nine: 'Nine Grid',
  tilt: 'Snapshots',
  triptych: 'Triptych',
};
export const GRADE_IDS = ['sunset', 'neon', 'gold', 'noir', 'candy'];
export const GRADE_NAMES = {
  sunset: 'Vice Sunset',
  neon: 'Neon Nights',
  gold: 'Palm Gold',
  noir: 'Mono Noir',
  candy: 'Cotton Candy',
};
export const SIZES = [
  { id: '1080x1080', label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { id: '1080x1350', label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { id: '1920x1080', label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

// Colour grades: a canvas filter for the photo plus a gradient wash laid over it.
export const GRADES = {
  sunset: {
    filter: 'saturate(1.35) contrast(1.08) sepia(0.16)',
    wash: ['#ff7a18', '#ff2d78'], washMode: 'overlay', washAlpha: 0.20,
    titleTop: '#fff6c9', titleBottom: '#ffb347', accent: '#ff5e78', glow: '#ff2d78',
  },
  neon: {
    filter: 'saturate(1.5) contrast(1.12)',
    wash: ['#00e5ff', '#ff2d95'], washMode: 'overlay', washAlpha: 0.24,
    titleTop: '#e8ffff', titleBottom: '#ff7ad9', accent: '#2de2ff', glow: '#ff2d95',
  },
  gold: {
    filter: 'saturate(1.42) contrast(1.12) sepia(0.22)',
    wash: ['#ffcf5c', '#ff7a18'], washMode: 'overlay', washAlpha: 0.22,
    titleTop: '#fff3c4', titleBottom: '#ffcf5c', accent: '#ffb347', glow: '#ff9d00',
  },
  noir: {
    filter: 'grayscale(1) contrast(1.28) brightness(1.06)',
    wash: null, washMode: 'overlay', washAlpha: 0,
    titleTop: '#ffffff', titleBottom: '#c9c9c9', accent: '#ffffff', glow: '#888888',
  },
  candy: {
    filter: 'saturate(1.45) contrast(1.02)',
    wash: ['#ff9de2', '#7b61ff'], washMode: 'soft-light', washAlpha: 0.26,
    titleTop: '#ffffff', titleBottom: '#ffb3e6', accent: '#ff8ad8', glow: '#b388ff',
  },
};

// A tiny seeded RNG so the grain is identical on every render.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainTile = null;
function grainPattern(ctx) {
  if (grainTile) return grainTile;
  const tile = document.createElement('canvas');
  tile.width = 160; tile.height = 160;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(160, 160);
  const rnd = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainTile = ctx.createPattern(tile, 'repeat');
  return grainTile;
}

// Layout geometry. All rects are absolute pixels inside the white poster frame.
// Returns { panels: [{x,y,w,h,rot}], title: {x,y,w,h,align,band}, bg: panelIndex|null }.
export function layoutGeometry(layout, W, H) {
  const frame = Math.round(Math.min(W, H) * 0.022);
  const gut = Math.round(Math.min(W, H) * 0.011);
  const ix = frame, iy = frame, iw = W - frame * 2, ih = H - frame * 2;
  const cell = (col, row, cols, rows) => ({
    x: ix + (iw * col) / cols + (col > 0 ? gut / 2 : 0),
    y: iy + (ih * row) / rows + (row > 0 ? gut / 2 : 0),
    w: iw / cols - (cols > 1 ? gut * (cols - 1) / cols : 0),
    h: ih / rows - (rows > 1 ? gut * (rows - 1) / rows : 0),
    rot: 0,
  });
  switch (layout) {
    case 'hero3': {
      const heroW = iw * 0.615;
      const sideX = ix + heroW + gut;
      const sideW = iw - heroW - gut;
      const third = (ih - gut * 2) / 3;
      return {
        panels: [
          { x: ix, y: iy, w: heroW, h: ih, rot: 0 },
          { x: sideX, y: iy, w: sideW, h: third, rot: 0 },
          { x: sideX, y: iy + third + gut, w: sideW, h: third, rot: 0 },
          { x: sideX, y: iy + (third + gut) * 2, w: sideW, h: third, rot: 0 },
        ],
        title: { x: ix, y: iy + ih * 0.66, w: heroW, h: ih * 0.34, align: 'left', band: 'scrim' },
        bg: null,
      };
    }
    case 'grid4': {
      const panels = [cell(0, 0, 2, 2), cell(1, 0, 2, 2), cell(0, 1, 2, 2), cell(1, 1, 2, 2)];
      return {
        panels,
        title: { x: ix, y: iy + ih * 0.78, w: iw, h: ih * 0.22, align: 'center', band: 'scrim' },
        bg: null,
      };
    }
    case 'strip': {
      const heroH = ih * 0.66;
      const stripY = iy + heroH + gut;
      const stripH = ih - heroH - gut;
      const third = (iw - gut * 2) / 3;
      return {
        panels: [
          { x: ix, y: iy, w: iw, h: heroH, rot: 0 },
          { x: ix, y: stripY, w: third, h: stripH, rot: 0 },
          { x: ix + third + gut, y: stripY, w: third, h: stripH, rot: 0 },
          { x: ix + (third + gut) * 2, y: stripY, w: third, h: stripH, rot: 0 },
        ],
        title: { x: ix, y: iy + heroH * 0.62, w: iw, h: heroH * 0.38, align: 'left', band: 'scrim' },
        bg: null,
      };
    }
    case 'nine': {
      const panels = [];
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) panels.push(cell(c, r, 3, 3));
      const centre = panels[4];
      // The centre cell is a photo with the title over a scrim — a solid dark
      // block reads as a hole in the poster, not as cover art.
      return {
        panels,
        title: { x: centre.x, y: centre.y, w: centre.w, h: centre.h, align: 'center', band: 'scrim' },
        bg: null,
        titleCell: 4,
      };
    }
    case 'tilt': {
      return {
        panels: [
          { x: ix, y: iy, w: iw, h: ih, rot: 0 },
          { x: ix + iw * 0.05, y: iy + ih * 0.07, w: iw * 0.42, h: ih * 0.50, rot: -0.09 },
          { x: ix + iw * 0.53, y: iy + ih * 0.05, w: iw * 0.42, h: ih * 0.48, rot: 0.07 },
          // The bottom snapshot ends above the title band (0.80) so the title
          // never prints over a polaroid's white border.
          { x: ix + iw * 0.28, y: iy + ih * 0.44, w: iw * 0.44, h: ih * 0.34, rot: -0.03 },
        ],
        title: { x: ix + iw * 0.06, y: iy + ih * 0.80, w: iw * 0.88, h: ih * 0.17, align: 'center', band: 'scrim' },
        bg: 0,
      };
    }
    case 'triptych':
    default: {
      const third = (iw - gut * 2) / 3;
      const photoH = ih * 0.76;
      return {
        panels: [
          { x: ix, y: iy, w: third, h: photoH, rot: 0 },
          { x: ix + third + gut, y: iy, w: third, h: photoH, rot: 0 },
          { x: ix + (third + gut) * 2, y: iy, w: third, h: photoH, rot: 0 },
        ],
        title: { x: ix, y: iy + photoH + gut, w: iw, h: ih - photoH - gut, align: 'center', band: 'solid' },
        bg: null,
      };
    }
  }
}

function coverFit(img, rect, panel) {
  const zoom = panel.zoom || 1;
  const scale = Math.max(rect.w / img.width, rect.h / img.height) * zoom;
  const dw = img.width * scale;
  const dh = img.height * scale;
  const dx = rect.x + (rect.w - dw) / 2 + (panel.ox || 0) * rect.w * 0.35;
  const dy = rect.y + (rect.h - dh) / 2 + (panel.oy || 0) * rect.h * 0.35;
  return { dx, dy, dw, dh };
}

function drawPhotoPanel(ctx, img, rect, panel, grade) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (img) {
    const { dx, dy, dw, dh } = coverFit(img, rect, panel);
    ctx.filter = grade.filter;
    if (panel.flip) {
      ctx.translate(rect.x + rect.w / 2, 0);
      ctx.scale(-1, 1);
      ctx.translate(-(rect.x + rect.w / 2), 0);
    }
    ctx.drawImage(img, dx, dy, dw, dh);
    ctx.filter = 'none';
    if (grade.wash) {
      const wash = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w * 0.25, rect.y + rect.h);
      wash.addColorStop(0, grade.wash[0]);
      wash.addColorStop(1, grade.wash[1]);
      ctx.globalCompositeOperation = grade.washMode;
      ctx.globalAlpha = grade.washAlpha;
      ctx.fillStyle = wash;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
  } else {
    const empty = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
    empty.addColorStop(0, '#3a2b4d');
    empty.addColorStop(1, '#120e1c');
    ctx.fillStyle = empty;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = `700 ${Math.round(rect.h * 0.22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', rect.x + rect.w / 2, rect.y + rect.h / 2);
  }
  ctx.restore();
  // Thin keyline around every panel, like a printed poster.
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = Math.max(2, Math.min(rect.w, rect.h) * 0.006);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
}

function fitFont(ctx, text, maxWidth, startSize, family, weight) {
  let size = startSize;
  while (size > 12) {
    ctx.font = `${weight} ${size}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size = Math.floor(size * 0.92);
  }
  return size;
}

function drawTitleBlock(ctx, zone, title, subtitle, grade) {
  const pad = Math.round(Math.min(zone.w, zone.h) * 0.06);
  if (zone.band === 'scrim') {
    const scrim = ctx.createLinearGradient(0, zone.y, 0, zone.y + zone.h);
    scrim.addColorStop(0, 'rgba(10,6,20,0)');
    scrim.addColorStop(0.45, 'rgba(10,6,20,0.55)');
    scrim.addColorStop(1, 'rgba(10,6,20,0.82)');
    ctx.fillStyle = scrim;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
  } else if (zone.band === 'solid') {
    const solid = ctx.createLinearGradient(zone.x, zone.y, zone.x, zone.y + zone.h);
    solid.addColorStop(0, '#241536');
    solid.addColorStop(1, '#0e0918');
    ctx.fillStyle = solid;
    ctx.fillRect(zone.x, zone.y, zone.w, zone.h);
    ctx.strokeStyle = grade.accent;
    ctx.lineWidth = Math.max(2, zone.h * 0.02);
    ctx.strokeRect(zone.x + 1, zone.y + 1, zone.w - 2, zone.h - 2);
  }

  const cx = zone.align === 'center' ? zone.x + zone.w / 2 : zone.x + pad;
  const maxW = zone.w - pad * 2;
  const family = '"Arial Black", "Noto Sans", "Liberation Sans", sans-serif';
  ctx.textAlign = zone.align === 'center' ? 'center' : 'left';
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';

  const titleSize = fitFont(ctx, title.toUpperCase(), maxW, Math.round(zone.h * 0.52), family, 900);
  const grad = ctx.createLinearGradient(0, zone.y + zone.h * 0.08, 0, zone.y + zone.h * 0.62);
  grad.addColorStop(0, grade.titleTop);
  grad.addColorStop(1, grade.titleBottom);
  const titleY = zone.y + zone.h * 0.48;
  ctx.lineJoin = 'round';
  // A poster title needs weight: thick dark outline plus a soft drop shadow
  // so it holds over bright photos, and an accent rule under it.
  ctx.strokeStyle = 'rgba(16,8,28,0.92)';
  ctx.lineWidth = Math.max(2, titleSize * 0.12);
  ctx.shadowColor = 'rgba(10,4,20,0.65)';
  ctx.shadowBlur = Math.round(titleSize * 0.18);
  ctx.shadowOffsetY = Math.round(titleSize * 0.06);
  ctx.strokeText(title.toUpperCase(), cx, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(title.toUpperCase(), cx, titleY);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  const ruleW = Math.min(maxW * 0.30, ctx.measureText(title.toUpperCase()).width * 0.42);
  const ruleX = zone.align === 'center' ? cx - ruleW / 2 : cx;
  ctx.fillStyle = grade.accent;
  ctx.fillRect(ruleX, titleY + Math.round(titleSize * 0.22), ruleW, Math.max(3, Math.round(titleSize * 0.055)));

  if (subtitle) {
    const subSize = Math.max(12, Math.round(titleSize * 0.34));
    ctx.font = `italic 700 ${subSize}px "Noto Sans", "Liberation Sans", sans-serif`;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${Math.max(2, subSize * 0.22)}px`;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = Math.round(subSize * 0.9);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subtitle.toUpperCase(), cx, zone.y + zone.h * 0.82);
    ctx.shadowBlur = 0;
  }
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function drawBadge(ctx, W, H, grade, stars) {
  const s = Math.min(W, H);
  const r = Math.round(s * 0.052);
  const cx = W - r - Math.round(s * 0.035);
  const cy = r + Math.round(s * 0.035);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grade.accent;
  ctx.fill();
  ctx.lineWidth = Math.max(2, s * 0.004);
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${Math.round(r * 0.62)}px "Noto Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('★', cx, cy + 1);
  ctx.restore();
  if (stars > 0) {
    // The meter sits well inside the poster frame: at the old 0.045 margin
    // the last star was clipped by the frame edge in the screenshots.
    ctx.font = `900 ${Math.round(s * 0.026)}px "Noto Sans", sans-serif`;
    ctx.textAlign = 'right';
    // Middle baseline: the star glyph sits low in some fonts, so centre it
    // on its row instead of hanging it from the alphabetic baseline.
    ctx.textBaseline = 'middle';
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = grade.glow;
    ctx.shadowBlur = Math.round(s * 0.012);
    ctx.fillText('★'.repeat(stars) + '☆'.repeat(5 - stars), W - Math.round(s * 0.062), H - Math.round(s * 0.062));
    ctx.shadowBlur = 0;
  }
}

// Draw one cover. state: {layout, grade, title, subtitle, grain, vignette, badge, stars, panels[]}
// photos: array of HTMLImageElement (or null) indexed by panel.photo.
export function drawCover(ctx, W, H, state, photos) {
  const grade = GRADES[state.grade] || GRADES.sunset;
  const geo = layoutGeometry(state.layout || 'hero3', W, H);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  const panelOf = (i) => (state.panels && state.panels[i]) || { photo: null, zoom: 1, ox: 0, oy: 0, flip: false };
  const photoOf = (i) => {
    const p = panelOf(i);
    return p.photo === null || p.photo === undefined ? null : photos[p.photo] || null;
  };

  if (geo.bg !== null && geo.bg !== undefined) {
    // Full-bleed background photo, then tilted snapshots on top.
    drawPhotoPanel(ctx, photoOf(geo.bg), geo.panels[geo.bg], panelOf(geo.bg), grade);
    for (let i = 0; i < geo.panels.length; i++) {
      if (i === geo.bg) continue;
      const rect = geo.panels[i];
      const border = Math.round(Math.min(rect.w, rect.h) * 0.045);
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = Math.round(Math.min(W, H) * 0.02);
      ctx.shadowOffsetY = Math.round(Math.min(W, H) * 0.008);
      ctx.fillRect(-rect.w / 2, -rect.h / 2, rect.w, rect.h);
      ctx.restore();
      const inner = { x: rect.x + border, y: rect.y + border, w: rect.w - border * 2, h: rect.h - border * 2 - border * 1.6, rot: 0 };
      ctx.save();
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-(rect.x + rect.w / 2), -(rect.y + rect.h / 2));
      drawPhotoPanel(ctx, photoOf(i), inner, panelOf(i), grade);
      ctx.restore();
    }
  } else {
    // Every panel draws its photo, the title cell included: the title block
    // paints its scrim over the centre photo afterwards.
    geo.panels.forEach((rect, i) => {
      drawPhotoPanel(ctx, photoOf(i), rect, panelOf(i), grade);
    });
  }

  drawTitleBlock(ctx, geo.title, state.title || 'NEON SHORE', state.subtitle || '', grade);
  if (state.badge) drawBadge(ctx, W, H, grade, state.stars || 0);

  if (state.vignette) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  if (state.grain) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = grainPattern(ctx);
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
}

// Render a cover to a fresh canvas at export resolution and return it.
export function renderCover(state, photos, w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas.getContext('2d'), w, h, state, photos);
  return canvas;
}
