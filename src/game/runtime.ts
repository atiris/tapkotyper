import { app, layout, pickLine, reduceMotion, saveProfile } from '../app/app';
import { audio, type Sfx } from '../audio/audio';
import { speech } from '../audio/speech';
import { Loop, Stage, VH } from '../engine/loop';
import { Particles } from '../engine/particles';
import { Rng } from '../engine/rng';
import { Tweens, ease } from '../engine/tween';
import { drawBackground, drawSpeech, drawWord, fontFamily, type G, type SpeechLayout, speechLayout, wordBox } from '../gfx/draw';
import { type Mood, pawColors, tapkoElement, renderTapkoInto } from '../gfx/tapko';
import { preload, preloadPlay } from '../gfx/assets';
import { type FairyMood, drawFairy } from '../gfx/fairy';
import { type RobotMood, type RobotState, drawRobot, robotFor } from '../gfx/robot';
import { locale, t, tList } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { type InputHandlers, KeyInput, type TypedChar } from '../input/input';
import { setShortcuts, withKey } from '../input/shortcuts';
import { ENTER, LAYOUTS, LayoutMismatchDetector, enterAfter, fingerFor, stepsFor } from '../keyboard/layouts';
import { SHIFT_L, SHIFT_R, SPACE, activeKeys, isKeyReady, isLetterKey, keysToIntroduce, masteryLevel, newestGroup, recentAccuracy, shiftKeyOf } from '../learning/lessons';
import { keyWeights, recordPress, recordSession } from '../learning/stats';
import { FINGER_KEYS, KeyboardGuide, keyLabel } from '../ui/keyboard-guide';
import { button, closeModals, confirmDialog, h } from '../ui/dom';
import { globalButtons } from '../ui/chrome';
import { tip } from '../ui/tooltip';
import { accuracyPic, paintRound, pawRing, placeRing, rhythmPic, roundButton, worldName } from '../ui/hud';
import { OWN_SHARE, WordSource, type WordSourceOwn } from '../words/words';
import type { LangRef, Profile, Surprise } from '../storage/schema';
import type { LevelDef } from './levels';
import { WORLDS, grownCount, hasMinLength, levelOver, minActiveS, shownProgress, storyOf } from './levels';
import type { Mode } from './mode';
import { PAW_MAX, PAW_STREAK, PAW_WORDS } from './paw';
import { ENTER_MAX, EnterMarks } from './enter';
import { createMode } from './modes';
import { FreeTypeMode } from './modes/freetype';
import { PressureValve, perChar, sayTime } from './pace';
import { Rhythm } from './rhythm';
import { type LevelResult, completeLevel, completeStay } from './progress';
import { type Style, type Target, TypingCore } from './typing';
import { pickTip, showCard, showNewKey, showPosture } from './cards';
import { surpriseFor } from './own-content';

/** A short shout over the scene (a goal, a cheer) where it popped up. */
interface Shout {
  text: string;
  x: number;
  y: number;
  age: number;
}

/** A speech bubble in the scene: who says it, centered near (x, y) (or ending at x), its tail toward (tx, ty). */
interface Speech {
  who: string;
  /** (x, y) is the middle of its right edge, not its center. */
  right: boolean;
  text: string;
  x: number;
  y: number;
  tx: number;
  ty: number;
  age: number;
  life: number;
  /** Its vertical move clear of the word labels, kept while it stays clear. */
  dy: number;
  lay?: SpeechLayout;
}

/** A word label a mode asked for in this frame, at its object's anchor. */
interface PendingLabel {
  tg: Target;
  x: number;
  y: number;
  size: number;
}

interface Rect {
  /** The target whose label it is. */
  id?: number;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/** Space kept between two labels, and the move from which a line points back to the object. */
const LABEL_GAP = 6;
const LABEL_LINE_FROM = 30;
/** A long label shrinks to fit, down to this font size. */
const LABEL_MIN_SIZE = 28;
/** Seconds every target gets to be read. */
const READ_TIME = 3;
/** Extra seconds a target with a capital letter gets (the Shift chord is hard). */
const CAPITAL_EXTRA = 1.5;
/** Travel time of dictated and remembered targets: hearing or recalling a target takes longer. */
const STYLE_PACE: Record<Style, number> = { copy: 1, dictation: 1.5, memory: 1.8, mixed: 1.8 };
/** Seconds without a key after which a dictated target is said once more. */
const DICTATION_REPEAT = 4;
/** Bolt's place next to the DOM Tapko, in CSS pixels from the left, and his height in game units. */
const BOLT_CSS_X = 200;
const BOLT_SIZE = 150;
/** Melody's height, how high she floats above the friend's spot, and the seconds of her happy hop. */
const FAIRY_SIZE = 120;
const FAIRY_FLOAT = 110;
const FAIRY_HOP = 0.6;
/** Seconds a shout stays over the scene. */
const SHOUT_TIME = 1.1;
/** Widest speech bubble, and how far it may move up or down to stay clear of the word labels. */
const SPEECH_W = 360;
const SPEECH_ROOM = 160;
/** The end of a level: Tapko hops HOPS times of HOP_TIME seconds, his tool fades in TOOL_FADE, then the results open. */
const HOPS = 3;
const HOP_TIME = 0.4;
const TOOL_FADE = 0.4;
const RESULTS_AFTER = 1.4;
/** Seconds a level waits at most for its pictures before it starts with the fallbacks. */
const PLAY_WAIT_S = 5;
/** Milliseconds after play begins in which Enter does nothing. */
const ENTER_GUARD_MS = 300;

/** What the voice says for a target: its words, never the Enter mark. */
function spoken(tg: Target): string {
  return tg.word.replace(ENTER, '');
}

/**
 * The targets of a profile: its active keys (or a drill's, or the keys chosen for free practice),
 * weak keys more often, the newest group in focus (or the target range's weak keys), and the
 * parent's own words and text mixed in (not in drills, chosen keys or the target range, their
 * words would bring other letters), or a task's.
 */
export function wordSource(p: Profile, lang: LangRef, drill?: string[], own?: WordSourceOwn, chosen?: string[], focus?: string[]): WordSource {
  // Practice of space, punctuation or a Shift needs letters around it: the known ones.
  const keys = chosen ?? (!drill ? activeKeys(p) : drill.every(isLetterKey) ? drill : [...new Set([...activeKeys(p), ...drill])]);
  const s = p.settings;
  return new WordSource(app.words[lang], {
    keys,
    len: s.wordLen,
    noDiacritics: s.noDiacritics,
    weights: keyWeights(p, keys),
    focus: drill ?? (focus ?? newestGroup(p)).filter((k) => keys.includes(k)),
    layout: LAYOUTS[p.layout],
    names: tList('names'),
    shiftMastery: Object.fromEntries([SHIFT_L, SHIFT_R].map((k) => [k, masteryLevel(p.stats.keys[k], s.difficulty)])),
    own: drill || chosen || focus ? undefined : own ?? { words: s.ownWords, text: s.ownText, share: OWN_SHARE[s.ownMix] },
  });
}

export interface RuntimeOptions {
  /** Practice: only these keys (drills), else the profile's active keys. */
  keys?: string[];
  /** Free practice: words only from these keys, chosen in the key picker. */
  chosen?: string[];
  /** Practice length in seconds; null = until the child stops. */
  seconds?: number | null;
  /** Own words and text instead of the parent's (a task's). */
  own?: WordSourceOwn;
  /** Free practice: the style chosen in the key picker (a level's own style wins). */
  style?: Style;
  /** Staying a while: the level runs without an end until Esc, for no stars. */
  stay?: boolean;
  onFinish(result: LevelResult | null): void;
  onExit(): void;
  /** A click on Tapko during play (the level pauses first). */
  onTapko(): void;
  /** The help page over the paused level, with what this level asks (`now`); `back` returns to the paused level. */
  onHelp(back: () => void, now: HTMLElement[]): void;
}

/** The e2e build counts the frames with a speech bubble and those where one covers a word label (`window.speechLog`). */
function speechLog(b: Rect, labels: Rect[]): void {
  const log = ((window as any).speechLog ??= { frames: 0, overlaps: 0 });
  log.frames++;
  if (labels.some((r) => r.x1 > b.x0 + LABEL_GAP && r.x0 < b.x1 - LABEL_GAP && r.y1 > b.y0 + LABEL_GAP && r.y0 < b.y1 - LABEL_GAP)) log.overlaps++;
}

/** Runs one level: input, typing state, mode, HUD, guide, Tapko, stats. */
export class LevelRuntime {
  readonly core = new TypingCore();
  readonly tweens = new Tweens();
  readonly particles = new Particles();
  readonly rng = new Rng();
  readonly stage: Stage;
  readonly mode: Mode;
  /** The mode of free typing ("just typing"): it takes every key itself; null in every other level. */
  readonly free: FreeTypeMode | null;
  readonly words: WordSource;
  /** Which targets end with Enter; null where none do. */
  private readonly enter: EnterMarks | null;
  /** The parent's surprise rule asked on the get-ready card of this run, when one waits. */
  readonly surprise: Surprise | null;
  /** The profile's difficulty; "Slower" in the pause lowers it during the level. */
  difficulty: number;
  readonly noPressure: boolean;
  /** How the targets are shown; dictation falls back to copy typing without a voice. */
  style: Style;
  readonly highContrast: boolean;
  readonly reduceMotion: boolean;
  readonly el: HTMLElement;
  /** Bolt walks with Tapko in story 2 levels and its rescue missions (with his final look); null elsewhere. */
  readonly robot: RobotState | null;
  private robotMood: RobotMood = 'idle';
  private robotMoodT = 0;
  /** Melody floats next to Tapko in story 3 levels and its rescue missions. */
  readonly fairy: boolean;
  private fairyMood: FairyMood = 'idle';
  private fairyMoodT = 0;
  private fairyHop = 0;
  private shouts: Shout[] = [];
  private speeches: Speech[] = [];

