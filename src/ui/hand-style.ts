/**
 * How the hands look: their lines' colour and transparency (the outline's bold lines and its thin ones, per cent) and
 * the filled nails' transparency, while typing and when the hands lie beside the keyboard (`rest` and the steps from
 * it). The lines' widths are in the hands' files. The hand tool (tools/hand-poser) rewrites this file when it saves;
 * the dark theme keeps its own light line colour.
 */
export interface LineStyle { color: string; transparency: number }
export interface HandKindStyle { lines: LineStyle; creases: LineStyle; nails: { transparency: number } }
export const HAND_STYLE: { typing: HandKindStyle; off: HandKindStyle } = {
  typing: { lines: { color: '#5a5560', transparency: 0 }, creases: { color: '#5a5560', transparency: 40 }, nails: { transparency: 0 } },
  off: { lines: { color: '#5a5560', transparency: 0 }, creases: { color: '#5a5560', transparency: 40 }, nails: { transparency: 0 } },
};
