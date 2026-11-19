// Fixed scenes for screenshots.
// ?shot=cover shows the cover alone at the requested size, layout and grade.
// ?shot=editor shows the editor with a sample photo loaded.
// `photo` picks the sample (boulevard or pier), `title` / `subtitle` the words,
// `layout`, `grade` and `size` pick the look. window.__shotReady is set once painted.
//
// Every panel gets its own crop (zoom + pan) of its photo: the same two sample
// photos read as different moments in each panel, the way a poster's collage
// does, instead of the same framing repeated four or nine times. These crops
// are ordinary panel state — the editor's zoom and pan sliders set the same
// values — fixed here so each screenshot is deterministic.
function panelCrops(layout, main, other) {
  // { photo, zoom, ox, oy } per panel index. zoom > 1 frames tighter;
  // positive oy shows the top of the photo (faces), negative oy the bottom.
  const crops = {
    hero3: [
      { photo: main, zoom: 1.05, ox: 0, oy: 0.1 },
      // A scenic sea-and-pier strip, not a chin close-up: a wide short panel
      // cannot hold a face, so it shows the water and the pier instead.
      { photo: other, zoom: 1.2, ox: 0.5, oy: -0.1 },
      { photo: main, zoom: 1.7, ox: -0.2, oy: 0.5 },
      { photo: other, zoom: 1.3, ox: -0.3, oy: -0.2 },
    ],
    grid4: [
      { photo: other, zoom: 1.4, ox: 0, oy: 0.4 },
      { photo: main, zoom: 1.1, ox: 0, oy: 0 },
      { photo: main, zoom: 1.8, ox: 0.15, oy: 0.55 },
      { photo: other, zoom: 1.25, ox: 0.35, oy: -0.1 },
    ],
    strip: [
      { photo: main, zoom: 1.05, ox: 0, oy: 0.1 },
      { photo: other, zoom: 1.5, ox: 0, oy: 0.45 },
      { photo: main, zoom: 1.6, ox: -0.15, oy: 0.5 },
      { photo: other, zoom: 1.3, ox: 0.3, oy: -0.15 },
    ],
    nine: [
      { photo: other, zoom: 1.3, ox: -0.1, oy: 0.4 },
      { photo: main, zoom: 1.2, ox: 0, oy: 0.1 },
      { photo: other, zoom: 1.6, ox: 0.2, oy: 0.45 },
      { photo: main, zoom: 1.7, ox: 0.2, oy: 0.5 },
      { photo: main, zoom: 1.35, ox: 0, oy: 0.3 },
      { photo: other, zoom: 1.2, ox: -0.35, oy: -0.15 },
      { photo: other, zoom: 1.5, ox: 0.3, oy: 0.35 },
      { photo: main, zoom: 1.25, ox: -0.25, oy: -0.2 },
      { photo: other, zoom: 1.4, ox: 0, oy: 0.1 },
    ],
    tilt: [
      // Full-bleed background: the square pier photo, uncropped, so the
      // backdrop is a scene, not one giant face.
      { photo: other, zoom: 1.0, ox: 0, oy: 0 },
      { photo: main, zoom: 1.4, ox: 0, oy: 0.4 },
      { photo: other, zoom: 1.5, ox: -0.1, oy: 0.45 },
      { photo: main, zoom: 1.3, ox: -0.2, oy: 0.1 },
    ],
    triptych: [
      { photo: main, zoom: 1.2, ox: 0, oy: 0.15 },
      { photo: other, zoom: 1.5, ox: 0.1, oy: 0.45 },
      { photo: main, zoom: 1.7, ox: -0.15, oy: 0.5 },
    ],
  };
  return crops[layout] || crops.hero3;
}

export async function runShot(query, api) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'boulevard';
  const photoIndex = photo === 'pier' ? 1 : 0;
  await api.loadSample(photoIndex);
  const layout = query.get('layout') ?? 'hero3';
  const next = {
    title: query.get('title') ?? 'NEON SHORE',
    subtitle: query.get('subtitle') ?? 'A VICE CITY STORY',
    layout,
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? '1080x1080',
    grain: true,
    vignette: true,
    badge: true,
    stars: 5,
  };
  api.setState(next);
  // Fill every panel from the crop table: same photos, different framings.
  const other = photoIndex === 0 ? 1 : 0;
  await api.loadSample(other);
  const table = panelCrops(layout, photoIndex, other);
  const panels = Array.from({ length: 9 }, (_, i) => {
    const c = table[i] || { photo: photoIndex, zoom: 1, ox: 0, oy: 0 };
    return { photo: c.photo, zoom: c.zoom, ox: c.ox, oy: c.oy, flip: false };
  });
  api.setState({ panels });
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
