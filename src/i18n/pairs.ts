// The pair format of a translation: a plain text file a person or an LLM fills in. Pure, no DOM.

export type ExportMode = 'full' | 'open' | 'changes';

/** One field in the file: comments before it (headings, the situation), its id, the base and the target text. */
export interface PairEntry {
  comments: string[];
  id: string;
  base: string;
  target: string;
}

export interface PairFile {
  /** `@meta` lines: code, name, base, layout, author, contact... */
  meta: Record<string, string>;
  mode: ExportMode;
  /** The code of the language shown as reference (the prefix of the base lines, `@meta reference=`). */
  baseCode: string;
  entries: PairEntry[];
}

const HEADER = [
  '# TapkoTyper translation. Translate every line that starts with "{code}:".',
  '# Keep {placeholders} as they are. "\\n" is a line break. Leave a line empty if unsure.',
  '# Pool items: you may add a variant (next number) or delete one, but keep at least one.',
  '# Lines starting with "#" are context: headings and where the text appears.',
  '# Keep the "@" lines as they are; they say which text is which.',
];

/** A text on one line: `\` doubled, a line break as `\n`. */
export const escapeLine = (s: string): string => s.replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n');
export const unescapeLine = (s: string): string => s.replace(/\\(\\|n)/g, (_, c) => (c === 'n' ? '\n' : '\\'));

export function writePairs(f: PairFile): string {
  const code = f.meta.code ?? '';
  const out = HEADER.map((l) => l.replace('{code}', code));
  for (const [k, v] of Object.entries(f.meta)) out.push(`@meta ${k}=${escapeLine(v)}`);
  out.push(`@meta reference=${f.baseCode}`, `@export ${f.mode}`);
  for (const e of f.entries) {
    out.push('', ...e.comments.map((c) => `# ${escapeLine(c)}`), `@${e.id}`, `${f.baseCode}: ${escapeLine(e.base)}`, `${code}: ${escapeLine(e.target)}`);
  }
  return `${out.join('\n')}\n`;
}

/** Reads a pair file; the target line of an entry is the last one starting with the target code. */
export function readPairs(text: string): PairFile {
  const meta: Record<string, string> = {};
  let mode: ExportMode = 'open';
  const lines = text.replace(/^﻿/, '').split(/\r?\n/);
  for (const line of lines) {
    const m = /^@meta\s+([\w-]+)=(.*)$/.exec(line.trim());
    if (m) meta[m[1]] = unescapeLine(m[2].trim());
    const x = /^@export\s+(\w+)/.exec(line.trim());
    if (x && ['full', 'open', 'changes'].includes(x[1])) mode = x[1] as ExportMode;
  }
  const code = meta.code ?? '';
  const baseCode = meta.reference ?? '';
  const entries: PairEntry[] = [];
  let entry: PairEntry | null = null;
  let comments: string[] = [];
  let lines4entry: string[] = [];
  const close = () => {
    if (!entry) return;
    const value = (prefix: string) => lines4entry.filter((l) => l.startsWith(`${prefix}:`)).map((l) => unescapeLine(l.slice(prefix.length + 1).trim()));
    const targets = value(code);
    const bases = value(baseCode);
    // The same code for both (own texts of the base language): the first line is the base.
    entry.target = code === baseCode ? (targets.length > 1 ? targets.at(-1)! : '') : (targets.at(-1) ?? '');
    entry.base = bases[0] ?? '';
    entries.push(entry);
    entry = null;
    lines4entry = [];
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith('@meta') || line.startsWith('@export')) continue;
    if (line.startsWith('@')) {
      close();
      entry = { comments, id: line.slice(1).trim(), base: '', target: '' };
      comments = [];
    } else if (line.startsWith('#')) {
      if (!entry) comments.push(unescapeLine(line.replace(/^#\s?/, '')));
    } else if (!line.trim()) {
      close();
    } else if (entry) lines4entry.push(line);
  }
  close();
  delete meta.reference;
  return { meta, mode, baseCode, entries };
}
