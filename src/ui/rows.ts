/** Most cards a row of the start screen holds. */
export const MAX_PER_ROW = 5;

/** Sizes of the rows for `n` cards: one row up to the limit, else balanced rows (larger first), never a lone card at the end. */
export function rowSplit(n: number, perRow = MAX_PER_ROW): number[] {
  if (n <= 0) return [];
  const rows = Math.ceil(n / perRow);
  const base = Math.floor(n / rows);
  const extra = n % rows;
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0));
}