  private loop: Loop;
  private input: KeyInput | null = null;
  private guide: KeyboardGuide;
  private guideOn: boolean;
  private tapko: HTMLElement;
  /** Tapko's current mood, for modes that draw him on the canvas. */
  tapkoMood: Mood = 'idle';
  private bubble: HTMLElement;
  private bubbleTimer = 0;
  private progressFill: HTMLElement;
  private gauge = rhythmPic();
  /** Own practice and the target range: a ring of accuracy for each key in focus, before the rhythm. */
  private accuracyPics: { key: string; pic: ReturnType<typeof accuracyPic> }[] = [];
  /** Seconds until the gauge's spoken label may change again. */
  private gaugeLabelIn = 0;
  private pauseEl: HTMLElement | null = null;
  /** Free typing's text shown above Tapko and the range's speech bubbles, for screen readers. */
  private saidEl: HTMLElement | null = null;
  private breakSaid = false;
  private paused = false;
  /** Play began (the preparation cards are done). */
  started = false;
  private finished = false;
  private deadPending = false;
  private mismatch: LayoutMismatchDetector;
  private mismatchShown = false;

  /** Keys the child pressed for a target in this level, right or wrong; leaving after one asks first. */
  private pressed = 0;
  /** Stats of this level. */
  chars = 0;
  errors = 0;
  private elapsed = 0;
  /** Targets the level wants now: the planned count, more while the level is shorter than its minimum. */
  count: number;
  /** Seconds of active play (no pause, no card) and the minimum before the level may end; 0 = no minimum. */
  private played = 0;
  private readonly minActive: number;
  /** The child's rhythm; it also measures each press's reaction time. */
  readonly rhythm: Rhythm;
  private wrongStreak = { ch: '', n: 0 };
  private wordStreak = 0;
  private lastCheer = 0;
  private moodTimer = 0;
  private hadKeydown = false;
  /** Rhythm of the last session (characters per second), the pace before the child's own words. */
  private readonly lastCps: number;
  /** Seconds per character of each target the child finished, reading and the first key included. */
  private paceSamples: number[] = [];
  /** Level time when each visible target became selectable. */
  private shownAt = new Map<number, number>();
  private valve = new PressureValve();
  /** Targets the child typed, and the misses already given to the valve. */
  private typedTargets = 0;
  private missesSeen = 0;
  /** Targets the child typed without a reveal (dictation) or a flash (memory). */
  private cleanTargets = 0;

  /** Paw help: the HUD button, words the paw still types, seconds to its next key. */
  private pawBtn: HTMLButtonElement | null = null;
  private pawWords = 0;
  private pawTimer = 0;
  private pawIdle = 0;
  private guideBeforePaws = true;

