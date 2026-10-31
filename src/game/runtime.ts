import { app, isBreakDue, layout, pickLine, reduceMotion, saveProfile } from '../app/app';
import { fast } from '../app/fast';
import { audio, type Sfx } from '../audio/audio';
import { speech } from '../audio/speech';
import { FrameWatch, graphics, markSlowDevice } from '../engine/graphics';
import { Loop, Stage } from '../engine/loop';
import { Particles } from '../engine/particles';
import { Rng } from '../engine/rng';
import { Tweens } from '../engine/tween';
import { drawBackground, type G } from '../gfx/draw';
import { type Mood, tapkoPictures } from '../gfx/tapko';
import { friendPictures, picturesReady, preload } from '../gfx/assets';
import { locale, t } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { type InputHandlers, KeyInput, type TypedChar } from '../input/input';
import { setShortcuts, withKey } from '../input/shortcuts';
import { ENTER, LAYOUTS, LayoutMismatchDetector, enterAfter, fingerFor, stepsFor } from '../keyboard/layouts';
import { SHIFT_L, SPACE, activeKeys, aimKeys, isKeyReady, masteryLevel, recentAccuracy, shiftKeyOf, useLayout } from '../learning/lessons';
import { recentTyping, recordPress, recordSession, typingStep } from '../learning/stats';
import { FINGER_KEYS, KeyboardGuide, keyLabel } from '../ui/keyboard-guide';
import { LayoutSwitch } from '../ui/layout-switch';
import { closeModals, confirmDialog, h } from '../ui/dom';
import { globalButtons } from '../ui/chrome';
import { tip } from '../ui/tooltip';
import { accuracyPic, placeRing, rhythmPic, roundButton, worldName } from '../ui/hud';
import type { WordSource } from '../words/words';
import { SUPER_ID, type Surprise } from '../storage/schema';
import type { LevelDef } from './levels';
import { LEVELS, WORLDS, grownCount, hasMinLength, journeyProgress, levelOver, minActiveS, playedStep, shownProgress } from './levels';
import { type Mode, driftOffset } from './mode';
import { ENTER_MAX, EnterMarks } from './enter';
import type { ModeMaker } from './modes';
import type { FreeTypeMode } from './modes/freetype';
import { PressureValve, childPace, perChar } from './pace';
import { GAUGE_DAYS, Rhythm, gaugeTop } from './rhythm';
import { completeLevel, completeStay, joinRuns } from './progress';
import { type Style, type Target, TypingCore } from './typing';
import { giveUpJourney, pickTip, showCard, showJourneyPanel, showPosture } from './cards';
import { surpriseFor } from './own-content';
import { Callouts } from './runtime/callouts';
import { Friends } from './runtime/friends';
import { keyCards } from './runtime/key-cards';
import { Labels } from './runtime/labels';
import { type RuntimeOptions, wordSource } from './runtime/options';
import { type Ending, PauseCard, endingOf } from './runtime/pause';
import { Paws } from './runtime/paws';
import { Reading } from './runtime/reading';
import { LevelState } from './runtime/state';
import { SuperHelp } from './runtime/super-helper';
import { StageTapko } from './runtime/tapko';

