/**
 * How the hands' lines look (the outline's bold lines and its thin ones): their colour and transparency (per cent)
 * while typing and when the hands lie beside the keyboard (`rest` and the steps from it). The lines' widths are in
 * the hands' files. The hand tool (tools/hand-poser) rewrites this file when it saves; the dark theme keeps its own
 * light line colour.
 */
export interface LineStyle { color: string; transparency: number }
export const HAND_STYLE: { typing: { lines: LineStyle; creases: LineStyle }; off: { lines: LineStyle; creases: LineStyle } } = {
  typing: { lines: { color: '#5a5560', transparency: 0 }, creases: { color: '#5a5560', transparency: 40 } },
  off: { lines: { color: '#5a5560', transparency: 0 }, creases: { color: '#5a5560', transparency: 40 } },
};