  constructor(root: HTMLElement, readonly def: LevelDef, private opts: RuntimeOptions) {
    const p = app.profile!;
    this.difficulty = this.core.difficulty = p.settings.difficulty;
    this.noPressure = p.settings.noTimePressure;
    this.style = def.style ?? opts.style ?? 'copy';
    this.highContrast = p.settings.highContrast;
    this.reduceMotion = reduceMotion();
    this.tweens.speed = this.reduceMotion ? 0.5 : 1;
    this.particles.enabled = !this.reduceMotion;
    const lastCpm = p.stats.sessions[p.stats.sessions.length - 1]?.cpm ?? 0;
    this.rhythm = new Rhythm(lastCpm, this.difficulty);
    this.lastCps = lastCpm ? lastCpm / 60 : 1;
    this.mismatch = new LayoutMismatchDetector(p.layout);

    const lay = LAYOUTS[p.layout];
    // Practice (the custom exercise, key drills, tasks) has its own word language; story levels use the player's.
    this.words = wordSource(p, def.kind === 'practice' ? p.settings.ownWordLang : p.settings.wordLang, opts.keys, opts.own, opts.chosen, def.focus);
    // Enter comes with the right little finger's home key; drills, single letters and the gate's code stay without it.
    const enterOk = !opts.keys && !def.noSpace && def.kind !== 'gate' && def.kind !== 'freetype' && def.kind !== 'aim' && (opts.chosen ?? activeKeys(p)).includes(enterAfter(lay));
    this.enter = enterOk ? new EnterMarks(() => this.rng.next(), def.kind === 'practice' ? null : ENTER_MAX) : null;
    this.surprise = opts.stay || def.kind === 'aim' ? null : surpriseFor(p, def, !!opts.keys);
    this.count = def.count;
    // The e2e build may shorten the minimum (`?minActive=8`), so its tests finish levels in seconds.
    // Staying a while never reaches its minimum: the targets keep coming until Esc.
    this.minActive = opts.stay ? Infinity : !hasMinLength(def) ? 0 : import.meta.env.MODE === 'e2e' ? Number(new URLSearchParams(location.search).get('minActive') ?? 0) : minActiveS(def);

    // DOM: HUD, stage, Tapko, bubble, guide.
    this.el = h('div', { class: `level-screen world-${WORLDS[def.world]}${def.rescue ? ' world-rescue' : ''}` });
    const story = def.kind !== 'practice' && def.kind !== 'freetype' && def.kind !== 'aim';
    this.robot = story && storyOf(def.world).id === 'robot' ? robotFor(def.rescue ? WORLDS.length - 1 : def.world) : null;
    if (this.robot) this.el.dataset.bolt = this.robot.look;
    this.fairy = story && storyOf(def.world).id === 'fairy';
    if (this.fairy) this.el.dataset.fairy = 'melody';
    this.progressFill = h('div', { class: 'progress-fill' });
    const title = def.kind === 'practice' ? t(def.phrases ? 'level.ownText' : 'level.practice') : def.kind === 'freetype' ? t('level.freeType') : def.kind === 'aim' ? t('aim.title') : def.rescue ? t('level.rescue') : worldName(def);
    const guideBtn = roundButton('control', 'keyboard', t('level.guide'), () => this.toggleGuide());
    tip(guideBtn, withKey(t('level.guide'), 'F2'));
    if (p.settings.guideLocked) guideBtn.disabled = true;
    const helpBtn = roundButton('control', 'help', t('level.help'), () => this.openHelp());
    tip(helpBtn, withKey(t('level.help'), 'F1'));
    this.readBtn = roundButton('control', 'read', t('level.read'), () => this.toggleRead());
    tip(this.readBtn, withKey(t('level.read'), 'F3'));
    this.paintRead();
    this.offVoices = speech.onVoices(() => this.paintRead());
    // Free typing has nothing to pause: its X leaves.
    const pauseBtn = def.kind === 'freetype' ? roundButton('control', 'close', t('level.leave'), () => this.exit()) : roundButton('control', 'pause', t('level.pause'), () => this.pause());
    if (this.pawsAllowed) {
      this.pawBtn = roundButton('paw', 'paw', t('paw.title', { n: PAW_STREAK, words: PAW_WORDS }), () => this.startPaws());
      this.pawBtn.classList.add('paw-btn');
      this.renderPawBtn();
    }
    if (def.kind === 'practice' || def.kind === 'aim') this.accuracyPics = [...this.words.focus].map((key) => ({ key, pic: accuracyPic(key) }));
    this.paintAccuracy();
    const hud = h('div', { class: 'hud' },
      pauseBtn,
      this.pawBtn,
      def.kind === 'practice' || def.index < 0 ? null : placeRing(def),
      h('b', { class: 'hud-title' }, title),
      opts.stay && def.kind !== 'aim' ? h('span', { class: 'hud-hint' }, t('level.stayHint')) : null,
      ...(def.kind === 'freetype' ? [] : [opts.stay ? null : h('div', { class: 'progress', tip: t('level.progress') }, this.progressFill), ...this.accuracyPics.map((a) => a.pic.el), this.gauge.el]),
      h('span', { class: 'hud-divider', 'aria-hidden': 'true' }),
      guideBtn, this.readBtn, ...globalButtons(helpBtn));
    const stageWrap = h('div', { class: 'stage-wrap' });
    this.tapko = tapkoElement(p.companion, 'idle', 150);
    // Tapko joins the stage when play starts; the preparation cards show him themselves.
    this.tapko.classList.add('level-tapko', 'waiting');
    this.tapko.dataset.tip = t('tapko.statsHint');
    this.tapko.addEventListener('click', () => {
      if (this.finished || !this.started) return;
      this.pause();
      this.opts.onTapko();
    });
    this.bubble = h('div', { class: 'bubble hidden', role: 'status', 'aria-live': 'polite' });
    stageWrap.append(this.tapko, this.bubble);
    this.guide = new KeyboardGuide(lay);
    this.guideOn = p.settings.guide !== 'off';
    this.guide.setVisible(this.guideOn);
    this.el.append(hud, stageWrap, this.guide.el);
    root.append(this.el);

    this.stage = new Stage(stageWrap);
    this.onStageClick = this.onStageClick.bind(this);
    this.stage.canvas.addEventListener('pointerdown', this.onStageClick);
    this.mode = createMode(def, this);
    this.free = this.mode instanceof FreeTypeMode ? this.mode : null;
    const extra = this.mode.hud();
    if (extra) hud.querySelector('.hud-title')!.after(extra);
    hud.querySelector('.hud-title')!.after(...this.mode.rings());
    if (this.free || def.kind === 'aim') {
      this.saidEl = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
      stageWrap.append(this.saidEl);
    }
    this.tapko.classList.toggle('hidden', this.tapkoOnStage);
    this.loop = new Loop((dt) => this.update(dt), () => this.render());
    this.loop.start();
    this.onVisibility = this.onVisibility.bind(this);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.onTouch = this.onTouch.bind(this);
    window.addEventListener('pointerdown', this.onTouch);
    // F2 and F3 work like their buttons, and only where the buttons do.
    this.offShortcuts = setShortcuts({
      help: () => this.openHelp(),
      guide: () => { if (!guideBtn.disabled) this.toggleGuide(); },
      read: () => { if (!this.readBtn.hidden) this.toggleRead(); },
    });
    void this.prepare();
  }

  private readonly offShortcuts: () => void;

  /** Story levels and rescue missions; free practice, drills and the target range count every key, and the main gate's code is the child's own. */
  get pawsAllowed(): boolean {
    return this.def.kind !== 'practice' && this.def.kind !== 'freetype' && this.def.kind !== 'gate' && this.def.kind !== 'aim' && !this.opts.keys;
  }

  /** The background: the rescue camp in a rescue mission, else the mode's world. */
  get backdrop(): string {
    return this.def.rescue ? 'rescue' : this.mode.world;
  }

  get tapkoOnStage(): boolean {
    return ['freetype', 'aim', 'swamp', 'signs', 'boulder', 'doors', 'gate', 'rooms', 'buds', 'flower', 'owl', 'lilies', 'reflection', 'space', 'asteroid'].includes(this.def.kind);
  }

  /** Preparation: assets, new keys, the get-ready card with the tip and its password, then play. */
  private async prepare(): Promise<void> {
    const p = app.profile!;
    // The things of the level are ready when it opens; a slow connection waits PLAY_WAIT_S at most.
    await Promise.all([preload([`bg-${this.backdrop}-far`, `bg-${this.backdrop}-mid`, `bg-${this.backdrop}-near`]),
      Promise.race([preloadPlay(), new Promise((r) => setTimeout(r, PLAY_WAIT_S * 1000))])]);
    if (this.disposed) return;
    audio.music(this.def.kind === 'practice' ? app.menuTrack : this.mode.world);
    // Free typing and staying a while start at once; the child has just played this level.
    if (this.free || this.opts.stay) return this.begin();
    const host = this.el.querySelector<HTMLElement>('.stage-wrap')!;
    let tip: string | undefined;
    if (!app.tipShown && !this.opts.keys) {
      app.tipShown = true;
      tip = pickTip(p, this.style)?.text;
      saveProfile();
    }
    for (const key of this.opts.keys ? [] : keysToIntroduce(p)) {
      if (this.disposed) return;
      await showNewKey(host, key, layout(), this.guide, p);
      p.progress.introducedKeys.push(key);
      saveProfile();
    }
    if (this.disposed) return;
    // Without a voice of the language a dictation runs as copy typing (a mixed run as memory), and the card says so.
    const noVoice = this.dictating && !speech.available(locale());
    const voiceNote = noVoice ? t(this.style === 'mixed' ? 'level.noVoiceMemory' : 'level.noVoice') : undefined;
    if (noVoice) this.style = this.style === 'mixed' ? 'memory' : 'copy';
    this.core.style = this.style;
    this.paintRead();
    this.storyLine = this.mode.startLine();
    if (!this.opts.keys) await showPosture(host, p, tip, this.surprise, voiceNote, this.storyLine);
    if (this.disposed) return;
    const intro = this.mode.intro();
    if (intro) await showCard(host, h('p', {}, intro), { button: t('common.ok'), cls: 'mode-intro' });
    if (this.disposed) return;
    this.begin();
  }

  /** The level's story line, picked once for the get-ready card and the first bubble. */
  private storyLine: string | null = null;
  /** When play began (`performance.now()`). */
  private begunAt = 0;

  /** Play starts: the mode, the story line or the friend's first line, the keys. */
  private begin(): void {
    this.mode.start();
    this.started = true;
    this.begunAt = performance.now();
    if (this.free) this.say(t('freeType.start'), 6);
    else if (this.opts.stay) this.say(t(this.def.kind === 'aim' ? 'aim.stayStart' : 'level.stayStart'), 6);
    else if (this.storyLine) this.say(this.storyLine, this.mode.startSeconds());
    else if (this.fairy) this.say(pickLine('fairy.start'), 3);
    this.tapko.classList.remove('waiting');
    this.rhythm.ready(performance.now());
    this.input = new KeyInput(window, this.handlers());
    this.updateGuide();
  }

