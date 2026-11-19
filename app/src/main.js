// Neon Palms Cover Studio — editor wiring.
// Owns the state, the controls, photo uploads, panel editing, undo/redo and PNG export.
// The cover itself is drawn by ./cover.js; fixed screenshot scenes live in ./shots.js.
import {
  drawCover, renderCover, layoutGeometry,
  LAYOUT_IDS, LAYOUT_NAMES, GRADE_IDS, GRADE_NAMES, SIZES, GRADES,
} from './cover.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const pctx = preview.getContext('2d');
const statusEl = $('status');

// Photos the app can draw: index 0 and 1 are the bundled samples, 2..4 are user uploads.
const SAMPLES = [
  { key: 'boulevard', label: 'Boulevard' },
  { key: 'pier', label: 'Pier' },
];
const photos = []; // { label, img } — img is an HTMLImageElement once loaded
const photoImages = []; // parallel array of images (or null) for the renderer

function defaultPanels() {
  return Array.from({ length: 9 }, (_, i) => ({ photo: i % 2, zoom: 1, ox: 0, oy: 0, flip: false }));
}

function defaultState() {
  return {
    layout: 'hero3',
    grade: 'sunset',
    size: '1080x1080',
    title: 'NEON SHORE',
    subtitle: 'A VICE CITY STORY',
    grain: true,
    vignette: true,
    badge: true,
    stars: 5,
    panels: defaultPanels(),
  };
}

let state = defaultState();
let selectedPanel = 0;
let history = [];
let future = [];

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('could not load ' + url));
    img.src = url;
  });
}

async function ensureSample(index) {
  if (photoImages[index]) return photoImages[index];
  const img = await loadImage(`samples/${SAMPLES[index].key}.jpg`);
  photos[index] = { label: SAMPLES[index].label, img };
  photoImages[index] = img;
  return img;
}

function sizeOf() {
  return SIZES.find((s) => s.id === state.size) || SIZES[0];
}

function snapshot() {
  return JSON.stringify(state);
}

function pushHistory() {
  history.push(snapshot());
  if (history.length > 60) history.shift();
  future = [];
  refreshUndoButtons();
}

function restore(json) {
  state = JSON.parse(json);
  syncControls();
  redraw();
}

function undo() {
  if (!history.length) return;
  future.push(snapshot());
  restore(history.pop());
  refreshUndoButtons();
}

function redo() {
  if (!future.length) return;
  history.push(snapshot());
  restore(future.pop());
  refreshUndoButtons();
}

function refreshUndoButtons() {
  $('undo').disabled = history.length === 0;
  $('redo').disabled = future.length === 0;
}

function redraw() {
  const size = sizeOf();
  if (preview.width !== size.w || preview.height !== size.h) {
    preview.width = size.w;
    preview.height = size.h;
  }
  drawCover(pctx, size.w, size.h, state, photoImages);
  // The selection outline is an editor aid: never draw it over a cover shot,
  // where the screenshot must show only the exported art.
  if (!document.body.classList.contains('shot-cover')) drawSelection();
  updatePanelBar();
}

function drawSelection() {
  const size = sizeOf();
  const geo = layoutGeometry(state.layout, size.w, size.h);
  const rect = geo.panels[selectedPanel];
  if (!rect || geo.titleCell === selectedPanel) return;
  pctx.save();
  pctx.strokeStyle = '#2de2ff';
  pctx.lineWidth = Math.max(3, size.w * 0.004);
  pctx.setLineDash([Math.round(size.w * 0.012), Math.round(size.w * 0.008)]);
  pctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  pctx.setLineDash([]);
  pctx.fillStyle = '#2de2ff';
  pctx.font = `700 ${Math.round(size.w * 0.016)}px "Noto Sans", sans-serif`;
  pctx.textAlign = 'left';
  pctx.textBaseline = 'top';
  pctx.fillText(`PANEL ${selectedPanel + 1}`, rect.x + 8, rect.y + 8);
  pctx.restore();
}

function setStatus(text) {
  statusEl.textContent = text;
}

// ---- controls ----

