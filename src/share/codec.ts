// Links carry their data in the address hash (`#/task/<code>`), so it never reaches a server.
// A code is base64url of one version byte followed by deflate-raw compressed JSON.

/** Format of the bytes after the version byte; a new format gets a new number. */
export const CODEC_VERSION = 1;

/** Turns a value into a link-safe code. */
export async function encode(value: unknown): Promise<string> {
  const packed = await pipe(new TextEncoder().encode(JSON.stringify(value)), new CompressionStream('deflate-raw'));
  const bytes = new Uint8Array(packed.length + 1);
  bytes[0] = CODEC_VERSION;
  bytes.set(packed, 1);
  return toBase64Url(bytes);
}

/** Reads a code back. Throws an Error with the i18n key `share.broken` on any damaged input. */
export async function decode(code: string): Promise<unknown> {
  try {
    const bytes = fromBase64Url(code.trim());
    if (bytes[0] !== CODEC_VERSION) throw new Error('version');
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(await pipe(bytes.subarray(1), new DecompressionStream('deflate-raw'))));
  } catch {
    throw new Error('share.broken');
  }
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as BlobPart]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function toBase64Url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(code: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(code)) throw new Error('alphabet');
  const s = atob(code.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

/** Short checksum of a text (FNV-1a, 32 bit, hex): finds broken copies, not cheating. */
export function checksum(text: string): string {
  let h = 0x811c9dc5;
  for (const b of new TextEncoder().encode(text)) {
    h ^= b;
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** The code of a pasted link or a bare code, for a link kind (`task`, `result`, `move`). */
export function codeFrom(input: string, kind: string): string | null {
  const s = input.trim();
  const m = s.match(new RegExp(`#/${kind}/([A-Za-z0-9_-]+)`));
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{8,}$/.test(s) ? s : null;
}

/** Full link of a code on this app's address. */
export function linkOf(kind: string, code: string): string {
  return `${location.origin}${location.pathname}#/${kind}/${code}`;
}
