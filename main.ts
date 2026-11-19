// Neon Palms Cover Studio — the program that hands the app in.
// Runs on Node 22 with the standard library only: it copies this repository's
// app/ and screenshots/ into /output and writes /output/dossier.json with the
// kit's vendored buildDossier, so the sealed scorer can check the files and
// the judge can read the dossier. The app itself is plain static files under
// app/ — index.html plus its modules — that run offline in a desktop browser.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The scorer's own caps (reference/gate.json): the text cap shapes the
// dossier's bytes; the rest refuse an entry the scorer would refuse.
const DOSSIER_TEXT_CAP = 163840; // 160 KiB of source text in the dossier
const SHOT_LIMIT = 4;
const SHOT_MAX_BYTES = 262144; // 256 KiB per screenshot
const APP_MAX_FILES = 993;
const APP_MAX_BYTES = 50331648; // 48 MiB of app files in all
const APP_PATH_MAX_BYTES = 1000;

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyTree(name: string): void {
  const from = join(repoRoot, name);
  if (!existsSync(from)) return;
  const to = join(outputDir, name);
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
copyTree('app');
copyTree('screenshots');

writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: DOSSIER_TEXT_CAP,
    screenshots: { max: SHOT_LIMIT, max_bytes: SHOT_MAX_BYTES },
    app_max_files: APP_MAX_FILES,
    app_max_bytes: APP_MAX_BYTES,
    app_path_max_bytes: APP_PATH_MAX_BYTES,
  }),
);