function buildPickers() {
  const layoutBox = $('layouts');
  LAYOUT_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.layout = id;
    b.textContent = LAYOUT_NAMES[id];
    b.addEventListener('click', () => {
      if (state.layout === id) return;
      pushHistory();
      state.layout = id;
      selectedPanel = 0;
      syncControls();
      redraw();
    });
    layoutBox.appendChild(b);
  });
  const gradeBox = $('grades');
  GRADE_IDS.forEach((id) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick grade';
    b.dataset.grade = id;
    b.textContent = GRADE_NAMES[id];
    b.style.setProperty('--swatch', GRADES[id].accent);
    b.addEventListener('click', () => {
      if (state.grade === id) return;
      pushHistory();
      state.grade = id;
      syncControls();
      redraw();
    });
    gradeBox.appendChild(b);
  });
  const sizeBox = $('sizes');
  SIZES.forEach((s) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.size = s.id;
    b.textContent = s.label;
    b.addEventListener('click', () => {
      if (state.size === s.id) return;
      pushHistory();
      state.size = s.id;
      syncControls();
      redraw();
    });
    sizeBox.appendChild(b);
  });
}

function buildPhotoSlots() {
  const box = $('photos');
  for (let slot = 0; slot < 3; slot++) {
    const wrap = document.createElement('label');
    wrap.className = 'slot';
    wrap.innerHTML = `<span>Photo ${slot + 1}</span><input type="file" accept="image/*">`;
    const input = wrap.querySelector('input');
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = await loadImage(URL.createObjectURL(file));
      const index = 2 + slot;
      photos[index] = { label: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || `Upload ${slot + 1}`, img };
      photoImages[index] = img;
      pushHistory();
      state.panels[selectedPanel].photo = index;
      setStatus(`Loaded ${photos[index].label} into panel ${selectedPanel + 1}.`);
      syncControls();
      redraw();
    });
    box.appendChild(wrap);
  }
  SAMPLES.forEach((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.textContent = `Sample: ${s.label}`;
    b.addEventListener('click', async () => {
      await ensureSample(i);
      pushHistory();
      state.panels[selectedPanel].photo = i;
      setStatus(`Panel ${selectedPanel + 1} uses the ${s.label} sample.`);
      syncControls();
      redraw();
    });
    box.appendChild(b);
  });
}

function updatePanelBar() {
  const panel = state.panels[selectedPanel];
  $('panelTitle').textContent = `Panel ${selectedPanel + 1}`;
  $('zoom').value = panel.zoom;
  $('zoomVal').textContent = `${panel.zoom.toFixed(2)}x`;
  $('panX').value = panel.ox;
  $('panY').value = panel.oy;
  $('flip').textContent = panel.flip ? 'Flipped ✓' : 'Flip';
  document.querySelectorAll('#photoChoices button').forEach((b) => {
    b.classList.toggle('active', Number(b.dataset.photo) === panel.photo);
  });
}

function buildPhotoChoices() {
  const box = $('photoChoices');
  const labels = [...SAMPLES.map((s) => s.label), 'Upload 1', 'Upload 2', 'Upload 3'];
  labels.forEach((label, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.photo = i;
    b.textContent = label;
    b.addEventListener('click', async () => {
      if (i < 2) await ensureSample(i);
      if (!photoImages[i]) { setStatus(`${label} is not loaded yet — pick a file for that slot first.`); return; }
      pushHistory();
      state.panels[selectedPanel].photo = i;
      redraw();
    });
    box.appendChild(b);
  });
}

function syncControls() {
  document.querySelectorAll('#layouts .pick').forEach((b) => b.classList.toggle('active', b.dataset.layout === state.layout));
  document.querySelectorAll('#grades .pick').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('#sizes .pick').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  $('title').value = state.title;
  $('subtitle').value = state.subtitle;
  $('grain').checked = state.grain;
  $('vignette').checked = state.vignette;
  $('badge').checked = state.badge;
  $('stars').value = state.stars;
  $('starsVal').textContent = `${state.stars} / 5`;
  updatePanelBar();
}

