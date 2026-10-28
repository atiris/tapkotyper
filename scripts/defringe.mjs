// A layer on magenta loses its violet fringe: pixels tinted toward the key (red and blue above
// green) that touch the key become the key, pass after pass, so the key takes them. Things inside
// the picture keep their colors, only the rim next to the key is eaten.
// Usage: node scripts/defringe.mjs <in> <out> [passes=3]
import sharp from 'sharp';

const [inFile, out, passArg] = process.argv.slice(2);
const passes = Number(passArg ?? 3);
const { data, info } = await sharp(inFile).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
const key = (p) => data[p * 3] > 240 && data[p * 3 + 1] < 20 && data[p * 3 + 2] > 240;
const tinted = (p) => {
  const r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2];
  return Math.min(r, b) - g > 25 && r > 80 && b > 80;
};
let n = 0;
for (let k = 0; k < passes; k++) {
  const take = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x;
    if (key(p) || !tinted(p)) continue;
    const near = (x > 0 && key(p - 1)) || (x < w - 1 && key(p + 1)) || (y > 0 && key(p - w)) || (y < h - 1 && key(p + w));
    if (near) take.push(p);
  }
  for (const p of take) data.set([255, 0, 255], p * 3);
  n += take.length;
}
await sharp(data, { raw: { width: w, height: h, channels: 3 } }).png().toFile(out);
console.log(`${n} fringe pixels made key`);