  private handlers(): InputHandlers {
    return {
      onChar: (c) => this.onChar(c),
      onDead: () => { this.deadPending = true; this.updateGuide(); },
      // Staying a while ends with Esc, it never pauses.
      onEscape: () => (this.paused ? this.resume() : this.free ? this.exit() : this.opts.stay ? this.endPractice() : this.pause()),
      onRaw: (code, key, shift) => this.onRaw(code, key, shift),
      // A target waiting for Enter takes it; else the Enter that closed a card just before play is not a call for the paw.
      onEnter: () => (this.free ? this.freeSend() : this.waitsEnter ? this.typeEnter() : performance.now() - this.begunAt >= ENTER_GUARD_MS && (this.modeEnter() || this.startPaws())),
      onBackspace: () => { if (this.free) this.freeErase(); },
      // A pause or a dialog: the keys belong to its buttons.
      idle: () => this.paused || !!document.querySelector('.modal-back'),
    };
  }

  private disposed = false;

  dispose(): void {
    // Leaving by the browser's back button still keeps the time and keys typed.
    if (this.started && !this.finished) this.flushSession();
    this.disposed = true;
    speech.stop();
    this.offVoices();
    this.offShortcuts();
    this.loop.stop();
    this.input?.dispose();
    this.stage.dispose();
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pointerdown', this.onTouch);
    this.stage.canvas.removeEventListener('pointerdown', this.onStageClick);
  }

  // ---- words and pacing ------------------------------------------------------

  /** Next target (a word, a phrase of up to `words` words, or a sentence of at least `minWords`); avoids first letters already on screen. */
  word(maxLen?: number, words = this.mode.phraseWords, minWords = this.mode.phraseMin): string {
    const avoid = new Set(this.core.active.map((t) => t.word[0].toLowerCase()));
    const w = this.words.next(avoid, maxLen, this.def.noSpace ? 1 : words, minWords);
    return this.enter?.next() ? w + ENTER : w;
  }

  /** Next single letter (letter catch), never one already on screen. */
  letter(): string {
    return this.words.letter(new Set(this.core.active.map((t) => t.word)));
  }

  /**
   * Seconds a target takes to reach the player: difficulty, the child's word pace (reading
   * included) and time to read it; a capital gets more, and the pressure valve slows it down.
   */
  travelTime(word: string): number {
    const base = (9 - this.difficulty * 0.5) * 0.55;
    const read = READ_TIME + (/\p{Lu}/u.test(word) ? CAPITAL_EXTRA : 0);
    return (base + word.length * perChar(this.paceSamples, this.lastCps) + read) * this.valve.factor * STYLE_PACE[this.style];
  }

  /** How many targets may be on screen at once. */
  get maxActive(): number {
    const d = this.difficulty;
    return d <= 3 ? 1 : d <= 6 ? 2 : d <= 9 ? 3 : 4;
  }

  /** Seconds between spawns. */
  get spawnGap(): number {
    return Math.max(1.2, 3.6 - this.difficulty * 0.25);
  }

  /** Word pace and valve: visible targets get their start time, misses slow the level down. */
  private trackPace(): void {
    const shown = new Map<number, number>();
    for (const tg of this.core.active) if (tg.selectable) shown.set(tg.id, this.shownAt.get(tg.id) ?? this.elapsed);
    this.shownAt = shown;
    for (; this.missesSeen < this.core.missed; this.missesSeen++) this.valve.miss();
  }

  /** A target the child typed (not the paw). */
  private targetTyped(tg: Target): void {
    const since = this.shownAt.get(tg.id);
    if (since != null) this.paceSamples.push((this.elapsed - since) / tg.word.length);
    this.typedTargets++;
    if (!tg.revealed) this.cleanTargets++;
    this.valve.hit();
  }

  private paintAccuracy(): void {
    const p = app.profile!;
    for (const { key, pic } of this.accuracyPics) pic.set(recentAccuracy(p.stats.keys[key]), isKeyReady(p, key));
  }

  /** Staying a while: no end until the child stops. */
  get staying(): boolean {
    return !!this.opts.stay;
  }

  get vw(): number {
    return this.stage.vw;
  }

  sfx(s: Sfx): void {
    audio.sfx(s);
  }

  // ---- input -------------------------------------------------------------------

  private onRaw(code: string, key: string, shift: boolean): void {
    this.hadKeydown = true;
    if (this.mismatchShown) return;
    const other = this.mismatch.observe(code, key, shift);
    if (other) {
      this.mismatchShown = true;
      this.say(t('level.layoutHint', { layout: t(`layouts.${other}`) }), 7);
    }
  }

  /** The locked target has its letters and waits for Enter. */
  private get waitsEnter(): boolean {
    return !!this.core.locked && this.core.expectedChar() === ENTER;
  }

  /** The mode may take an Enter no word waits for, while playing. */
  private modeEnter(): boolean {
    return this.started && !this.paused && !this.finished && this.mode.onEnter();
  }

  /** Enter finishes a waiting target like any other key of it. */
  private typeEnter(): boolean {
    this.onChar({ ch: ENTER, code: 'Enter', shift: false, shiftCode: null, time: performance.now() });
    return true;
  }

  private onChar(c: TypedChar): void {
    if (this.free) return this.freeChar(c, this.free);
    if (!this.started || this.paused || this.finished || this.pawWords) return;
    // A space between targets is a habit, not a mistake.
    if (c.ch === SPACE && !this.core.locked) return;
    this.deadPending = false;
    const res = this.core.type(c.ch);
    if (res.kind === 'ignored') return this.say(t('level.memoryWait'), 2);
    this.pressed++;
    const p = app.profile!;
    this.keyAt = this.elapsed;
    if (res.kind === 'wrong') {
      const { rt } = this.rhythm.press(null, c.time);
      if (res.expected) {
        recordPress(p, res.expected, c.ch, rt);
        this.errors++;
        this.trackWrong(res.expected);
      }
      this.sfx(this.mode.wrongSfx);
      this.setMood('thinking', 1.2);
      this.setRobotMood('worried', 1);
      this.setFairyMood('curious', 1);
      this.mode.onWrong(res.target);
    } else {
      const { rt, repeat } = this.rhythm.press(res.expected, c.time);
      recordPress(p, res.expected, c.ch, rt, repeat);
      this.checkShiftHand(res.expected, c.shiftCode);
      this.chars++;
      this.wrongStreak.n = 0;
      if (res.kind === 'done') {
        this.sfx('word');
        this.targetTyped(res.target);
        this.wordStreak++;
        this.setMood('happy', 1.4);
        this.setRobotMood('happy', 1.2);
        this.setFairyMood('happy', 1.2);
        this.mode.onDone(res.target);
        this.cheer();
        if (this.pawsAllowed && this.wordStreak % PAW_STREAK === 0) this.chargePaw();
      } else {
        this.sfx('key');
        this.mode.onCorrect(res.target);
      }
    }
    this.updateGuide();
  }

  // ---- free typing ----------------------------------------------------------------

  /** Keys reach free typing only while it plays and no dialog (the place picker) is open. */
  private get freeOpen(): boolean {
    return this.started && !this.paused && !document.querySelector('.modal-back');
  }

  /**
   * Free typing has no task, so nothing it types counts in the statistics (Tapko says so at the
   * start); keys the layout does not type are ignored.
   */
  private freeChar(c: TypedChar, mode: FreeTypeMode): void {
    if (!this.freeOpen || !stepsFor(layout(), c.ch).length) return;
    this.deadPending = false;
    this.sfx('key');
    mode.key(c.ch);
    this.updateGuide();
  }

  private freeErase(): void {
    if (this.freeOpen) this.free!.erase();
  }

  /** Enter shows the collected text at once; a focused button keeps its Enter while a dialog is open. */
  private freeSend(): boolean {
    if (!this.freeOpen) return false;
    this.free!.send();
    return true;
  }

