import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { POSE_NAME } from '../../src/ui/hand-svg';
import { type PoseFile, VIEW, poseSvg } from './pose-file';

/**
 * The hand poser's save and delete, on the dev server only (the poser is a local tool, never part of the built site).
 * A save gets the poser's renders (the lines and each nail as black on white PNGs, `px` pixels per keyboard unit over VIEW),
 * traces them into paths in keyboard units and writes `public/hands/<side>/<name>.svg` with the pose inside, then the list
 * `public/hands/index.json` that Tapko reads.
 */

const DIR = 'public/hands';

interface SaveBody {
  pose: PoseFile;
  px: number;
  lines: string;
  nails: { f: number; png: string }[];
}

const pngOf = (dataUrl: string) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');

/** Traced shapes of a black on white picture, in keyboard units. */
async function trace(png: Buffer, px: number): Promise<string> {
  const { default: potrace } = await import('potrace');
  const svg = await new Promise<string>((ok, fail) =>
    potrace.trace(png, { turdSize: 12, alphaMax: 1.3, optTolerance: 0.4, threshold: 128 }, (err, out) => (err ? fail(err) : ok(out))));
  const d = /\sd="([^"]*)"/.exec(svg)?.[1] ?? '';
  // potrace writes absolute commands with x y pairs only: every other number is an x.
  let i = 0;
  return d.replace(/-?\d+(\.\d+)?/g, (n) => (Number(n) / px + (i++ % 2 ? VIEW.y : VIEW.x)).toFixed(1)).replace(/\s+/g, ' ').trim();
}

function writeIndex(): void {
  const list = Object.fromEntries(['left', 'right'].map((side) => {
    let names: string[] = [];
    try {
      names = readdirSync(join(DIR, side)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
    } catch { /* no poses of this hand yet */ }
    return [side, names];
  }));
  writeFileSync(join(DIR, 'index.json'), `${JSON.stringify(list, null, 2)}\n`);
}

async function body<T>(req: NodeJS.ReadableStream): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as T;
}

export function handPoser(): Plugin {
  return {
    name: 'tapkotyper-hand-poser',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        if (req.method !== 'POST' || (path !== '/__hand-poser/save' && path !== '/__hand-poser/delete')) return next();
        try {
          const data = await body<SaveBody>(req);
          const { side, name } = data.pose;
          if ((side !== 'left' && side !== 'right') || !POSE_NAME.test(name)) throw new Error(`bad pose name ${side}/${name}`);
          const file = join(DIR, side, `${name}.svg`);
          if (path.endsWith('delete')) rmSync(file, { force: true });
          else {
            const lines = await trace(pngOf(data.lines), data.px);
            const nails = await Promise.all(data.nails.map(async (n) => ({ f: n.f, d: await trace(pngOf(n.png), data.px) })));
            mkdirSync(join(DIR, side), { recursive: true });
            writeFileSync(file, poseSvg(data.pose, lines, nails.filter((n) => n.d)));
          }
          writeIndex();
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, file: file.replaceAll('\\', '/'), index: JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) }));
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: String(e) }));
        }
      });
    },
  };
}
