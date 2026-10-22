import { hasImage, imageUrl, sprite } from './assets';
import type { G } from './draw';

/** Bolt's look along story 2: rusty and broken in the junkyard, repaired after it, new legs after the workshop. */
export type RobotLook = 'broken' | 'robot' | 'robot2';
export type RobotMood = 'idle' | 'happy' | 'worried' | 'wet';

export interface RobotState {
  look: RobotLook;
  /** The yellow raincoat from the rainy town. */
  raincoat: boolean;
}

/** Bolt's look in a level of story 2 world `world` (index into WORLDS, 5-9). */
export function robotFor(world: number): RobotState {
  return { look: world <= 5 ? 'broken' : world === 6 ? 'robot' : 'robot2', raincoat: world >= 8 };
}

/** The image of a look and mood; a missing mood falls back to the look's idle picture. */
export function robotImage(look: RobotLook, mood: RobotMood): string {
  if (look === 'broken') return 'robot-broken';
  const name = `${look}-${mood}`;
  return hasImage(name) || !hasImage(`${look}-idle`) ? name : `${look}-idle`;
}

/**
 * Draws Bolt with his feet at (x, y), `size` high. The pictures are square with the
 * feet near the bottom; without them a simple round robot is drawn.
 */
export function drawRobot(g: G, st: RobotState, mood: RobotMood, x: number, y: number, size: number, t: number, alpha = 1): void {
  const bob = Math.sin(t * 3) * size * 0.012;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(x, y + bob);
  if (mood === 'wet') g.rotate(Math.sin(t * 40) * 0.05);
  const img = sprite(robotImage(st.look, mood));
  if (img) g.drawImage(img, -size / 2, -size * 0.95, size, size);
  else robotFallback(g, st.look, mood, size);
  if (st.raincoat) {
    const coat = sprite('robot-raincoat');
    if (coat) g.drawImage(coat, -size / 2, -size * 0.95, size, size);
    else raincoatFallback(g, size);
  }
  if (mood === 'wet') drops(g, size, t);
  g.restore();
}

const INK = '#4a5a6e';

function robotFallback(g: G, look: RobotLook, mood: RobotMood, s: number): void {
  const metal = look === 'broken' ? '#a9a49a' : '#b9c9dc';
  const leg = look === 'robot2' ? 0.22 : 0.12;
  g.lineWidth = s * 0.02;
  g.strokeStyle = INK;
  g.fillStyle = '#8796a8';
  // Legs (the broken robot has only one).
  for (const dx of look === 'broken' ? [-0.1] : [-0.1, 0.1]) {
    g.beginPath();
    g.roundRect(dx * s - s * 0.04, -leg * s, s * 0.08, leg * s, s * 0.03);
    g.fill();
    g.stroke();
  }
  const top = -leg * s;
  // Body with rivets.
  g.fillStyle = metal;
  g.beginPath();
  g.roundRect(-s * 0.2, top - s * 0.3, s * 0.4, s * 0.3, s * 0.08);
  g.fill();
  g.stroke();
  g.fillStyle = INK;
  for (const dx of [-0.14, 0.14]) {
    g.beginPath();
    g.arc(dx * s, top - s * 0.24, s * 0.012, 0, Math.PI * 2);
    g.fill();
  }
  if (look === 'broken') {
    g.fillStyle = 'rgba(176,98,52,0.55)';
    g.beginPath();
    g.arc(s * 0.08, top - s * 0.1, s * 0.05, 0, Math.PI * 2);
    g.fill();
  }
  // Claws.
  g.strokeStyle = INK;
  for (const side of [-1, 1]) {
    const wave = mood === 'happy' && side === 1;
    g.beginPath();
    g.moveTo(side * s * 0.2, top - s * 0.18);
    g.lineTo(side * s * 0.29, top - s * (wave ? 0.34 : 0.08));
    g.stroke();
  }
  // Head with the dark glass face.
  const hy = top - s * 0.46;
  g.fillStyle = metal;
  g.beginPath();
  g.arc(0, hy, s * 0.17, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#26324a';
  g.beginPath();
  g.ellipse(0, hy + s * 0.01, s * 0.12, s * 0.09, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = g.fillStyle = '#6ff3ff';
  g.lineWidth = s * 0.018;
  for (const dx of [-0.05, 0.05]) {
    g.beginPath();
    if (mood === 'happy' || mood === 'wet') {
      g.arc(dx * s, hy + s * 0.02, s * 0.025, Math.PI * 1.1, Math.PI * 1.9);
      g.stroke();
    } else {
      g.arc(dx * s, hy + (mood === 'worried' ? -s * 0.01 : 0), s * 0.025, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Antenna: bent when broken, a bright yellow ball after the workshop.
  g.strokeStyle = INK;
  g.lineWidth = s * 0.015;
  g.beginPath();
  g.moveTo(0, hy - s * 0.17);
  const tip = look === 'broken' ? [s * 0.07, hy - s * 0.24] : [0, hy - s * 0.27];
  g.lineTo(tip[0], tip[1]);
  g.stroke();
  g.fillStyle = look === 'robot2' ? '#ffd84a' : '#f28a3c';
  g.beginPath();
  g.arc(tip[0], tip[1], s * (look === 'robot2' ? 0.035 : 0.025), 0, Math.PI * 2);
  g.fill();
}

function raincoatFallback(g: G, s: number): void {
  g.fillStyle = 'rgba(255,214,64,0.9)';
  g.strokeStyle = '#b8901a';
  g.lineWidth = s * 0.015;
  g.beginPath();
  g.moveTo(-s * 0.22, -s * 0.2);
  g.lineTo(-s * 0.18, -s * 0.55);
  g.quadraticCurveTo(0, -s * 0.66, s * 0.18, -s * 0.55);
  g.lineTo(s * 0.22, -s * 0.2);
  g.closePath();
  g.fill();
  g.stroke();
}

function drops(g: G, s: number, t: number): void {
  g.fillStyle = '#8fd3ff';
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + t * 2;
    const r = s * (0.3 + ((t * 0.8 + i * 0.2) % 0.25));
    g.beginPath();
    g.arc(Math.cos(a) * r, -s * 0.45 + Math.sin(a) * r * 0.6, s * 0.018, 0, Math.PI * 2);
    g.fill();
  }
}

/** DOM version for scenes and the friends screen: the picture, else a small canvas. */
export function robotElement(st: RobotState, mood: RobotMood, size: number): HTMLElement {
  const name = robotImage(st.look, mood);
  const src = imageUrl(name);
  const coat = st.raincoat ? imageUrl('robot-raincoat') : null;
  const el = document.createElement('div');
  el.className = 'robot-stack';
  el.style.setProperty('--size', `${size}px`);
  if (src && (!st.raincoat || coat)) {
    for (const s of [src, coat]) {
      if (!s) continue;
      const img = document.createElement('img');
      img.src = s;
      img.alt = '';
      img.draggable = false;
      el.append(img);
    }
  } else {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    drawRobot(cv.getContext('2d')!, st, mood, 128, 246, 256, 0);
    el.append(cv);
  }
  return el;
}
