import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';
import { type Outline, type OutlineFile, type RowsState, readRows, saveRows, writeFingerColors } from './rows-file';

/**
 * The hand tool's reading and saving (./rows-file.ts), on the dev server only (the tool is a local page at
 * /tools/hand-poser/, never part of the built site), and the palette the owner approves there. A save writes the outlines Tapko draws and then the list
 * `public/hands/index.json` that Tapko reads.
 */

const DIR = 'public/hands';

function writeIndex(): void {
  const list = Object.fromEntries(['left', 'right'].map((side) => {
    let names: string[] = [];
    try {
      names = readdirSync(join(DIR, side)).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)).sort();
    } catch { /* no outlines of this hand yet */ }
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
        const path = (req.url ?? '').split('?')[0];
        if (!path.startsWith('/__hand-poser/')) return next();
        const reply = (data: object) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, ...data }));
        };
        try {
          if (req.method === 'GET' && path === '/__hand-poser/rows') return reply(readRows());
          if (req.method === 'POST' && path === '/__hand-poser/rows-save') {
            const { state, outline, files } = await body<{ state: RowsState; outline: Record<'left' | 'right', Outline>; files: OutlineFile[] }>(req);
            const done = saveRows(state, outline, files);
            writeIndex();
            return reply(done);
          }
          if (req.method === 'POST' && path === '/__hand-poser/finger-colors') {
            writeFingerColors((await body<{ colors: string[] }>(req)).colors);
            return reply({});
          }
          return next();
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ ok: false, error: String(e) }));
        }
      });
    },
  };
}