  /** Free typing: the text shown is said when reading aloud is on and the parent allows typed words to be read. */
  speakTyped(text: string): void {
    if (this.saidEl) this.saidEl.textContent = text;
    const p = app.profile!;
    if (this.reading && p.settings.speakTyped) speech.say(text, locale());
  }

  /** Once per level: a capital typed with the Shift of its own hand gets a short tip. */
  private checkShiftHand(ch: string, shiftCode: string | null): void {
    const need = shiftKeyOf(layout(), ch);
    if (!need || !shiftCode || this.shiftTipShown) return;
    if (shiftCode === (need === SHIFT_L ? 'ShiftLeft' : 'ShiftRight')) return;
    this.shiftTipShown = true;
    this.say(t('level.shiftOtherHand'), 4);
  }

  private shiftTipShown = false;

  private trackWrong(expected: string): void {
    this.wordStreak = 0;
    if (this.wrongStreak.ch === expected) this.wrongStreak.n++;
    else this.wrongStreak = { ch: expected, n: 1 };
    if (this.wrongStreak.n === 2) this.say(pickLine(this.fairy ? 'fairy.mistake' : 'tapko.mistake'), 2);
    if (this.wrongStreak.n === 3) this.showHint(expected);
  }

  private cheer(): void {
    const now = this.elapsed;
    if (this.wordStreak > 0 && this.wordStreak % 5 === 0 && now - this.lastCheer > 12) {
      this.lastCheer = now;
      const p = app.profile!;
      this.say(pickLine('tapko.correct_streak', { name: nickname(p) }, p.customMessages), 3);
    }
  }

  /** After three misses of one key the narrator says which key and finger it is. */
  private showHint(ch: string): void {
    const finger = fingerFor(layout(), ch);
    const fingerName = finger != null ? t(`fingers.${FINGER_KEYS[finger]}`) : '';
    this.say(pickLine('tapko.hint', { key: keyLabel(ch), finger: fingerName }), 5);
  }

  /** The guide lights the next key only when the child can see it: a hidden target keeps it secret. */
  updateGuide(): void {
    const ch = this.core.shownChar();
    const p = app.profile!;
    let fade = 0;
    if (ch && p.settings.guide === 'auto') {
      const stat = p.stats.keys[ch.toLowerCase()];
      fade = masteryLevel(stat, p.settings.difficulty) >= 1 ? 0.5 : 0;
    }
    this.guide.show(ch, this.deadPending && stepsFor(layout(), ch ?? '').length > 1, fade);
  }

  private toggleGuide(): void {
    this.guideOn = !this.guideOn;
    this.guide.setVisible(this.guideOn);
    this.stage.resize();
  }

  // ---- reading aloud -----------------------------------------------------------

  private readBtn: HTMLButtonElement;
  private offVoices: () => void;
  /** The target read last, so each one is read once, when it becomes the focus. */
  private readId = 0;

  private get reading(): boolean {
    const p = app.profile!;
    return p.settings.readAloud && speech.available(locale());
  }

  /** The run has dictated targets. */
  private get dictating(): boolean {
    return this.style === 'dictation' || this.style === 'mixed';
  }

  /** The button shows only when the browser has a voice of the profile's language; in a dictation the voice is the task. */
  private paintRead(): void {
    const p = app.profile!;
    this.readBtn.hidden = this.dictating || !speech.available(locale()) || (this.def.kind === 'freetype' && !p.settings.speakTyped);
    this.readBtn.setAttribute('aria-pressed', String(p.settings.readAloud));
  }

  private toggleRead(): void {
    const p = app.profile!;
    p.settings.readAloud = !p.settings.readAloud;
    saveProfile();
    this.paintRead();
    this.readId = 0;
    if (!p.settings.readAloud) speech.stop();
    else this.readFocus();
  }

  private readFocus(): void {
    const tg = this.core.focus();
    if (!tg || this.pawWords || !this.started || this.paused) return;
    if (tg.id !== this.readId) {
      this.readId = tg.id;
      if (tg.style === 'dictation') this.dictate(tg, false);
      else if (this.reading && !this.dictating) speech.say(spoken(tg), locale());
    } else if (tg.style === 'dictation' && tg.masked && !this.repeated && this.elapsed - Math.max(this.spokenAt, this.keyAt) >= DICTATION_REPEAT) {
      this.dictate(tg, true);
    }
  }

  /** Level time of the child's last counted key, and of the last dictated target said; it is said again once by itself. */
  private keyAt = 0;
  private spokenAt = 0;
  private repeated = false;

  /** Says a dictated target; a repeat cuts what is still being said. */
  private dictate(tg: Target, repeat: boolean): void {
    if (repeat) speech.stop();
    speech.say(spoken(tg), locale());
    this.spokenAt = this.elapsed;
    this.repeated = repeat;
    this.setFairyMood('singing', 1.4);
  }

  /** A click or tap on a dictated target's label says it again. */
  private onStageClick(e: PointerEvent): void {
    if (!this.dictating || !this.started || this.paused || this.finished) return;
    const r = this.stage.canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) / this.stage.scale, y = (e.clientY - r.top) / this.stage.scale;
    const hit = this.labelRects.find((b) => x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1);
    const tg = hit && this.core.active.find((a) => a.id === hit.id);
    if (tg?.style === 'dictation') this.dictate(tg, true);
  }

  // ---- Tapko --------------------------------------------------------------------

  /**
   * The narrator's line in the bubble; only screen readers hear it, the voice reads the targets alone.
   * It stays long enough to read (`seconds` is a minimum) and a line still shown is not replaced.
   */
  say(text: string, seconds = 0): void {
    if (this.bubbleTimer > 0) return;
    this.bubble.replaceChildren(h('p', {}, text));
    this.bubble.classList.remove('hidden');
    this.bubbleTimer = Math.max(seconds, sayTime(text));
  }

  hideBubble(): void {
    this.bubble.classList.add('hidden');
    this.bubbleTimer = 0;
  }

  setMood(mood: Mood, seconds: number): void {
    this.tapkoMood = mood;
    renderTapkoInto(this.tapko, app.profile!.companion, mood);
    this.tapko.classList.remove('jump');
    if (mood === 'happy' && !this.reduceMotion) {
      void this.tapko.offsetWidth;
      this.tapko.classList.add('jump');
    }
    this.moodTimer = seconds;
  }

  // ---- Bolt --------------------------------------------------------------------

  setRobotMood(mood: RobotMood, seconds: number): void {
    this.robotMood = mood;
    this.robotMoodT = seconds;
  }

  /** Melody looks curious, sings, or hops once (happy). */
  setFairyMood(mood: FairyMood, seconds: number): void {
    this.fairyMood = mood;
    this.fairyMoodT = seconds;
    if (mood === 'happy' && !this.reduceMotion) this.fairyHop = FAIRY_HOP;
  }

  /** A short text pops up over the scene at (x, y) and fades. */
  shout(text: string, x: number, y: number): void {
    this.shouts.push({ text, x, y, age: 0 });
  }

  /**
   * A speech bubble in the scene, centered at (x, y) (or with its right edge there) and its tail toward
   * (tx, ty), for `seconds`; a new line of the same speaker replaces the old one. Screen readers hear it;
   * the voice does not read it.
   */
  speak(who: string, text: string, x: number, y: number, tx: number, ty: number, seconds: number, right = false): void {
    this.speeches = this.speeches.filter((s) => s.who !== who);
    this.speeches.push({ who, right, text, x, y, tx, ty, age: 0, life: seconds, dy: 0 });
    if (this.saidEl) this.saidEl.textContent = text;
  }

  /** The speaker's bubble is still up (and has been up less than `within` seconds). */
  speaking(who: string, within = Infinity): boolean {
    return this.speeches.some((s) => s.who === who && s.age < within);
  }