function bindControls() {
  $('title').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
  $('title').addEventListener('change', () => pushHistory());
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
  $('subtitle').addEventListener('change', () => pushHistory());
  $('grain').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redraw(); });
  $('vignette').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; redraw(); });
  $('badge').addEventListener('change', (e) => { pushHistory(); state.badge = e.target.checked; redraw(); });
  $('stars').addEventListener('input', (e) => { state.stars = Number(e.target.value); $('starsVal').textContent = `${state.stars} / 5`; redraw(); });
  $('stars').addEventListener('change', () => pushHistory());
  $('zoom').addEventListener('input', (e) => {
    state.panels[selectedPanel].zoom = Number(e.target.value);
    $('zoomVal').textContent = `${state.panels[selectedPanel].zoom.toFixed(2)}x`;
    redraw();
  });
  $('zoom').addEventListener('change', () => pushHistory());
  $('panX').addEventListener('input', (e) => { state.panels[selectedPanel].ox = Number(e.target.value); redraw(); });
  $('panX').addEventListener('change', () => pushHistory());
  $('panY').addEventListener('input', (e) => { state.panels[selectedPanel].oy = Number(e.target.value); redraw(); });
  $('panY').addEventListener('change', () => pushHistory());
  $('flip').addEventListener('click', () => { pushHistory(); state.panels[selectedPanel].flip = !state.panels[selectedPanel].flip; redraw(); });
  $('fillAll').addEventListener('click', () => {
    pushHistory();
    const photo = state.panels[selectedPanel].photo;
    state.panels.forEach((p) => { p.photo = photo; });
    redraw();
  });
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  $('exportOne').addEventListener('click', () => exportSize(state.size));
  $('exportAll').addEventListener('click', exportAllSizes);
}

// Click a panel to select it; drag to pan its photo; wheel to zoom it.
function bindPreview() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const toCover = (e) => {
    const r = preview.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * preview.width,
      y: ((e.clientY - r.top) / r.height) * preview.height,
    };
  };
  preview.addEventListener('pointerdown', (e) => {
    const { x, y } = toCover(e);
    const geo = layoutGeometry(state.layout, preview.width, preview.height);
    const hit = geo.panels.findIndex((rect, i) => geo.titleCell !== i && x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h);
    if (hit >= 0) {
      selectedPanel = hit;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      preview.setPointerCapture(e.pointerId);
      redraw();
    }
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const panel = state.panels[selectedPanel];
    const r = preview.getBoundingClientRect();
    panel.ox += ((e.clientX - lastX) / r.width) * 1.4;
    panel.oy += ((e.clientY - lastY) / r.height) * 1.4;
    panel.ox = Math.max(-1, Math.min(1, panel.ox));
    panel.oy = Math.max(-1, Math.min(1, panel.oy));
    lastX = e.clientX;
    lastY = e.clientY;
    redraw();
  });
  preview.addEventListener('pointerup', () => { if (dragging) { dragging = false; pushHistory(); } });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const panel = state.panels[selectedPanel];
    panel.zoom = Math.max(1, Math.min(3, panel.zoom * (e.deltaY < 0 ? 1.08 : 0.92)));
    redraw();
  }, { passive: false });
}

// ---- export ----

function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(filename);
    }, 'image/png');
  });
}

export function exportPNG(sizeId) {
  const size = SIZES.find((s) => s.id === sizeId) || sizeOf();
  const canvas = renderCover(state, photoImages, size.w, size.h);
  return downloadCanvas(canvas, `neon-palms-${size.id}.png`);
}

async function exportSize(sizeId) {
  const name = await exportPNG(sizeId);
  setStatus(`Saved ${name}.`);
}

async function exportAllSizes() {
  for (const s of SIZES) await exportPNG(s.id);
  setStatus(`Saved all 3 sizes (1080x1080, 1080x1350, 1920x1080).`);
}

// Driver hooks for screenshots and tests.
window.__coverApp = {
  get state() { return state; },
  set state(next) { state = next; syncControls(); redraw(); },
  get photos() { return photoImages; },
  loadSample: ensureSample,
  loadImage,
  exportPNG,
  redraw,
};

// ---- boot ----

buildPickers();
buildPhotoSlots();
buildPhotoChoices();
bindControls();
bindPreview();
syncControls();
refreshUndoButtons();

const query = new URLSearchParams(location.search);
if (query.get('shot')) {
  runShot(query, {
    loadSample: ensureSample,
    setState(next) { state = { ...state, ...next }; syncControls(); redraw(); },
    redraw,
  });
} else {
  ensureSample(0).then(() => ensureSample(1)).then(redraw).catch(() => redraw());
  redraw();
}
