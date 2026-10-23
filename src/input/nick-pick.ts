/** A name as it is matched: lower case, without accents, so "sima" finds "Šima". */
export function foldName(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * The one name `typed` picks, by its beginning: once exactly one name begins with it, and it is
 * at least two letters long or the whole name; null while none or several fit.
 */
export function matchNick(names: string[], typed: string): number | null {
  const q = foldName(typed);
  if (!q) return null;
  const fits = names.map((n, i) => [foldName(n), i] as const).filter(([n]) => n.startsWith(q));
  if (fits.length !== 1) return null;
  const [name, i] = fits[0];
  return q.length >= 2 || q === name ? i : null;
}
