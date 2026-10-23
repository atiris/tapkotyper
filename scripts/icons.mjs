// Renders the favicon and the PWA icons from the game's one picture, the fox head (ui-icon).
import sharp from 'sharp';

const ART = 'public/assets/ui-icon.webp';
const BG = { r: 255, g: 241, b: 227, alpha: 1 };
const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

async function icon(size, pad, background, out) {
  const inner = Math.round(size * (1 - pad * 2));
  const art = await sharp(ART).resize(inner, inner, { fit: 'contain', background: CLEAR }).toBuffer();
  const off = Math.round((size - inner) / 2);
  await sharp({ create: { width: size, height: size, channels: 4, background } })
    .composite([{ input: art, left: off, top: off }]).png().toFile(out);
}

await icon(48, 0, CLEAR, 'public/icons/tapko-48.png');
await icon(180, 0.1, BG, 'public/icons/tapko-180.png');
await icon(192, 0.04, CLEAR, 'public/icons/tapko-192.png');
await icon(512, 0.04, CLEAR, 'public/icons/tapko-512.png');
await icon(512, 0.16, BG, 'public/icons/tapko-maskable-512.png');
