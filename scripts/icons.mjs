// Renders the PWA icons from the fox art (or the vector icon when the art is missing).
import { existsSync } from 'node:fs';
import sharp from 'sharp';

const ART = 'public/assets/tapko-fox-happy.webp';
const BG = { r: 255, g: 241, b: 227, alpha: 1 };

async function icon(size, pad, out) {
  const inner = Math.round(size * (1 - pad * 2));
  // The fox head fills the upper half of the square template (crop given for 512 px art).
  const k = existsSync(ART) ? (await sharp(ART).metadata()).width / 512 : 0;
  const src = k
    ? await sharp(ART).extract({ left: Math.round(81 * k), top: Math.round(18 * k), width: Math.round(350 * k), height: Math.round(350 * k) }).resize(inner, inner).toBuffer()
    : await sharp('public/icons/tapko.svg').resize(inner, inner).toBuffer();
  const off = Math.round((size - inner) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: src, left: off, top: off }]).png().toFile(out);
}

await icon(192, 0.04, 'public/icons/tapko-192.png');
await icon(512, 0.04, 'public/icons/tapko-512.png');
await icon(512, 0.14, 'public/icons/tapko-maskable-512.png');