  /** Someone is glad: a cheer ("Hurá!") pops up above Tapko, or at `at`, with the cheer sound; returns the cheer. */
  hooray(at = this.mode.heroSpot()): string {
    const text = pickLine('story.cheer');
    this.sfx('cheer');
    this.shout(text, at.x, at.y);
    return text;
  }

  /** A speech bubble pops in and fades out; it moves up or down while it would cover a word label. */
  private drawSpeech(g: G, s: Speech): void {
    const lay = (s.lay ??= speechLayout(g, s.text, SPEECH_W));
    const x = Math.min(this.vw - lay.w / 2 - 8, Math.max(lay.w / 2 + 8, s.right ? s.x - lay.w / 2 : s.x));
    const box = (dy: number) => ({ x0: x - lay.w / 2 - LABEL_GAP, x1: x + lay.w / 2 + LABEL_GAP, y0: s.y + dy - lay.h / 2 - LABEL_GAP, y1: s.y + dy + lay.h / 2 + LABEL_GAP });
    const clear = (dy: number) => {
      const b = box(dy);
      return b.y0 >= 0 && b.y1 <= VH && this.labelRects.every((r) => r.x1 <= b.x0 || r.x0 >= b.x1 || r.y1 <= b.y0 || r.y0 >= b.y1);
    };
    if (!clear(s.dy)) s.dy = Array.from({ length: SPEECH_ROOM / 4 }, (_, i) => (i % 2 ? -1 : 1) * Math.ceil((i + 1) / 2) * 8).find(clear) ?? s.dy;
    if (import.meta.env.MODE === 'e2e') speechLog(box(s.dy), this.labelRects);
    const fade = Math.max(0, Math.min(1, (s.life - s.age) / 0.25));
    const pop = this.reduceMotion ? 1 : ease.outBack(Math.min(1, s.age / 0.25));
    drawSpeech(g, lay, x, s.y + s.dy, s.tx, s.ty, fade, pop);
  }

  private drawShout(g: G, s: Shout): void {
    const k = ease.outBack(Math.min(1, s.age / 0.35));
    g.save();
    g.globalAlpha = Math.max(0, Math.min(1, (SHOUT_TIME - s.age) / 0.3));
    g.font = `800 58px ${fontFamily()}`;
    const half = g.measureText(s.text).width / 2 + 8;
    g.translate(Math.min(this.vw - half, Math.max(half, s.x)), Math.max(50, s.y - s.age * 12));
    g.scale(k, k);
    g.rotate(-0.06);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = 8;
    g.strokeStyle = '#5a3d2b';
    g.strokeText(s.text, 0, 0);
    g.fillStyle = '#ffd25a';
    g.fillText(s.text, 0, 0);
    g.restore();
  }

  /** The story friend's feet (Bolt, Melody below where she floats): where the mode puts them, else next to Tapko. */
  friendSpot(): { x: number; y: number } {
    return this.mode.friendSpot() ?? { x: BOLT_CSS_X / this.stage.scale, y: VH - 6 };
  }

  /** Bolt on the canvas, under the mode's objects; he hops with Tapko at the end. */
  private drawBolt(g: G): void {
    const { x, y } = this.friendSpot();
    if (this.endTime == null) return drawRobot(g, this.robot!, this.robotMood, x, y, BOLT_SIZE, this.mode.t);
    drawRobot(g, this.robot!, 'happy', x, y - Math.sin(this.endHop * Math.PI) * 24, BOLT_SIZE, this.mode.t);
  }

  /** Melody floats above the friend's spot, under the mode's objects; she hops at a word and at the end. */
  private drawMelody(g: G): void {
    const { x, y } = this.friendSpot();
    const hop = this.endTime == null ? (this.fairyHop > 0 ? 1 - this.fairyHop / FAIRY_HOP : 0) : this.endHop;
    drawFairy(g, this.endTime == null ? this.fairyMood : 'happy', x, y - FAIRY_FLOAT, FAIRY_SIZE, this.mode.t, hop);
  }

  // ---- paw help ------------------------------------------------------------------

  private renderPawBtn(): void {
    if (!this.pawBtn) return;
    const p = app.profile!;
    const { pawHelp } = p.progress;
    this.pawBtn.classList.toggle('empty', pawHelp === 0);
    this.pawBtn.dataset.charged = String(pawHelp);
    this.pawBtn.setAttribute('aria-label', t('paw.aria', { n: pawHelp }));
    paintRound(this.pawBtn, 'paw', pawRing(pawHelp, PAW_MAX));
  }

  /** A mistake-free streak charges one paw help. */
  private chargePaw(): void {
    const p = app.profile!;
    if (p.progress.pawHelp >= PAW_MAX) return;
    p.progress.pawHelp++;
    saveProfile();
    this.say(t('paw.charged', { n: PAW_STREAK, words: PAW_WORDS }), 4);
    this.renderPawBtn();
    this.pawBtn?.classList.remove('charged');
    void this.pawBtn?.offsetWidth;
    this.pawBtn?.classList.add('charged');
  }

  /** The paws replace the hands and type the closest words for the child. */
  private startPaws(): boolean {
    const p = app.profile!;
    if (!this.pawsAllowed || !this.started || this.paused || this.finished || this.pawWords) return false;
    if (p.progress.pawHelp <= 0 || !this.core.focus()) return false;
    p.progress.pawHelp--;
    saveProfile();
    this.pawWords = PAW_WORDS;
    this.pawTimer = this.reduceMotion ? 0.2 : 0.6;
    this.pawIdle = 0;
    this.guideBeforePaws = this.guideOn;
    if (!this.guideOn) this.toggleGuide();
    this.guide.setPaws(pawColors(p.companion.kind));
    this.say(t('paw.start'), 2.5);
    this.setMood('happy', 1.4);
    this.renderPawBtn();
    return true;
  }

  private stopPaws(): void {
    this.pawWords = 0;
    this.renderPawBtn();
    this.guide.setPaws(null);
    if (this.guideOn !== this.guideBeforePaws) this.toggleGuide();
    // The child's next reaction time starts now, not with the paw's last key.
    this.rhythm.ready(performance.now());
    this.updateGuide();
  }

  /** One key at a time, with Tapko's rhythm; none of it counts in the child's statistics. */
  private tapkoTypes(dt: number): void {
    if ((this.pawTimer -= dt) > 0) return;
    const tg = this.core.focus();
    if (!tg) {
      // Wait a moment for the next word; stop when none comes.
      this.pawTimer = 0.2;
      if ((this.pawIdle += 0.2) > 4) this.stopPaws();
      return;
    }
    this.pawIdle = 0;
    const ch = tg.word[tg.typed];
    if (tg.masked) this.core.reveal(tg);
    this.core.locked = tg;
    const res = this.core.type(ch);
    this.guide.pawTap(ch);
    if (res.kind === 'done') {
      this.sfx('word');
      this.mode.onDone(tg);
      this.pawTimer = 0.4;
      if (--this.pawWords === 0) this.stopPaws();
    } else {
      this.sfx('key');
      this.mode.onCorrect(tg);
      this.pawTimer = 0.13;
    }
    this.updateGuide();
  }

  // ---- pause -------------------------------------------------------------------

  pause(): void {
    if (this.paused || this.finished || !this.started) return;
    this.paused = true;
    speech.stop();
    // A small card at the top: the words and the guide's next key stay in sight.
    const slower = button(t('level.slower'), () => this.slowDown(), 'btn');
    slower.disabled = this.difficulty <= 1;
    this.pauseEl = h('div', { class: 'card pause-card', role: 'dialog', 'aria-label': t('level.paused') },
      h('h2', {}, t('level.paused')),
      h('div', { class: 'row' },
        button(t(this.ending.keep), () => this.resume(), 'btn primary', 'play'),
        slower,
        button(t('help.title'), () => this.openHelp(), 'btn', 'help'),
        button(t(this.ending.label), () => void this.leave(), 'btn', 'close')));
    this.el.querySelector('.stage-wrap')!.append(this.pauseEl);
    this.focusPause();
  }

