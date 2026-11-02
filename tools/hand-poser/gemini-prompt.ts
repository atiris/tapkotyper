import type { Side } from '../../src/ui/hand-svg';
import type { PoseFile } from './pose-file';

/**
 * The prompt that goes with a pair's picture to Gemini (assets-src/PROMPTS.md section 12 tells the way): the approved line
 * style, the freedom to make the hands natural, and how much each finger of this pair is bent, read from the pose, so
 * the bend shows in Gemini's outline.
 */

const FINGERS = ['index', 'middle', 'ring', 'little'] as const;
const JOINT = { index: 'index', middle: 'middle', ring: 'ring', little: 'pinky' } as const;

/** A finger's bend in degrees: its joints' bends together (the knuckle, the middle and the last joint). */
const bendOf = (p: PoseFile, f: (typeof FINGERS)[number]) =>
  ['phalanx-proximal', 'phalanx-intermediate', 'phalanx-distal'].reduce((sum, j) => sum + (p.joints[`${JOINT[f]}-finger-${j}`]?.bend ?? 0), 0);

/** How a bend reads from above (the prompt explains each). */
function bendWord(deg: number): string {
  if (deg < 32) return 'nearly straight';
  if (deg < 52) return 'slightly bent';
  if (deg < 78) return 'bent';
  return 'strongly curled';
}

/** A hand's line of the prompt; `press`: the finger and the key's sign when the hand types a key. */
function handLine(side: Side, p: PoseFile, press: { finger: string; key: string } | null): string {
  const fingers = FINGERS.map((f) => `${f} finger ${bendWord(bendOf(p, f))}`).join(', ');
  const typing = press ? `; its ${press.finger} presses the key ${press.key}` : '';
  return `- ${side === 'left' ? 'Left' : 'Right'} hand: ${fingers}${typing}.`;
}

export function geminiPrompt(poses: Record<Side, PoseFile>, presses: Record<Side, { finger: string; key: string } | null>): string {
  return `Generate an image: Hands on the keyboard, redrawn in a line style

The first attached image is a flat keyboard seen exactly from above with two adult hands on it, drawn as rough outlines of a 3D model; it gives the hands' position. Redraw the two hands as natural, real adult hands in exactly the drawing style of the second attached image: one clean, thin, uniform outline in warm grey-brown (#8a7b72), nothing filled inside, so every key shows through; each fingernail as a thin rounded outline; short thin curved lines for the skin folds over the finger joints and over the knuckles; each thumb's outer side one straight line from the wrist to its tip, its pad turned slightly in towards the fingers. Take ONLY the line style from the second image, not its keyboard and not its hand positions.

Keep from the first image: the key each fingertip touches, the hands' size, their slant and the wrists. You may reshape the fingers' outlines freely so the hands look natural and real.

How the fingers are bent (the bend must show in the outline):
${handLine('left', poses.left, presses.left)}
${handLine('right', poses.right, presses.right)}

How a bend shows from above: a nearly straight finger looks long, its sides almost parallel, its whole nail seen as a long rounded outline. A slightly bent finger looks a little shorter, its nail a little shorter. A bent finger looks clearly shorter: its middle joint shows as a rounded bump in the outline, the finger narrows and rounds off towards its tip, which points down onto the key, only a short wide slice of the nail is seen at the very tip, and the fold lines over its middle joint are clearer. A strongly curled finger shows mainly its first part and the round middle joint, the tip tucked under, hardly any nail. So the bent middle and ring fingers reach no further than the straighter index and little fingers: they are bent, not short; the fingertips lie in a gentle arc.

Keep everything else of the first image exactly as it is: the very light grey keyboard (same keys, same size, same place), the white background, and the two small solid magenta squares in the top left and bottom right corners (same place, same size, same colour). No shading, no fill, no skin colour, no shadows, no text added.

Output exactly 1376 x 768 pixels, the same framing as the first image.
`;
}