/** Seconds every target gets to be read. */
const READ_TIME = 3;
/** Extra seconds a target with a capital letter gets (the Shift chord is hard). */
const CAPITAL_EXTRA = 1.5;
/** Travel time of dictated and remembered targets: hearing or recalling a target takes longer. */
const STYLE_PACE: Record<Style, number> = { copy: 1, dictation: 1.5, memory: 1.8, mixed: 1.8 };
/** The end of a level: Tapko hops HOPS times of HOP_TIME seconds, his tool fades in TOOL_FADE, then the results open. */
const HOPS = 3;
const HOP_TIME = 0.4;
const TOOL_FADE = 0.4;
const RESULTS_AFTER = 1.4;
/** Seconds a level waits at most for its own pictures: a stalled connection still opens it, with the fallbacks. */
const PICTURES_WAIT_S = 30;
/** Milliseconds after play begins in which Enter does nothing. */
const ENTER_GUARD_MS = 300;
/** A hero's journey plays a difficulty step above the profile's, its words a letter longer and its phrases up to three words (the planet's hard path). */
const JOURNEY_STEP = 1;
const DIFFICULTY_MAX = 10;
const JOURNEY_WORDS = 3;

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
  readonly friends: Friends;
  private labels = new Labels(this);
  private callouts = new Callouts(this);

  private loop: Loop;
  private input: KeyInput | null = null;
  private guide: KeyboardGuide;
  /** The on-screen keyboard is shown; the player keeps the choice for the next levels. */
  guideOn: boolean;
  private readonly state: LevelState;
  private readonly ending: Ending;
  private readonly pauseCard: PauseCard;
  private readonly paws: Paws | null = null;
  private readonly superHelp: SuperHelp | null = null;
  private readonly tapko: StageTapko;
  private progressFill: HTMLElement;
  private gauge = rhythmPic();
  /** Characters per second that fill the gauge's ring. */
  private readonly gaugeFull: number;
  /** Own practice and the target range: a ring of accuracy for each key in focus, before the rhythm. */
  private accuracyPics: { key: string; pic: ReturnType<typeof accuracyPic> }[] = [];
  /** Seconds until the gauge's spoken label may change again. */
  private gaugeLabelIn = 0;
  private guideBtn: HTMLButtonElement;
  /** Free typing's text shown above Tapko and the range's speech bubbles, for screen readers. */
  private saidEl: HTMLElement | null = null;
  private breakSaid = false;
  private deadPending = false;
  private mismatch: LayoutMismatchDetector;
  private layoutSwitch: LayoutSwitch;
  private mismatchShown = false;

  /** Keys the child pressed for a target in this level, right or wrong; leaving after one asks first. */
  private pressed = 0;
  /** Stats of this level. */
  chars = 0;
  errors = 0;
  /** Seconds of typing: each own key adds the time since the one before (`typingStep`); and the level time of the last one. */
  private typedSeconds = 0;
  private ownKeyAt = 0;
  /** Targets the level wants now: the planned count, more while the level is shorter than its minimum. */
  count: number;
  /** Seconds of active play (no pause, no card, no long wait over a word: `playedStep`) and the minimum before the level may end; 0 = no minimum. */
  private played = 0;
  private minActive: number;
  /** The child's rhythm; it also measures each press's reaction time. */
  readonly rhythm: Rhythm;
  private wrongStreak = { ch: '', n: 0 };
  private wordStreak = 0;
  private lastCheer = 0;
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

  constructor(root: HTMLElement, readonly def: LevelDef, makeMode: ModeMaker, private opts: RuntimeOptions) {
    const p = app.profile!;
    this.difficulty = this.core.difficulty = def.journey ? Math.min(DIFFICULTY_MAX, p.settings.difficulty + JOURNEY_STEP) : p.settings.difficulty;
    this.noPressure = p.settings.noTimePressure;
    this.style = opts.style ?? 'copy';
    this.highContrast = p.settings.highContrast;
    this.reduceMotion = reduceMotion();
    this.tweens.speed = this.reduceMotion ? 0.5 : 1;
    this.particles.enabled = !this.reduceMotion && !graphics.simple;
    const lastCpm = p.stats.sessions[p.stats.sessions.length - 1]?.cpm ?? 0;
    this.rhythm = new Rhythm(lastCpm, this.difficulty);
    this.gaugeFull = gaugeTop(recentTyping(p, GAUGE_DAYS).cpm, this.difficulty);
    this.lastCps = lastCpm ? lastCpm / 60 : 1;
    this.mismatch = new LayoutMismatchDetector(p.layout);

    const lay = LAYOUTS[p.layout];
    // Practice (the custom exercise, key drills, tasks) has its own word language; story levels use the player's.
    this.words = wordSource(p, def.kind === 'practice' ? p.settings.ownWordLang : p.settings.wordLang, opts.keys, opts.own, opts.chosen, def.focus, !!def.journey);
    // Enter comes with the right little finger's home key; drills, single letters and the gate's code stay without it.
    const enterOk = !opts.keys && !def.noSpace && def.kind !== 'freetype' && def.kind !== 'aim' && def.kind !== 'parrot' && (opts.chosen ?? activeKeys(p)).includes(enterAfter(lay));
    this.enter = enterOk ? new EnterMarks(() => this.rng.next(), def.kind === 'practice' ? null : ENTER_MAX) : null;
    this.surprise = opts.stay ? null : surpriseFor(p, def, !!opts.keys);
    this.count = def.count;
    // The e2e build may shorten the minimum (`?minActive=8`), so its tests finish levels in seconds.
    // Staying a while never reaches its minimum: the targets keep coming until Esc.
    this.minActive = opts.stay ? Infinity : !hasMinLength(def) ? 0 : import.meta.env.MODE === 'e2e' ? Number(new URLSearchParams(location.search).get('minActive') ?? 0) : fast(minActiveS(def));

    // DOM: HUD, stage, Tapko, bubble, guide.
    this.el = h('div', { class: `level-screen world-${WORLDS[def.world]}` });
    this.guide = new KeyboardGuide(lay);
    this.state = new LevelState(this.core, this.guide, this.el);
    this.friends = new Friends(this, def);
    if (this.friends.robot) this.el.dataset.bolt = this.friends.robot.look;
    if (this.friends.fairy) this.el.dataset.fairy = 'melody';
    this.progressFill = h('div', { class: 'progress-fill' });
    const title = def.kind === 'practice' ? t(def.phrases ? 'level.ownText' : 'level.practice') : def.kind === 'freetype' ? t('level.freeType') : def.kind === 'aim' ? t('aim.title') : def.kind === 'parrot' ? t('parrot.title') : def.journey ? t('journey.title') : worldName(def);
    // Hiding the guide is the switch: the crossed keyboard, with the orange ring while the guide is hidden.
    const guideBtn = this.guideBtn = roundButton('control', 'keyboardOff', t('level.guide'), () => this.toggleGuide());
    tip(guideBtn, withKey(t('level.guide'), 'F2'));
    if (p.settings.guideLocked) guideBtn.disabled = true;
    const helpBtn = roundButton('control', 'help', t('level.help'), () => this.openHelp());
    tip(helpBtn, withKey(t('level.help'), 'F1'));
    this.reading = new Reading(this.state, this, this.labels);
    // Free typing has nothing to pause: its X leaves.
    const pauseBtn = def.kind === 'freetype' ? roundButton('control', 'close', t('level.leave'), () => this.exit()) : roundButton('control', 'pause', t('level.pause'), () => (this.state.paused ? this.resume() : this.pause()));
    // After the end, while peeking under the results, the end card brings it back (see peekable).
    pauseBtn.classList.add('pause-btn');
    this.ending = endingOf(def, !!opts.stay);
    this.pauseCard = new PauseCard(this.state, {
      ending: this.ending, stay: !!opts.stay, next: opts.next,
      canSlowDown: () => this.difficulty > 1,
      resume: () => this.resume(),
      slowDown: () => this.slowDown(),
      leave: () => void this.leave(),
      onBreak: (back, play) => opts.onBreak(back, play),
    }, def.kind === 'freetype' ? null : pauseBtn);
    if (this.pawsAllowed) this.paws = new Paws(this.state, this);
    if (p.id === SUPER_ID && def.kind !== 'freetype') this.superHelp = new SuperHelp(this.state, { rng: this.rng, noPressure: this.noPressure, share: () => this.share(), type: (c) => this.onChar(c) });
    if (def.kind === 'practice' || def.kind === 'aim') this.accuracyPics = [...this.words.focus].map((key) => ({ key, pic: accuracyPic(key) }));
    this.paintAccuracy();
    const hud = h('div', { class: 'hud' },
      pauseBtn,
      this.paws?.btn,
      this.superHelp?.btn,
      def.kind === 'practice' || def.index < 0 ? null : placeRing(def),
      h('b', { class: 'hud-title' }, title),
      ...(def.kind === 'freetype' ? [] : [opts.stay ? null : h('div', { class: 'progress', tip: t('level.progress') }, this.progressFill), ...this.accuracyPics.map((a) => a.pic.el), def.kind === 'parrot' ? null : this.gauge.el]),
      h('span', { class: 'hud-divider', 'aria-hidden': 'true' }),
      guideBtn, this.reading.btn, ...globalButtons(helpBtn));
    const stageWrap = h('div', { class: 'stage-wrap' });
    this.tapko = new StageTapko(this.reduceMotion, () => {
      if (this.state.finished || !this.state.started) return;
      this.pause();
      this.opts.onTapko();
    });
    stageWrap.append(this.tapko.el, this.tapko.bubble);
    this.layoutSwitch = new LayoutSwitch(p.layout, (id) => {
      useLayout(p, id);
      saveProfile();
      this.opts.onLayout();
    });
    this.guide.el.append(this.layoutSwitch.el);
    this.guideOn = p.settings.guide !== 'off';
    this.guide.setVisible(this.guideOn);
    guideBtn.setAttribute('aria-pressed', String(!this.guideOn));
    this.el.append(hud, stageWrap, this.guide.el);
    root.append(this.el);

    this.stage = new Stage(stageWrap);
    this.reading.listen(this.stage.canvas);
    this.mode = makeMode(this);
    this.free = def.kind === 'freetype' ? this.mode as FreeTypeMode : null;
    const extra = this.mode.hud();
    if (extra) hud.querySelector('.hud-title')!.after(extra);
    hud.querySelector('.hud-title')!.after(...this.mode.rings());
    if (this.free || def.kind === 'aim' || def.kind === 'parrot') {
      this.saidEl = h('p', { class: 'sr-only', role: 'status', 'aria-live': 'polite' });
      stageWrap.append(this.saidEl);
    }
    this.tapko.el.classList.toggle('hidden', this.tapkoOnStage);
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
      read: () => { if (!this.reading.btn.hidden) this.reading.toggle(); },
    });
    void this.prepare();
  }

  private readonly offShortcuts: () => void;
  private readonly reading: Reading;

  /** Play began (the preparation cards are done). */
  get started(): boolean {
    return this.state.started;
  }

  /** Story levels and hero's journeys; free practice, drills, the target range and the parrot count every key, and the valley's take-off is the child's own flight. */
  get pawsAllowed(): boolean {
    return this.def.kind !== 'practice' && this.def.kind !== 'freetype' && this.def.kind !== 'takeoff' && this.def.kind !== 'aim' && this.def.kind !== 'parrot' && !this.opts.keys;
  }

  get tapkoOnStage(): boolean {
    return ['freetype', 'aim', 'swamp', 'crossroads', 'greatswamp', 'wind', 'mud', 'boulders', 'spell', 'doors', 'gate', 'rooms', 'buds', 'flower', 'owl', 'lilies', 'reflection', 'space', 'hop', 'command', 'asteroid'].includes(this.def.kind);
  }

  /** Preparation: assets, new keys, the get-ready card with the tip and its password, then play. */
  private async prepare(): Promise<void> {
    const p = app.profile!;
    // The level opens with every picture its mode, Tapko and the friends draw, so none shows its fallback first;
    // the other worlds' pictures keep loading in the background (main.ts).
    const { world, ground } = this.mode;
    const own = [`bg-${world}-far`, `bg-${world}${ground}-mid`, `bg-${world}${ground}-near`, `bg-${world}${ground}-shore`, ...this.mode.pictures, ...tapkoPictures(p.companion), ...friendPictures(), ...this.friends.pictures];
    await Promise.race([preload(own), new Promise((r) => setTimeout(r, PICTURES_WAIT_S * 1000))]);
    if (this.disposed) return;
    audio.music(this.def.kind === 'practice' ? app.menuTrack : this.mode.world);
    // Free typing and staying a while start at once; the child has just played this level.
    if (this.free || this.opts.stay) return this.begin();
    const host = this.el.querySelector<HTMLElement>('.stage-wrap')!;
    const journey = this.def.journey;
    // A later part of a hero's journey: only the panel with the next world and its story; giving up there leaves the journey.
    if (journey && journey.part > 0) {
      this.core.style = this.style;
      const on = await showJourneyPanel(host, WORLDS[journey.picture], journey.line ? t(journey.line) : '', (back, go) => this.opts.onBreak(back, go));
      if (this.disposed) return;
      if (on) this.begin();
      else this.exit();
      return;
    }
    let tip: string | undefined;
    if (!app.tipShown && !this.opts.keys) {
      app.tipShown = true;
      tip = pickTip(p, this.style)?.text;
      saveProfile();
    }
    if (!this.opts.keys) {
      const shown = await keyCards(host, this.guide, this.def.kind, () => this.disposed);
      if (!shown) return;
      this.shownKeys = shown;
    }
    // Without a voice of the language a dictation runs as copy typing (a mixed run as memory), and the card says so.
    const noVoice = this.reading.dictating && !speech.available(locale());
    const voiceNote = noVoice ? t(this.style === 'mixed' ? 'level.noVoiceMemory' : 'level.noVoice') : undefined;
    if (noVoice) this.style = this.style === 'mixed' ? 'memory' : 'copy';
    this.core.style = this.style;
    this.words.heard = this.reading.dictating;
    this.reading.paint();
    // The level's story and what it asks in particular, both on the one get-ready card; the first
    // level of a world tells the world's story instead of its own the first time.
    // A world not built yet keeps its story for when it is: its placeholder says what it plays instead.
    const opening = this.def.kind !== 'copyloop' && LEVELS.find((l) => l.id === this.def.id)?.index === 0 ? `world-${WORLDS[this.def.world]}` : null;
    const worldStory = opening && !p.progress.scenesSeen.includes(opening) ? t(`story.world.${WORLDS[this.def.world]}`) : null;
    const story = [worldStory ?? (journey?.line ? t(journey.line) : this.mode.startLine()), this.mode.intro()].filter(Boolean).join(' ') || null;
    if (!this.opts.keys) await showPosture(host, p, tip, this.surprise, voiceNote, story, journey ? t('journey.harder') : null);
    if (this.disposed) return;
    if (opening && worldStory) {
      p.progress.scenesSeen.push(opening);
      saveProfile();
    }
    this.begin();
  }

  /** When play began (`performance.now()`). */
  private begunAt = 0;
  /** Keys whose cards were shown before this level; they count as introduced only once play begins. */
  private shownKeys: string[] = [];

  /** Play starts: the mode, the story line or the friend's first line, the keys. */
  private begin(): void {
    this.mode.start();
    this.state.started = true;
    this.begunAt = performance.now();
    if (this.shownKeys.length) {
      app.profile!.progress.introducedKeys.push(...this.shownKeys);
      saveProfile();
    }
    if (this.free) this.say(t('freeType.start'), 6);
    else if (this.opts.stay) this.say(t(this.def.kind === 'aim' ? 'aim.stayStart' : 'level.stayStart'), 6);
    else if (this.friends.fairy) this.say(pickLine('fairy.start'), 3);
    this.tapko.el.classList.remove('waiting');
    this.rhythm.ready(performance.now());
    this.input = new KeyInput(window, this.handlers());
    this.updateGuide();
  }

  private handlers(): InputHandlers {
    return {
      onChar: (c) => this.onChar(c),
      onDead: () => { this.deadPending = true; this.updateGuide(); },
      onEscape: () => (this.state.paused ? this.resume() : this.free ? this.exit() : this.pause()),
      onRaw: (code, key, shift) => this.onRaw(code, key, shift),
      // A target waiting for Enter takes it; else the Enter that closed a card just before play is not a call for the paw.
      onEnter: () => (this.free ? this.freeSend() : this.waitsEnter ? this.typeEnter() : performance.now() - this.begunAt >= ENTER_GUARD_MS && (this.modeEnter() || !!this.paws?.start())),
      onBackspace: () => (this.free ? this.freeErase() : this.restartTarget()),
      // A pause or a dialog: the keys belong to its buttons.
      idle: () => this.state.paused || !!document.querySelector('.modal-back'),
    };
  }

  private disposed = false;

  dispose(): void {
    // Leaving by the browser's back button still keeps the time and keys typed.
    if (this.state.started && !this.state.finished) this.flushSession();
    this.disposed = true;
    this.pauseCard.dispose();
    speech.stop();
    this.reading.dispose();
    this.offShortcuts();
    this.layoutSwitch.dispose();
    this.loop.stop();
    this.input?.dispose();
    this.stage.dispose();
    document.removeEventListener('visibilitychange', this.onVisibility);
    window.removeEventListener('pointerdown', this.onTouch);
  }

  // ---- words and pacing ------------------------------------------------------

  /** Next target (a word, a phrase of up to `words` words, or a sentence of at least `minWords`); avoids first letters already on screen. */
  word(maxLen?: number, words = this.mode.phraseWords, minWords = this.mode.phraseMin): string {
    const avoid = new Set(this.core.active.map((t) => t.word[0].toLowerCase()));
    // A hero's journey makes phrases longer; a target of one word stays one (it may fly on a small thing).
    if (this.def.journey && words >= 2) words = Math.max(words, JOURNEY_WORDS);
    const w = this.words.next(avoid, maxLen, this.def.noSpace ? 1 : words, minWords);
    return this.enter?.next() ? w + ENTER : w;
  }

  /**
   * Seconds a target takes to reach the player: difficulty, the child's word pace (reading
   * included) and time to read it; a capital gets more, and the pressure valve slows it down.
   */
  travelTime(word: string): number {
    const base = (9 - this.difficulty * 0.5) * 0.55;
    const read = READ_TIME + (/\p{Lu}/u.test(word) ? CAPITAL_EXTRA : 0);
    return (base + word.length * this.letterTime + read) * this.valve.factor * STYLE_PACE[this.style];
  }

  /** Seconds the child takes per letter over the last few words (reading included), as the travel time counts it. */
  get letterTime(): number {
    return perChar(this.paceSamples, this.lastCps);
  }

  /** Seconds the child really takes per letter (reading included), without the travel time's bounds: a quick child is not slowed to the floor. */
  get letterPace(): number {
    return childPace(this.paceSamples, this.lastCps);
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

  /** A word that trains the child's weak keys (the target range's), for the planet's practice path. */
  weakWord(maxLen?: number): string {
    const p = app.profile!;
    this.weakWords ??= wordSource(p, p.settings.wordLang, undefined, undefined, undefined, aimKeys(p));
    const avoid = new Set(this.core.active.map((t) => t.word[0].toLowerCase()));
    return this.weakWords.next(avoid, maxLen, 1);
  }

  private weakWords: WordSource | null = null;

  /** Word pace and valve: visible targets get their start time, misses slow the level down. */
  private trackPace(): void {
    const shown = new Map<number, number>();
    for (const tg of this.core.active) if (tg.selectable) shown.set(tg.id, this.shownAt.get(tg.id) ?? this.state.elapsed);
    this.shownAt = shown;
    for (; this.missesSeen < this.core.missed; this.missesSeen++) this.valve.miss();
  }

  /** A target the child typed (not the paw). */
  private targetTyped(tg: Target): void {
    const since = this.shownAt.get(tg.id);
    if (since != null) this.paceSamples.push((this.state.elapsed - since) / tg.word.length);
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
      this.layoutSwitch.flag();
      this.say(t('level.layoutHint', { layout: t(`layouts.${other}`) }), 7);
    }
  }

  /** The locked target has its letters and waits for Enter. */
  private get waitsEnter(): boolean {
    return !!this.core.locked && this.core.expectedChar() === ENTER;
  }

  /** The mode may take an Enter no word waits for, while playing. */
  private modeEnter(): boolean {
    return this.state.started && !this.state.paused && !this.state.finished && this.mode.onEnter();
  }

  /** Enter finishes a waiting target like any other key of it. */
  private typeEnter(): boolean {
    this.onChar({ ch: ENTER, code: 'Enter', shift: false, shiftCode: null, time: performance.now() });
    return true;
  }

  private onChar(c: TypedChar): void {
    if (this.free) return this.freeChar(c, this.free);
    if (!this.state.playing || this.paws?.typing) return;
    this.ownKey();
    // A space between targets is a habit, not a mistake.
    if (c.ch === SPACE && !this.core.locked) return;
    this.deadPending = false;
    const res = this.core.type(c.ch);
    if (res.kind === 'ignored') return this.say(t('level.memoryWait'), 2);
    this.pressed++;
    const p = app.profile!;
    this.state.keyAt = this.state.elapsed;
    if (res.kind === 'wrong') {
      const { rt } = this.rhythm.press(null, c.time);
      if (res.expected) {
        recordPress(p, res.expected, c.ch, rt);
        this.errors++;
        this.trackWrong(res.expected);
      }
      this.sfx(this.mode.wrongSfx);
      this.setMood('thinking', 1.2);
      this.friends.wrong();
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
        this.friends.done();
        this.mode.onDone(res.target);
        this.cheer();
        this.paws?.wordDone(this.wordStreak);
      } else {
        this.sfx('key');
        this.mode.onCorrect(res.target);
      }
    }
    this.updateGuide();
  }

  /** Backspace in a level: the started word is wiped and the child may start any word again. */
  private restartTarget(): void {
    if (!this.state.playing || this.paws?.typing) return;
    this.ownKey();
    if (this.core.restart()) this.updateGuide();
  }

  /** A key of the child's own (never the paws' or the helper's) adds to the typing time. */
  private ownKey(): void {
    this.typedSeconds += typingStep(this.state.elapsed - this.ownKeyAt);
    this.ownKeyAt = this.state.elapsed;
  }

  // ---- free typing ----------------------------------------------------------------

  /** Keys reach free typing only while it plays and no dialog (the place picker) is open. */
  private get freeOpen(): boolean {
    return this.state.started && !this.state.paused && !document.querySelector('.modal-back');
  }

  /**
   * Free typing has no task, so nothing it types counts in the statistics (Tapko says so at the
   * start); keys the layout does not type are ignored.
   */
  private freeChar(c: TypedChar, mode: FreeTypeMode): void {
    if (!this.freeOpen || !stepsFor(layout(), c.ch).length) return;
    this.ownKey();
    this.deadPending = false;
    this.sfx('key');
    mode.key(c.ch);
    this.updateGuide();
  }

  private freeErase(): void {
    if (!this.freeOpen) return;
    this.ownKey();
    this.free!.erase();
  }

  /** Enter shows the collected text at once; a focused button keeps its Enter while a dialog is open. */
  private freeSend(): boolean {
    if (!this.freeOpen) return false;
    this.ownKey();
    this.free!.send();
    return true;
  }

  /** Free typing: the text shown is said when reading aloud is on and the parent allows typed words to be read. */
  speakTyped(text: string): void {
    if (this.saidEl) this.saidEl.textContent = text;
    const p = app.profile!;
    if (this.reading.on && p.settings.speakTyped) speech.say(text, locale());
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
    if (this.wrongStreak.n === 2) this.say(pickLine(this.friends.fairy ? 'fairy.mistake' : 'tapko.mistake'), 2);
    if (this.wrongStreak.n === 3) this.showHint(expected);
  }

  private cheer(): void {
    const now = this.state.elapsed;
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
    // The frame loop redraws only on a change, so it must know what a key press already showed.
    this.lastExpected = ch;
    const p = app.profile!;
    let fade = 0;
    if (ch && p.settings.guide === 'auto') {
      const stat = p.stats.keys[ch.toLowerCase()];
      fade = masteryLevel(stat, p.settings.difficulty) >= 1 ? 0.5 : 0;
    }
    this.guide.show(ch, this.deadPending && stepsFor(layout(), ch ?? '').length > 1, fade);
  }

  /** The on-screen keyboard on or off; the player keeps the choice for the next levels. */
  toggleGuide(): void {
    this.guideOn = !this.guideOn;
    const s = app.profile!.settings;
    s.guide = !this.guideOn ? 'off' : s.guide === 'off' ? 'auto' : s.guide;
    saveProfile();
    this.guide.setVisible(this.guideOn);
    this.guideBtn.setAttribute('aria-pressed', String(!this.guideOn));
    this.stage.resize();
  }

  /** Seconds of play since the child's last key (since play started before the first one). */
  get idleFor(): number {
    return this.state.idleFor;
  }

  // ---- Tapko --------------------------------------------------------------------

  /**
   * The narrator's line in the bubble; only screen readers hear it, the voice reads the targets alone.
   * It stays long enough to read (`seconds` is a minimum) and a line still shown is not replaced.
   */
  say(text: string, seconds = 0): void {
    this.tapko.say(text, seconds);
  }

  hideBubble(): void {
    this.tapko.hideBubble();
  }

  setMood(mood: Mood, seconds: number): void {
    this.tapko.setMood(mood, seconds);
  }

  /** Tapko's current mood, for modes that draw him on the canvas. */
  get tapkoMood(): Mood {
    return this.tapko.mood;
  }

  /** A stumble in the story (a missed boulder, a cracked stone): the story friend looks worried a while. */
  friendWorried(seconds = 1.4): void {
    this.friends.worried(seconds);
  }

  /** A short text pops up over the scene at (x, y) and fades. */
  shout(text: string, x: number, y: number): void {
    this.callouts.shout(text, x, y);
  }

  /**
   * A speech bubble in the scene, centered at (x, y) (or with its right edge there) and its tail toward
   * (tx, ty), for `seconds`; a new line of the same speaker replaces the old one. Screen readers hear it;
   * the voice does not read it.
   */
  speak(who: string, text: string, x: number, y: number, tx: number, ty: number, seconds: number, right = false): void {
    this.callouts.speak(who, text, x, y, tx, ty, seconds, right);
    if (this.saidEl) this.saidEl.textContent = text;
  }

  /** The speaker's bubble is still up (and has been up less than `within` seconds). */
  speaking(who: string, within = Infinity): boolean {
    return this.callouts.speaking(who, within);
  }

  /** Someone is glad: a cheer ("Hurá!") pops up above Tapko, or at `at`, with the cheer sound; returns the cheer. */
  hooray(at = this.mode.heroSpot()): string {
    const text = pickLine('story.cheer');
    this.sfx('cheer');
    this.shout(text, at.x, at.y);
    return text;
  }

  /** A path taken at a crossroads makes the rest of the level shorter or longer: the minimum time, scaled by `k`. */
  stretchMin(k: number): void {
    if (Number.isFinite(this.minActive)) this.minActive *= k;
  }

  /** A gust that pushed Tapko back or a stumble makes the way longer: the minimum time grows by `seconds`. */
  extendMin(seconds: number): void {
    if (Number.isFinite(this.minActive) && this.minActive > 0) this.minActive += seconds;
  }

  /** The valley's flights end at their last dragon even below the minimum: the minimum is what is played now. */
  endMinimum(): void {
    if (Number.isFinite(this.minActive)) this.minActive = Math.min(this.minActive, this.played);
  }

  /** Seconds of active play the level still needs before it may end (0 without a minimum). */
  get minLeft(): number {
    return Number.isFinite(this.minActive) ? Math.max(0, this.minActive - this.played) : 0;
  }

  /** Seconds of active play so far. */
  get playedS(): number {
    return this.played;
  }

  /** The fair share of the level done, as the bar shows it before it is kept from going back: the slower of the targets and the minimum time. */
  share(): number {
    return shownProgress(this.mode.progress(), this.played, this.minActive);
  }

  // ---- pause -------------------------------------------------------------------

  /** Also while the cards before play are open: their keys wait, and the pause card has no Slower then. */
  pause(): void {
    if (this.state.paused || this.state.finished) return;
    this.state.paused = true;
    speech.stop();
    this.pauseCard.open();
  }

  /**
   * Leaving from the pause card; after a key of this level it asks first, Continue being the safe choice.
   * Staying a while loses nothing: it ends with its card.
   */
  private async leave(): Promise<void> {
    if (this.opts.stay) {
      this.resume();
      return this.endPractice();
    }
    // A hero's journey asks with its own words; a later part always has the parts before it to lose.
    if (this.def.journey && (this.pressed || this.def.journey.part > 0)) {
      if (!(await giveUpJourney()) || this.disposed) return;
    } else if (this.pressed && !this.free) {
      const yes = await confirmDialog({ title: t('level.endAsk'), text: t(this.ending.text), ok: t(this.ending.label), cancel: t(this.ending.keep) });
      if (!yes || this.disposed) return;
    }
    this.exit();
  }

  /**
   * The "?" button, F1 and Help on the pause card: the level pauses and the help page opens
   * over it, with what this level asks and a tip first. A dialog over the level closes.
   * After the end (peeking under the end card) it opens over the last frame.
   */
  private openHelp(): void {
    if (!this.state.started) return;
    closeModals();
    if (!this.state.finished) {
      this.pause();
      if (!this.pauseCard.el) return;
    }
    const intro = this.mode.intro();
    const tip = pickTip(app.profile!, this.style)?.text;
    this.opts.onHelp(() => this.pauseCard.focus(), [intro, tip].filter((x): x is string => !!x).map((x) => h('p', {}, x)));
  }

  /** One step lower difficulty from now on; automatic growth may raise it again after accurate play. */
  private slowDown(): void {
    const p = app.profile!;
    this.difficulty = this.core.difficulty = Math.max(1, this.difficulty - 1);
    // A hero's journey plays above the profile's difficulty: the profile's goes down by the same step.
    p.settings.difficulty = Math.max(1, p.settings.difficulty - 1);
    p.progress.growthSeconds = 0;
    saveProfile();
    this.resume();
    this.say(t('level.slowerSaid'), 3);
  }

  resume(): void {
    if (!this.state.paused || !this.pauseCard.el) return;
    this.state.paused = false;
    this.pauseCard.close();
    this.rhythm.ready(performance.now());
    this.reading.again();
  }

  /** Leaving: free typing after something was typed ends with its card, everything else goes to the map. */
  private exit(): void {
    speech.stop();
    const seconds = this.typedSeconds;
    this.flushSession();
    const typed = this.free && { ...this.free.summary(), seconds };
    if (!typed?.words) return this.opts.onExit();
    this.state.finished = true;
    this.input?.dispose();
    this.input = null;
    this.guide.show(null);
    this.opts.onFreeDone(typed);
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
    if (this.state.paused || !this.state.started) {
      this.tweens.update(this.state.paused ? 0 : dt);
      return;
    }
    this.state.elapsed += dt;
    if (!this.state.finished) {
      app.sessionSeconds += dt;
      // The paws typing for the child count as play.
      this.played += playedStep(dt, this.paws?.typing ? 0 : this.idleFor, this.core.active.some((tg) => tg.selectable));
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
    if (this.paws?.typing) this.paws.tick(dt);
    else this.superHelp?.tick(dt);
    if (!this.paws?.typing) this.reading.focus();
    // Free typing and staying a while have no end on their own: the bubble says when a break is due.
    if ((this.free || this.opts.stay) && !this.breakSaid && isBreakDue()) {
      this.breakSaid = true;
      this.say(pickLine('tapko.break'), 6);
    }
    this.tapko.update(dt);
    this.friends.update(dt);
    this.callouts.update(dt);
    // More targets after the minimum grew the level lower the mode's share; the bar never goes back.
    // A hero's journey's bar shows the whole journey: this part fills only its own slice.
    const j = this.def.journey, share = this.share();
    const pct = Math.max(this.progressPct, Math.round((j ? journeyProgress(j, share) : share) * 100));
    if (pct !== this.progressPct) {
      this.progressPct = pct;
      this.progressFill.style.width = `${pct}%`;
    }
    this.gauge.set(this.rhythm.ema / this.gaugeFull);
    if ((this.gaugeLabelIn -= dt) <= 0) {
      this.gaugeLabelIn = 1;
      this.gauge.label(t('level.rhythm', { n: this.rhythm.cpm }));
      this.paintAccuracy();
    }
    this.rhythm.idle(dt, performance.now());
    if (this.core.shownChar() !== this.lastExpected) this.updateGuide();
    if (!this.state.finished && levelOver(this.mode.finished, this.played, this.minActive)) this.finish();
  }

  private lastExpected: string | null = null;
  private progressPct = -1;

  private frameWatch = new FrameWatch();

  /** Automatic graphics: when the first seconds of play are too slow, this device switches to the simple drawing. */
  private watchFrames(): void {
    if (graphics.simple || app.profile!.settings.graphics !== 'auto') return;
    if (!this.state.started || this.state.paused || this.state.finished || this.covered) return this.frameWatch.pause();
    if (!this.frameWatch.frame(performance.now())) return;
    markSlowDevice();
    this.particles.enabled = false;
    this.stage.resize();
  }
  /** Pictures ready when the last frame was drawn. */
  private drawnPictures = -1;

  /**
   * A card blurs the stage (the end card unless peeking, a card before play): redrawing the scene
   * would re-blur it every frame for nothing seen. The simple drawing has no blur and stays live.
   */
  private get covered(): boolean {
    return !graphics.simple && !!this.el.querySelector(':scope > .overlay:not(.peek)');
  }

  private render(): void {
    this.tapko.size(this.stage.scale, this.mode.tapkoFeet);
    this.watchFrames();
    // A paused level, the cards before play and a blurring card do not move: the last frame stays unless a resize cleared it or a picture came.
    const still = this.state.paused || (!this.state.started && !this.tweens.busy) || this.covered;
    if (still && !this.stage.dirty && picturesReady() === this.drawnPictures) return;
    this.drawnPictures = picturesReady();
    const g = this.stage.begin();
    const drift = this.mode.drift;
    drawBackground(g, this.mode.world, this.stage.vw, this.mode.scroll, !this.reduceMotion, this.mode.midOnly, drift && { layer: drift.layer, offset: driftOffset(drift, this.state.elapsed, !this.reduceMotion) }, this.mode.ground, this.mode.shore);
    this.friends.draw(g);
    this.labels.begin();
    this.mode.render(g);
    this.labels.draw(g);
    this.particles.render(g);
    this.callouts.draw(g, this.labels.rects);
    this.mode.renderFront?.(this.stage.beginFront());
    this.tapko.placeBubble(this.stage.scale, this.mode.bubbleSpot(), this.labels.rects);
  }


  /**
   * Word label above a target (helper for modes); drawn after the mode, so labels never overlap.
   * A word the child sees can be typed at once, so a target not selectable yet gets no label.
   * `clock` is the share of the word's countdown left: its clock stays in sight beside the word.
   */
  label(_g: G, tg: Target, x: number, y: number, size = 40, clock?: number): void {
    this.labels.add(tg, x, y, size, clock);
  }

  // ---- end ---------------------------------------------------------------------

  private flushSession(): void {
    const p = app.profile!;
    if (this.chars + this.errors > 0) recordSession(p, this.typedSeconds, this.chars, this.errors, this.rhythm.cpm);
    this.state.elapsed = 0;
    this.typedSeconds = 0;
    this.ownKeyAt = 0;
    this.chars = 0;
    this.errors = 0;
    saveProfile();
  }

  private finish(): void {
    this.state.finished = true;
    this.mode.onFinish();
    if (this.paws?.typing) this.paws.stop();
    this.input?.dispose();
    this.input = null;
    this.guide.show(null);
    const p = app.profile!;
    const total = this.chars + this.errors;
    const accuracy = total ? this.chars / total : 1;
    const seconds = this.typedSeconds;
    const cpm = this.rhythm.cpm;
    const chars = this.chars, errors = this.errors;
    // Targets the paw typed count neither way.
    const resolved = this.typedTargets + this.core.missed;
    const typedShare = resolved ? this.typedTargets / resolved : 1;
    const clean = this.cleanTargets;
    this.flushSession();
    const noStars = this.opts.stay || this.def.kind === 'aim' || this.def.kind === 'parrot';
    if ((noStars || this.def.kind === 'practice' && !this.def.count) && total === 0) {
      this.opts.onFinish(null);
      return;
    }
    const stats = { accuracy, chars, errors, cpm, seconds };
    // A hero's journey adds each part to the parts before; only its last part ends it, with all of them as one run.
    const run = this.opts.journey;
    if (run) {
      run.stats = run.stats ? joinRuns(run.stats, stats) : stats;
      run.typed += this.typedTargets;
      run.resolved += resolved;
      run.cap = Math.min(run.cap, this.mode.starCap());
      const j = this.def.journey!;
      if (j.part < j.parts - 1) {
        if (!this.mode.lost) this.celebrate();
        setTimeout(() => { if (!this.disposed) this.opts.onPart?.(); }, RESULTS_AFTER * 1000);
        return;
      }
    }
    const result = noStars ? completeStay(p, stats, typedShare)
      : run ? completeLevel(p, this.def, run.stats!, run.resolved ? run.typed / run.resolved : 1, run.cap)
      : completeLevel(p, this.def, stats, typedShare, this.mode.starCap());
    if (this.style !== 'copy') result.byStyle = { style: this.style, clean, total: resolved };
    saveProfile();
    if (!this.mode.lost) {
      this.sfx('reward');
      this.celebrate();
    }
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
    if (this.friends.fairy && !this.def.isSuper) this.say(pickLine('fairy.done'), RESULTS_AFTER);
    else this.hideBubble();
    // A beaten super-obstacle finishes the world: Tapko cheers, unless the mode's last cheer is still up.
    if (this.def.isSuper && !this.callouts.shouting) this.hooray();
    this.tapko.celebrate();
  }

  /** Ends an untimed practice or staying a while on request. */
  endPractice(): void {
    if (!this.state.finished) this.finish();
  }
}