  /** Continue on the pause card. */
  private focusPause(): void {
    (this.pauseEl?.querySelector('button') as HTMLButtonElement | null)?.focus();
  }

  /** What leaving and going on are called, and what the question says is lost: a story level, an exercise or a rescue mission. */
  private get ending(): { label: string; keep: string; text: string } {
    if (this.def.kind === 'freetype') return { label: 'level.leave', keep: 'level.keepTyping', text: '' };
    if (this.def.kind === 'practice' || this.def.kind === 'aim' || this.opts.stay) return { label: 'level.endPractice', keep: 'level.keepPractice', text: 'level.endPracticeText' };
    if (this.def.rescue) return { label: 'level.endRescue', keep: 'level.keepRescue', text: 'level.endRescueText' };
    return { label: 'level.endLevel', keep: 'level.keepLevel', text: 'level.endLevelText' };
  }

  /**
   * Leaving from the pause card; after a key of this level it asks first, Continue being the safe choice.
   * Staying a while loses nothing: it ends like with Esc.
   */
  private async leave(): Promise<void> {
    if (this.opts.stay) {
      this.resume();
      return this.endPractice();
    }
    if (this.pressed && !this.free) {
      const yes = await confirmDialog({ title: t('level.endAsk'), text: t(this.ending.text), ok: t(this.ending.label), cancel: t(this.ending.keep) });
      if (!yes || this.disposed) return;
    }
    this.exit();
  }

  /**
   * The "?" button, F1 and Help on the pause card: the level pauses and the help page opens
   * over it, with what this level asks and a tip first. A dialog over the level closes.
   */
  private openHelp(): void {
    if (!this.started || this.finished) return;
    closeModals();
    this.pause();
    if (!this.pauseEl) return;
    const intro = this.mode.intro();
    const tip = pickTip(app.profile!, this.style)?.text;
    this.opts.onHelp(() => this.focusPause(), [intro, tip].filter((x): x is string => !!x).map((x) => h('p', {}, x)));
  }

  /** One step lower difficulty from now on; automatic growth may raise it again after accurate play. */
  private slowDown(): void {
    const p = app.profile!;
    this.difficulty = this.core.difficulty = Math.max(1, this.difficulty - 1);
    p.settings.difficulty = this.difficulty;
    p.progress.growthSeconds = 0;
    saveProfile();
    this.resume();
    this.say(t('level.slowerSaid'), 3);
  }

  resume(): void {
    if (!this.paused || !this.pauseEl) return;
    this.pauseEl.remove();
    this.pauseEl = null;
    this.paused = false;
    this.rhythm.ready(performance.now());
    // The pause cut the voice: a dictated target is said again.
    if (this.dictating) this.readId = 0;
  }

  private exit(): void {
    speech.stop();
    this.flushSession();
    this.opts.onExit();
  }

  private onVisibility(): void {
    if (document.hidden) this.pause();
  }

  private onTouch(e: PointerEvent): void {
    if (e.pointerType !== 'touch' || this.hadKeydown || document.querySelector('.touch-notice')) return;
    void showCard(this.el, h('div', { class: 'touch-notice' }, h('h2', {}, t('touch.title')), h('p', {}, t('touch.text'))), { button: t('common.ok') });
  }

  // ---- loop --------------------------------------------------------------------

  private update(dt: number): void {
    if (this.paused || !this.started) {
      this.tweens.update(this.paused ? 0 : dt);
      return;
    }
    this.elapsed += dt;
    if (!this.finished) {
      app.sessionSeconds += dt;
      this.played += dt;
    }
    this.core.update(dt);
    this.tweens.update(dt);
    this.particles.update(dt);
    const hadFocus = !!this.core.focus();
    if (this.minActive) this.count = grownCount(this.count, this.mode.progress() * this.count, this.played, Math.max(3, this.maxActive + 1), this.minActive);
    this.mode.t += dt;
    this.mode.update(dt);
    if (!hadFocus && this.core.focus()) this.rhythm.ready(performance.now());
    this.trackPace();
    if (this.pawWords) this.tapkoTypes(dt);
    this.readFocus();
    // Free typing and staying a while have no end on their own: the bubble says when a break is due.
    if ((this.free || this.opts.stay) && !this.breakSaid && app.sessionSeconds >= app.profile!.settings.sessionMinutes * 60) {
      this.breakSaid = true;
      this.say(pickLine('tapko.break'), 6);
    }
    // A line hidden behind a target waits for a free spot instead of running out.
    if (this.bubbleTimer > 0 && !this.bubble.classList.contains('covered') && (this.bubbleTimer -= dt) <= 0) this.hideBubble();
    if (this.moodTimer > 0 && (this.moodTimer -= dt) <= 0) {
      this.tapkoMood = 'idle';
      renderTapkoInto(this.tapko, app.profile!.companion, 'idle');
    }
    if (this.robotMoodT > 0 && (this.robotMoodT -= dt) <= 0) this.robotMood = 'idle';
    if (this.fairyMoodT > 0 && (this.fairyMoodT -= dt) <= 0) this.fairyMood = 'idle';
    this.fairyHop = Math.max(0, this.fairyHop - dt);
    for (const s of this.shouts) s.age += dt;
    this.shouts = this.shouts.filter((s) => s.age < SHOUT_TIME);
    for (const s of this.speeches) s.age += dt;
    this.speeches = this.speeches.filter((s) => s.age < s.life);
    const pct = Math.round(shownProgress(this.mode.progress(), this.played, this.minActive) * 100);
    if (pct !== this.progressPct) {
      this.progressPct = pct;
      this.progressFill.style.width = `${pct}%`;
    }
    this.gauge.set(this.rhythm.ratio(this.difficulty));
    if ((this.gaugeLabelIn -= dt) <= 0) {
      this.gaugeLabelIn = 1;
      this.gauge.label(t('level.rhythm', { n: this.rhythm.cpm }));
      this.paintAccuracy();
    }
    this.rhythm.idle(dt, performance.now());
    if (this.core.shownChar() !== this.lastExpected) {
      this.lastExpected = this.core.shownChar();
      this.updateGuide();
    }
    if (!this.finished && levelOver(this.mode.finished, this.played, this.minActive)) this.finish();
  }

  private lastExpected: string | null = null;
  private progressPct = -1;

  private render(): void {
    // A paused level does not move: the last frame stays unless a resize cleared it.
    if (this.paused && !this.stage.dirty) return;
    const g = this.stage.begin();
    drawBackground(g, this.backdrop, this.stage.vw, this.mode.scroll, !this.reduceMotion);
    if (this.robot) this.drawBolt(g);
    if (this.fairy) this.drawMelody(g);
    this.labels = [];
    this.labelRects = [];
    this.mode.render(g);
    this.drawLabels(g);
    this.particles.render(g);
    for (const s of this.speeches) this.drawSpeech(g, s);
    for (const s of this.shouts) this.drawShout(g, s);
    this.mode.renderFront(this.stage.beginFront());
    this.placeBubble();
  }

  private labels: PendingLabel[] = [];
  /** Where this frame's labels were drawn, in stage units. */
  private labelRects: Rect[] = [];
  /** Vertical shift of each target's label, smoothed over frames. */
  private labelShift = new Map<number, number>();
  private labelTime = 0;

  /**
   * Word label above a target (helper for modes); drawn after the mode, so labels never overlap.
   * A word the child sees can be typed at once, so a target not selectable yet gets no label.
   */
  label(_g: G, tg: Target, x: number, y: number, size = 40): void {
    if (tg.selectable) this.labels.push({ tg, x, y, size });
  }

