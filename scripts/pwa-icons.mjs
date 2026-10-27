/**
 * Renders the app icons in public/icons/ from the logo mark in src/components/logo.tsx.
 * Run after changing the mark: `node scripts/pwa-icons.mjs`.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg, initWasm } from '@resvg/resvg-wasm';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
await initWasm(readFileSync(require.resolve('@resvg/resvg-wasm/index_bg.wasm')));

const logo = readFileSync(resolve(ROOT, 'src/components/logo.tsx'), 'utf8');
const mark = /const MARK_PATH =\s*'([^']+)'/.exec(logo)?.[1];
if (!mark) throw new Error('MARK_PATH not found in logo.tsx');

const BRAND = '#4e1cb3';

/** The mark (viewBox 10 1 201 201) centered on a square, at `scale` of its width. */
function svg({ size, scale, background }) {
  const inner = size * scale;
  const offset = (size - inner) / 2;
  const k = inner / 201;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : ''}
<g transform="translate(${offset} ${offset}) scale(${k}) translate(-10 -1)">
<circle cx="110.3" cy="101.5" r="86" fill="#ffffff"/>
<path d="${mark}" fill="${BRAND}"/>
</g></svg>`;
}

const ICONS = [
  // Transparent, full-bleed circle: browsers and desktop docks.
  { file: 'icon-192.png', size: 192, scale: 1 },
  { file: 'icon-512.png', size: 512, scale: 1 },
  // Maskable: the platform crops to its own shape; keep the mark inside the 80% safe zone.
  { file: 'maskable-512.png', size: 512, scale: 0.62, background: '#ffffff' },
  // iOS home screen: opaque, iOS rounds the corners.
  { file: 'apple-touch-icon.png', size: 180, scale: 0.78, background: '#ffffff' },
];

mkdirSync(resolve(ROOT, 'public/icons'), { recursive: true });
for (const icon of ICONS) {
  const png = new Resvg(svg(icon)).render().asPng();
  writeFileSync(resolve(ROOT, 'public/icons', icon.file), png);
  console.log(`public/icons/${icon.file}`);
}
