import { Rng } from './rng';

export type ParticleShape = 'puff' | 'sparkle' | 'heart' | 'dot' | 'leaf';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; max: number; size: number;
  color: string; shape: ParticleShape; rot: number; vr: number;
}

/** Soft puffs, sparkles and hearts. Never explosions. */
export class Particles {
  private list: Particle[] = [];
  private rng = new Rng(7);
  enabled = true;

  emit(x: number, y: number, n: number, shape: ParticleShape, colors: string[], speed = 120, size = 10, life = 0.9): void {
    if (!this.enabled) n = Math.ceil(n / 4);
    const r = this.rng;
    for (let i = 0; i < n; i++) {
      const a = r.range(0, Math.PI * 2);
      const s = r.range(0.3, 1) * speed;
      this.list.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - speed * 0.2,
        life: 0, max: life * r.range(0.7, 1.2), size: size * r.range(0.6, 1.3),
        color: r.pick(colors), shape, rot: r.range(0, 6.28), vr: r.range(-3, 3),
      });
    }
  }

  update(dt: number): void {
    for (const p of this.list) {
      p.life += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy = p.vy * 0.96 + (p.shape === 'leaf' ? 30 : p.shape === 'puff' ? -10 : 15) * dt;
      p.rot += p.vr * dt;
    }
    this.list = this.list.filter((p) => p.life < p.max);
  }

  render(g: CanvasRenderingContext2D): void {
    for (const p of this.list) {
      const k = p.life / p.max;
      g.save();
      g.globalAlpha = Math.max(0, 1 - k) * (p.shape === 'puff' ? 0.7 : 1);
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.fillStyle = p.color;
      const s = p.size * (p.shape === 'puff' ? 1 + k * 1.5 : 1 - k * 0.4);
      drawShape(g, p.shape, s);
      g.restore();
    }
  }

  clear(): void {
    this.list = [];
  }
}

export function drawShape(g: CanvasRenderingContext2D, shape: ParticleShape, s: number): void {
  g.beginPath();
  if (shape === 'sparkle') {
    for (let i = 0; i < 8; i++) {
      const r = i % 2 ? s * 0.35 : s;
      const a = (i * Math.PI) / 4;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
  } else if (shape === 'heart') {
    g.moveTo(0, s * 0.35);
    g.bezierCurveTo(-s * 1.1, -s * 0.4, -s * 0.4, -s * 1.1, 0, -s * 0.45);
    g.bezierCurveTo(s * 0.4, -s * 1.1, s * 1.1, -s * 0.4, 0, s * 0.35);
  } else if (shape === 'leaf') {
    g.ellipse(0, 0, s, s * 0.45, 0, 0, Math.PI * 2);
  } else {
    g.arc(0, 0, s, 0, Math.PI * 2);
  }
  g.fill();
}
