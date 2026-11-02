import { type Side, VIEW } from '../../src/ui/hand-svg';

export { VIEW };

/** A joint's turns in degrees, on its own axes: bend (towards the palm), spread (sideways), twist (around the bone). */
export interface JointTurn {
  bend?: number;
  spread?: number;
  twist?: number;
}

/** Where the hand lies and how it turns, and the joints' turns: everything the poser needs to load a pose again. */
export interface PoseFile {
  v: 1;
  side: Side;
  name: string;
  /** The wrist in keyboard units, the hand's turns in degrees around the wrist, its size (keyboard units per metre). */
  hand: { x: number; y: number; yaw: number; pitch: number; roll: number; scale: number };
  joints: Record<string, JointTurn>;
  /** The outline's thickness in keyboard units. */
  line: number;
}

const POSE = /<metadata id="hand-pose">([\s\S]*?)<\/metadata>/;

/** The SVG Tapko draws (src/ui/hand-svg.ts reads it), with the pose kept in its metadata for the poser. */
export function poseSvg(pose: PoseFile, lines: string, nails: { f: number; d: string }[]): string {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}" data-side="${pose.side}">`,
    `<metadata id="hand-pose">${JSON.stringify(pose)}</metadata>`,
    ...nails.map((n) => `<path class="hand-nail" data-finger="${n.f}" d="${n.d}" fill="#999" fill-opacity="0.4"/>`),
    `<path class="hand-lines" d="${lines}" fill="#5a5560" fill-rule="evenodd"/>`,
    '</svg>',
    '',
  ].join('\n');
}

export function readPose(svg: string): PoseFile | null {
  const m = POSE.exec(svg);
  return m ? (JSON.parse(m[1]) as PoseFile) : null;
}
