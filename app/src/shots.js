// Fixed scenes for screenshots.
// ?shot=cover shows the cover alone at the requested size, layout and grade.
// ?shot=editor shows the editor with a sample photo loaded.
// `photo` picks the sample (boulevard or pier), `title` / `subtitle` the words,
// `layout`, `grade` and `size` pick the look. window.__shotReady is set once painted.
export async function runShot(query, api) {
  const shot = query.get('shot');
  if (shot === 'cover') document.body.classList.add('shot-cover');
  const photo = query.get('photo') ?? 'boulevard';
  const photoIndex = photo === 'pier' ? 1 : 0;
  await api.loadSample(photoIndex);
  const next = {
    title: query.get('title') ?? 'NEON SHORE',
    subtitle: query.get('subtitle') ?? 'A VICE CITY STORY',
    layout: query.get('layout') ?? 'hero3',
    grade: query.get('grade') ?? 'sunset',
    size: query.get('size') ?? '1080x1080',
    grain: true,
    vignette: true,
    badge: true,
    stars: 5,
  };
  api.setState(next);
  // Fill every panel with the chosen photo, alternating with the other sample,
  // so the hero panel always shows the requested photo.
  const other = photoIndex === 0 ? 1 : 0;
  await api.loadSample(other);
  const panels = Array.from({ length: 9 }, (_, i) => ({
    photo: i % 2 === 0 ? photoIndex : other, zoom: 1, ox: 0, oy: 0, flip: false,
  }));
  api.setState({ panels });
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
