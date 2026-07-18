/* ============================================================
   Optimizador de imágenes — Zen Skin Studio
   Recorre la carpeta assets/ y procesa cada imagen:

     · Fotos de servicios  -> recorte inteligente a 4:3 (1200x900)
                              + versión .webp (más ligera)
     · Logo (nombre con "logo") -> solo se optimiza, sin recortar
                              + versión .webp

   Uso:   node optimizar-imagenes.mjs
   Antes: npm install sharp   (una sola vez)
   ============================================================ */

import { readdir, stat, rename } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// sharp puede estar instalado en el proyecto o en otra carpeta (SHARP_PATH)
const require = createRequire(import.meta.url);
let sharp;
try {
  sharp = require(process.env.SHARP_PATH || 'sharp');
} catch {
  console.error('\nFalta la librería "sharp". Instálala una sola vez con:\n\n   npm install sharp\n\ny vuelve a ejecutar:  node optimizar-imagenes.mjs\n');
  process.exit(1);
}

const ASSETS = fileURLToPath(new URL('./assets/', import.meta.url));
const CARD_W = 1200, CARD_H = 900;   // fotos de servicios: 4:3 uniforme
const MAX_LOGO = 600;                // el logo no necesita ser tan grande
const JPEG_QUALITY = 82;
const WEBP_QUALITY = 80;

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

    // pipeline base según sea logo o foto de servicio
    const build = () => {
      let p = sharp(path);
      if (isLogo) {
        p = p.resize({ width: MAX_LOGO, withoutEnlargement: true });
      } else {
        // recorte inteligente a 4:3 (conserva la zona con más interés)
        p = p.resize(CARD_W, CARD_H, { fit: 'cover', position: sharp.strategy.attention });
      }
      return p;
    };

    // 1) versión optimizada, mismo formato y nombre (vía archivo temporal)
    const tmp = join(ASSETS, `__tmp_${file}`);
    let pipeline = build();
    if (ext === '.png') pipeline = pipeline.png({ compressionLevel: 9, palette: true });
    else pipeline = pipeline.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });
    await pipeline.toFile(tmp);
    await rename(tmp, path);

    // 2) versión WebP adicional
    await build().webp({ quality: WEBP_QUALITY }).toFile(join(ASSETS, `${name}.webp`));

    const after = (await stat(path)).size;
    totalAfter += after;
    const pct = (100 - (after / before) * 100).toFixed(0);
    const tag = isLogo ? 'logo' : `${CARD_W}x${CARD_H}`;
    console.log(`${file.padEnd(24)} ${kb(before).padStart(9)} -> ${kb(after).padStart(8)}  (-${pct}%)  [${tag}] + ${name}.webp`);
  }

  console.log('-'.repeat(66));
  console.log(`TOTAL  ${kb(totalBefore)} -> ${kb(totalAfter)}  (-${(100 - (totalAfter / totalBefore) * 100).toFixed(0)}%)`);
}

main().catch(err => { console.error(err); process.exit(1); });
