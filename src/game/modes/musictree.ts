import { VH } from '../../engine/loop';
import { drawSprite, type G } from '../../gfx/draw';
import { Mode } from '../mode';
import type { Target } from '../typing';
import { BeatMode } from './workshop';

/** Where notes hang on the tree, as parts of its size from the crown's middle. */
const SPOTS: [number, number][] = [[-0.62, 0.05], [-0.36, -0.32], [0, -0.48], [0.36, -0.32], [0.62, 0.05], [-0.22, 0.2], [0.24, 0.22]];
const NOTE_COLORS = ['#ffd25a', '#f7a8c9', '#9fd8f5', '#b79be8', '#a6e3c9'];
const TREE = 520;

/** The music tree: the picture, else a trunk and a round crown; `glow` 0..1 as it plays. */
function drawTree(g: G, x: number, y: number, glow: number): void {
  if (glow > 0) {
    g.save();
    g.globalAlpha = glow * 0.5;
    const light = g.createRadialGradient(x, y - TREE * 0.6, 20, x, y - TREE * 0.6, TREE * 0.6);
    light.addColorStop(0, 'rgba(255,240,180,0.9)');
    light.addColorStop(1, 'rgba(255,240,180,0)');
    g.fillStyle = light;
    g.fillRect(x - TREE * 0.6, y - TREE * 1.2, TREE * 1.2, TREE * 1.2);
    g.restore();
  }
  drawSprite(g, 'obj-music-tree', x, y, TREE, { ay: 1 }, (g2, w, h) => {
    g2.fillStyle = '#8a6244';
    g2.beginPath();
    g2.moveTo(-w * 0.07, h / 2);
    g2.lineTo(-w * 0.04, -h * 0.05);
    g2.lineTo(w * 0.04, -h * 0.05);
    g2.lineTo(w * 0.07, h / 2);
    g2.fill();
    g2.fillStyle = '#6fae5a';
    for (const [dx, dy, r] of [[0, -0.2, 0.32], [-0.26, -0.08, 0.22], [0.26, -0.08, 0.22]]) {
      g2.beginPath();
      g2.arc(dx * w, dy * h, r * w, 0, Math.PI * 2);
      g2.fill();
    }
  });
}

/** A note: one of the two pictures (by colour), else a coloured eighth note. */
function drawNote(g: G, x: number, y: number, size: number, color: string, rot = 0): void {
  drawSprite(g, `obj-note${1 + NOTE_COLORS.indexOf(color) % 2}`, x, y, size, { rot }, (g2, w, h) => {
    g2.fillStyle = color;
    g2.strokeStyle = color;
    g2.lineWidth = w * 0.09;
    g2.beginPath();
    g2.ellipse(-w * 0.12, h * 0.25, w * 0.2, h * 0.15, -0.4, 0, Math.PI * 2);
    g2.fill();
    g2.beginPath();
    g2.moveTo(w * 0.06, h * 0.22);
    g2.lineTo(w * 0.06, -h * 0.38);
    g2.quadraticCurveTo(w * 0.3, -h * 0.2, w * 0.26, -h * 0.02);
    g2.stroke();
  });
}

interface Note {
  spot: number;
  color: string;
  state: 'hang' | 'fly';
  x: number;
  y: number;
  fade: number;
}

/**
 * World 14: notes hang on the music tree; some sing (dictation), some glow and fade (memory),
 * in turns. A typed note flies up and the tree plays a little more; notes wait in place.
 */
export class NotesMode extends Mode {
  readonly world = 'musictree';
  private spawned = 0;
  private played = 0;
  private spawnTimer = 0.6;

  private get crown(): { x: number; y: number } {
    return { x: this.L.vw * 0.6, y: VH * 0.92 - TREE * 0.62 };
  }

  update(dt: number): void {
    const L = this.L, core = L.core;
    this.spawnTimer -= dt;
    const busy = new Set(core.targets.map((tg) => (tg.data as Note).spot));
    const free = SPOTS.map((_, i) => i).filter((i) => !busy.has(i));
    if (this.spawned < L.def.count && this.spawnTimer <= 0 && core.active.length < Math.min(3, L.maxActive) && free.length) {
      const spot = L.rng.pick(free);
      const c = this.crown;
      core.add(L.word(), { spot, color: NOTE_COLORS[this.spawned % NOTE_COLORS.length], state: 'hang', x: c.x + SPOTS[spot][0] * TREE * 0.5, y: c.y + SPOTS[spot][1] * TREE * 0.5, fade: 0 } satisfies Note);
      this.spawned++;
      this.spawnTimer = L.spawnGap;
    }
    for (const tg of core.targets) {
      const n = tg.data as Note;
      tg.urgency = -tg.id;
      if (n.state === 'fly') {
        n.y -= dt * 260;
        n.x += Math.sin(this.t * 4 + n.spot) * dt * 60;
        n.fade = Math.min(1, n.fade + dt * 0.9);
      }
    }
    core.prune((tg) => (tg.data as Note).fade < 1);
  }

  onDone(tg: Target): void {
    const n = tg.data as Note;
    n.state = 'fly';
    this.played++;
    this.L.sfx('note');
    this.L.particles.emit(n.x, n.y, 10, 'sparkle', [n.color, '#ffffff'], 130, 7);
  }

  render(g: G): void {
    const c = this.crown;
    drawTree(g, c.x, VH * 0.92, this.played / this.L.def.count);
    for (const tg of this.L.core.targets) {
      const n = tg.data as Note;
      g.save();
      g.globalAlpha = 1 - n.fade;
      if (n.state === 'hang') {
        g.strokeStyle = 'rgba(255,255,255,0.6)';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(n.x, n.y - 70);
        g.lineTo(n.x, n.y - 28);
        g.stroke();
      }
      drawNote(g, n.x, n.y + (n.state === 'hang' ? Math.sin(this.t * 2 + n.spot) * 4 : 0), 64, n.color, Math.sin(this.t * 3 + n.spot) * 0.1);
      g.restore();
    }
    for (const tg of this.L.core.targets) {
      const n = tg.data as Note;
      if (n.state === 'hang') this.L.label(g, tg, n.x, n.y - 80, 38);
    }
  }

  progress(): number {
    return this.played / this.L.def.count;
  }

  get finished(): boolean {
    return this.spawned >= this.L.def.count && this.L.core.targets.length === 0;
  }
}

/** Super-obstacle of the music tree: its song, short dictated words to a calm steady beat; every word lights a note. */
export class TreeSongMode extends BeatMode {
  readonly world = 'musictree';
  protected readonly doneLine = 'story.treeSong';
  protected ringX = 0.3;

  protected tempo(): number {
    return 40 + this.L.difficulty * 2;
  }

  protected drawScene(g: G, k: number): void {
    const x = this.L.vw * 0.68, y = VH * 0.92;
    drawTree(g, x, y, k);
    const lit = Math.round(k * SPOTS.length);
    SPOTS.forEach(([dx, dy], i) => {
      const on = i < lit;
      const ny = y - TREE * 0.62 + dy * TREE * 0.5 - (on && k >= 1 ? Math.sin(this.t * 3 + i) * 10 : 0);
      g.save();
      g.globalAlpha = on ? 1 : 0.35;
      drawNote(g, x + dx * TREE * 0.5, ny, 56, NOTE_COLORS[i % NOTE_COLORS.length]);
      g.restore();
    });
  }
}
