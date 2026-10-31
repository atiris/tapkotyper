import { VH } from '../../engine/loop';
import type { G } from '../../gfx/draw';
import { type FairyMood, drawFairy } from '../../gfx/fairy';
import { LITTLE_DRAGON_PICTURES, type LittleDragonMood, drawLittleDragon } from '../../gfx/little-dragon';
import { type RobotMood, type RobotState, drawRobot, robotFor } from '../../gfx/robot';
import { type LevelDef, storyOf } from '../levels';
import { TAPKO_X } from '../mode';
import type { LevelRuntime } from '../runtime';

/** Bolt's place next to the DOM Tapko and his height, in game units. */
const BOLT_X = 350;
const BOLT_SIZE = 150;
/** Melody's height, how high she floats above the friend's spot, and the seconds of her happy hop. */
const FAIRY_SIZE = 120;
const FAIRY_FLOAT = 110;
const FAIRY_HOP = 0.6;
/** The little dragon's height, its place behind the DOM Tapko, and the seconds of its glad hop. */
const LITTLE_SIZE = 92;
const LITTLE_X = TAPKO_X - 95;
const LITTLE_HOP = 0.5;

/** The story friends on the canvas next to Tapko: Bolt (story 2), Melody (story 3), the hatched little dragon (the dragon story's hero's journey). */
export class Friends {
  /** Bolt walks with Tapko in story 2 levels; null elsewhere. */
  readonly robot: RobotState | null;
  /** Melody floats next to Tapko in story 3 levels. */
  readonly fairy: boolean;
  /** The hatched little dragon walks behind Tapko on the dragon story's hero's journey. */
  readonly little: boolean;
  private robotMood: RobotMood = 'idle';
  private robotMoodT = 0;
  private fairyMood: FairyMood = 'idle';
  private fairyMoodT = 0;
  private fairyHop = 0;
  private littleMood: LittleDragonMood = 'idle';
  private littleMoodT = 0;
  private littleHop = 0;

  constructor(private L: LevelRuntime, def: LevelDef) {
    const story = def.kind !== 'practice' && def.kind !== 'freetype' && def.kind !== 'aim' && def.kind !== 'parrot';
    this.robot = story && storyOf(def.world).id === 'robot' ? robotFor(def.world) : null;
    this.fairy = story && storyOf(def.world).id === 'fairy';
    this.little = def.journey?.story === 'dragon';
  }

  /** Pictures the level loads for its friends (Bolt's and Melody's are always loaded). */
  get pictures(): string[] {
    return this.little ? LITTLE_DRAGON_PICTURES : [];
  }

  /** A key typed wrong: they worry a moment. */
  wrong(): void {
    this.setRobot('worried', 1);
    this.setFairy('curious', 1);
    this.setLittle('worried', 1);
  }

  /** A target typed: they are glad. */
  done(): void {
    this.setRobot('happy', 1.2);
    this.setFairy('happy', 1.2);
    this.setLittle('happy', 1.2);
  }

  /** A stumble in the story (a missed boulder, a cracked stone): they look worried a while. */
  worried(seconds: number): void {
    this.setRobot('worried', seconds);
    this.setFairy('curious', seconds);
    this.setLittle('worried', seconds);
  }

  /** Melody sings a dictated target. */
  sing(): void {
    this.setFairy('singing', 1.4);
  }

  update(dt: number): void {
    if (this.robotMoodT > 0 && (this.robotMoodT -= dt) <= 0) this.robotMood = 'idle';
    if (this.fairyMoodT > 0 && (this.fairyMoodT -= dt) <= 0) this.fairyMood = 'idle';
    if (this.littleMoodT > 0 && (this.littleMoodT -= dt) <= 0) this.littleMood = 'idle';
    this.littleHop = Math.max(0, this.littleHop - dt);
    this.fairyHop = Math.max(0, this.fairyHop - dt);
  }

  /** Under the mode's objects; they hop with Tapko at the end. */
  draw(g: G): void {
    if (this.robot) this.drawBolt(g, this.robot);
    if (this.fairy) this.drawMelody(g);
    if (this.little) this.drawLittle(g);
  }

  private setRobot(mood: RobotMood, seconds: number): void {
    this.robotMood = mood;
    this.robotMoodT = seconds;
  }

  /** Melody looks curious, sings, or hops once (happy). */
  private setFairy(mood: FairyMood, seconds: number): void {
    this.fairyMood = mood;
    this.fairyMoodT = seconds;
    if (mood === 'happy' && !this.L.reduceMotion) this.fairyHop = FAIRY_HOP;
  }

  /** The little dragon is glad (a hop) or worried a while. */
  private setLittle(mood: LittleDragonMood, seconds: number): void {
    this.littleMood = mood;
    this.littleMoodT = seconds;
    if (mood === 'happy' && !this.L.reduceMotion) this.littleHop = LITTLE_HOP;
  }

  /** The story friend's feet (Bolt, Melody below where she floats): where the mode puts them, else next to Tapko. */
  private spot(): { x: number; y: number } {
    return this.L.mode.friendSpot() ?? { x: BOLT_X, y: VH - 6 };
  }

  private drawBolt(g: G, robot: RobotState): void {
    const { x, y } = this.spot();
    const L = this.L;
    if (L.endTime == null) return drawRobot(g, robot, this.robotMood, x, y, BOLT_SIZE, L.mode.t);
    drawRobot(g, robot, 'happy', x, y - Math.sin(L.endHop * Math.PI) * 24, BOLT_SIZE, L.mode.t);
  }

  /** Melody floats above the friend's spot; she hops at a word and at the end. */
  private drawMelody(g: G): void {
    const { x, y } = this.spot();
    const L = this.L;
    const hop = L.endTime == null ? (this.fairyHop > 0 ? 1 - this.fairyHop / FAIRY_HOP : 0) : L.endHop;
    drawFairy(g, L.endTime == null ? this.fairyMood : 'happy', x, y - FAIRY_FLOAT, FAIRY_SIZE, L.mode.t, hop);
  }

  /** The little dragon right behind Tapko. */
  private drawLittle(g: G): void {
    const L = this.L;
    if (L.mode.friendAway()) return;
    const { x, y } = L.mode.friendSpot() ?? { x: LITTLE_X, y: L.mode.tapkoFeet };
    const hop = L.endTime == null ? (this.littleHop > 0 ? 1 - this.littleHop / LITTLE_HOP : 0) : L.endHop;
    drawLittleDragon(g, L.endTime == null ? this.littleMood : 'happy', x, y, LITTLE_SIZE, L.mode.t, hop, !L.reduceMotion);
  }
}