  /**
   * The locked and most urgent labels keep their place; each later one moves up (down
   * near the top) until it is clear of the placed ones. Far moves get a line to the object.
   */
  private drawLabels(g: G): void {
    const now = performance.now();
    const dt = this.labelTime ? Math.min(0.1, (now - this.labelTime) / 1000) : 0;
    this.labelTime = now;
    // 0.25 of the way per frame at 60 Hz, the same at any frame rate.
    const follow = 1 - Math.pow(0.75, dt * 60);
    const rank = (l: PendingLabel) => (this.core.locked === l.tg ? Infinity : l.tg.urgency);
    const placed: Rect[] = [];
    const shifts = new Map<number, number>();
    const icon = this.style !== 'copy';
    for (const l of [...this.labels].sort((a, b) => rank(b) - rank(a))) {
      // Phrases shrink to fit: in calm modes the stage around their place, moving targets half of it.
      const room = this.mode.phraseWords > 2 ? Math.min(this.vw * 0.9, 2 * Math.min(l.x, this.vw - l.x) - 20) : this.vw * 0.5;
      const full = wordBox(g, l.tg.word, l.size, icon).w;
      if (full > room) l.size = Math.max(LABEL_MIN_SIZE, Math.min(l.size, l.size * room / full));
      const { w, h } = wordBox(g, l.tg.word, l.size, icon);
      const x0 = l.x - w / 2 - LABEL_GAP, x1 = l.x + w / 2 + LABEL_GAP;
      const clear = (dy: number) => placed.every((b) => x1 <= b.x0 || x0 >= b.x1 || l.y + dy + h / 2 + LABEL_GAP <= b.y0 || l.y + dy - h / 2 - LABEL_GAP >= b.y1);
      let want = 0;
      if (!clear(0)) {
        const up = Array.from({ length: Math.max(0, Math.floor((l.y - h / 2) / 4)) }, (_, i) => -(i + 1) * 4).find(clear);
        want = up ?? Array.from({ length: Math.max(0, Math.floor((VH - l.y - h / 2) / 4)) }, (_, i) => (i + 1) * 4).find(clear) ?? 0;
      }
      placed.push({ x0: x0 + LABEL_GAP, x1: x1 - LABEL_GAP, y0: l.y + want - h / 2, y1: l.y + want + h / 2 });
      const prev = this.labelShift.get(l.tg.id);
      const shift = prev == null ? want : prev + (want - prev) * follow;
      shifts.set(l.tg.id, shift);
      this.labelRects.push({ id: l.tg.id, x0: l.x - w / 2, x1: l.x + w / 2, y0: l.y + shift - h / 2, y1: l.y + shift + h / 2 });
      if (Math.abs(shift) > LABEL_LINE_FROM) {
        g.save();
        g.strokeStyle = 'rgba(255,253,246,0.7)';
        g.lineWidth = 2;
        g.setLineDash([4, 5]);
        g.beginPath();
        g.moveTo(l.x, l.y + shift + (shift < 0 ? h / 2 : -h / 2));
        g.lineTo(l.x, l.y);
        g.stroke();
        g.restore();
      }
      drawWord(g, l.tg.word, l.tg.typed, l.x, l.y + shift, l.tg.wobble, {
        size: l.size,
        highContrast: this.highContrast,
        locked: this.core.locked === l.tg,
        masked: !this.core.letters(l.tg),
        icon: l.tg.style === 'dictation' ? { kind: 'speaker' } : l.tg.style === 'memory' ? { kind: 'ring', left: l.tg.showFor ? l.tg.showLeft / l.tg.showFor : 0 } : undefined,
      });
    }
    this.labelShift = shifts;
  }

  /** The word is the task, so the narrator's bubble never covers one: over a label it hides until its spot is free. */
  private placeBubble(): void {
    const b = this.bubble;
    if (b.classList.contains('hidden')) return;
    const s = this.stage.scale;
    // The tail's tip (40 px + half of its 16 px from the left, 8 px below) points to the mode's spot.
    const at = this.mode.bubbleSpot();
    if (at) {
      b.style.left = `${Math.max(8, at.x * s - 48)}px`;
      b.style.top = `${Math.max(8, at.y * s - b.offsetHeight - 8)}px`;
    }
    const covers = () => {
      const x0 = b.offsetLeft / s - LABEL_GAP, x1 = (b.offsetLeft + b.offsetWidth) / s + LABEL_GAP;
      const y0 = b.offsetTop / s - LABEL_GAP, y1 = (b.offsetTop + b.offsetHeight) / s + LABEL_GAP;
      return this.labelRects.some((r) => r.x0 < x1 && r.x1 > x0 && r.y0 < y1 && r.y1 > y0);
    };
    b.classList.toggle('covered', covers());
  }

  // ---- end ---------------------------------------------------------------------

  private flushSession(): void {
    const p = app.profile!;
    if (this.chars + this.errors > 0) recordSession(p, this.elapsed, this.chars, this.errors, this.rhythm.cpm);
    this.elapsed = 0;
    this.chars = 0;
    this.errors = 0;
    saveProfile();
  }

  private finish(): void {
    this.finished = true;
    this.mode.onFinish();
    if (this.pawWords) this.stopPaws();
    this.input?.dispose();
    this.input = null;
    this.guide.show(null);
    const p = app.profile!;
    const total = this.chars + this.errors;
    const accuracy = total ? this.chars / total : 1;
    const seconds = this.elapsed;
    const cpm = this.rhythm.cpm;
    const chars = this.chars, errors = this.errors;
    // Targets the paw typed count neither way.
    const resolved = this.typedTargets + this.core.missed;
    const typedShare = resolved ? this.typedTargets / resolved : 1;
    const clean = this.cleanTargets;
    this.flushSession();
    const noStars = this.opts.stay || this.def.kind === 'aim';
    if ((noStars || this.def.kind === 'practice' && !this.def.count) && total === 0) {
      this.opts.onFinish(null);
      return;
    }
    const stats = { accuracy, chars, errors, cpm, seconds };
    const result = noStars ? completeStay(p, stats, typedShare) : completeLevel(p, this.def, stats, typedShare);
    if (this.style !== 'copy') result.byStyle = { style: this.style, clean, total: resolved };
    saveProfile();
    this.sfx('reward');
    this.celebrate();
    // Leaving during the celebration (back button, map) must not open the results.
    setTimeout(() => { if (!this.disposed) this.opts.onFinish(result); }, RESULTS_AFTER * 1000);
  }

  private endAt = 0;

  /** Seconds since the level ended, null while it runs. */
  get endTime(): number | null {
    return this.endAt ? (performance.now() - this.endAt) / 1000 : null;
  }

  /** Phase 0..1 of the current end hop, 0 when there is none (and always with reduced motion); canvas heroes and Bolt read it. */
  get endHop(): number {
    const e = this.endTime;
    if (e == null || this.reduceMotion || e >= HOPS * HOP_TIME) return 0;
    return (e % HOP_TIME) / HOP_TIME;
  }

  /** Opacity of the tool Tapko holds in the mode: it fades out at the end, at once with reduced motion. */
  get toolAlpha(): number {
    const e = this.endTime;
    if (e == null) return 1;
    return this.reduceMotion ? 0 : Math.max(0, 1 - e / TOOL_FADE);
  }

  /** Tapko stays in place and hops happily before the results card; just the happy face with reduced motion. */
  private celebrate(): void {
    this.endAt = performance.now();
    // Melody thanks the child; a super-obstacle has said its own line.
    if (this.fairy && !this.def.isSuper) this.say(pickLine('fairy.done'), RESULTS_AFTER);
    else this.hideBubble();
    // A beaten super-obstacle finishes the world: Tapko cheers, unless the mode's last cheer is still up.
    if (this.def.isSuper && !this.shouts.length) this.hooray();
    this.moodTimer = 0;
    this.tapkoMood = 'happy';
    renderTapkoInto(this.tapko, app.profile!.companion, 'happy');
    this.tapko.classList.remove('jump');
    if (!this.reduceMotion) {
      void this.tapko.offsetWidth;
      this.tapko.classList.add('celebrate');
    }
  }

  /** Ends an untimed practice or staying a while on request. */
  endPractice(): void {
    if (!this.finished) this.finish();
  }
}
