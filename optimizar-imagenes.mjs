/* ============================================================
   Optimizador de imágenes — Zen Skin Studio
   Recorre la carpeta assets/ y comprime cada imagen:
     · JPEG/PNG -> versión optimizada (mismo nombre)
     · además genera una versión .webp (más ligera)
   Redimensiona a un ancho máximo razonable para web.

   Uso:  node optimizar-imagenes.mjs
   Requiere: sharp  (se resuelve desde la carpeta indicada en SHARP_PATH)
   ============================================================ */

import { readdir, stat, rename } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// sharp puede estar instalado en otra carpeta (temporal); permitir override
const require = createRequire(import.meta.url);
const sharpPath = process.env.SHARP_PATH || 'sharp';
let sharp;
try {
  sharp = require(sharpPath);
} catch {
  console.error('\nFalta la librería "sharp". Instálala con:\n\n   npm install sharp\n\ny vuelve a ejecutar:  node optimizar-imagenes.mjs\n');
  process.exit(1);
}

const ASSETS = fileURLToPath(new URL('./assets/', import.meta.url));
const MAX_WIDTH = 1400;   // ancho máximo para fotos
const MAX_LOGO = 600;     // los logos no necesitan ser tan grandes
const JPEG_QUALITY = 80;
const WEBP_QUALITY = 78;

const kb = n => (n / 1024).toFixed(0) + ' KB';

async function main() {
  const files = (await readdir(ASSETS)).filter(f => /\.(jpe?g|png)$/i.test(f));
  if (!files.length) { console.log('No hay imágenes en assets/'); return; }

  let totalBefore = 0, totalAfter = 0;

  for (const file of files) {
    const path = join(ASSETS, file);
    const before = (await stat(path)).size;
    totalBefore += before;

    const ext = extname(file).toLowerCase();
    const name = basename(file, ext);
    const isLogo = /logo/i.test(file);
    const maxW = isLogo ? MAX_LOGO : MAX_WIDTH;

    const img = sharp(path);
    const meta = await img.metadata();
    const resize = meta.width > maxW ? { width: maxW } : {};

    // 1) versión optimizada, mismo formato y nombre (vía archivo temporal)
    const tmp = join(ASSETS, `__tmp_${file}`);
    let pipeline = sharp(path).resize({ ...resize, withoutEnlargement: true });
    if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9, palette: true });
    else pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    await pipeline.toFile(tmp);
    await rename(tmp, path);

    // 2) versión WebP adicional
    await sharp(path)
      .resize({ ...resize, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(join(ASSETS, `${name}.webp`));

    const after = (await stat(path)).size;
    totalAfter += after;
    const pct = (100 - (after / before) * 100).toFixed(0);
    console.log(`${file.padEnd(32)} ${kb(before).padStart(8)} -> ${kb(after).padStart(8)}  (-${pct}%)  + ${name}.webp`);
  }

  console.log('-'.repeat(60));
  console.log(`TOTAL  ${kb(totalBefore)} -> ${kb(totalAfter)}  (-${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}%)`);
}

main().catch(err => { console.error(err); process.exit(1); });
