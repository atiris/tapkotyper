// Renders the favicon (favicon.ico and PNGs in multiples of 48 px, which search results want) and the PWA icons from
// the game's one picture, the fox head (ui-icon).
import { writeFileSync } from 'node:fs';
import sharp from 'sharp';

const ART = 'public/assets/ui-icon.webp';
const BG = { r: 255, g: 241, b: 227, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

async function icon(size, pad, background, out) {
  const inner = Math.round(size * (1 - pad * 2));
  const art = await sharp(ART).resize(inner, inner, { fit: 'contain', background: CLEAR }).toBuffer();
  const off = Math.round((size - inner) / 2);
  const png = await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: art, left: off, top: off }]).png().toBuffer();
  if (out) writeFileSync(out, png);
  return png;
}

/** An .ico file holding PNG pictures (every browser and search engine reads them). */
function ico(pngs, sizes) {
  const head = Buffer.alloc(6 + 16 * sizes.length);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(sizes.length, 4);
  let offset = head.length;
  sizes.forEach((size, i) => {
    const at = 6 + 16 * i;
    head.writeUInt8(size, at);
    head.writeUInt8(size, at + 1);
    head.writeUInt16LE(1, at + 4);
    head.writeUInt16LE(32, at + 6);
    head.writeUInt32LE(pngs[i].length, at + 8);
    head.writeUInt32LE(offset, at + 12);
    offset += pngs[i].length;
  });
  return Buffer.concat([head, ...pngs]);
}

const ICO = [16, 32, 48];
writeFileSync('public/favicon.ico', ico(await Promise.all(ICO.map((size) => icon(size, 0, CLEAR))), ICO));
await icon(48, 0, CLEAR, 'public/icons/tapko-48.png');
await icon(96, 0, CLEAR, 'public/icons/tapko-96.png');
await icon(180, 0.1, BG, 'public/icons/tapko-180.png');
await icon(192, 0.04, CLEAR, 'public/icons/tapko-192.png');
await icon(512, 0.04, CLEAR, 'public/icons/tapko-512.png');
await icon(512, 0.16, BG, 'public/icons/tapko-maskable-512.png');
