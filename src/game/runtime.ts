import { app, isBreakDue, layout, pickLine, reduceMotion, saveProfile } from '../app/app';
import { fast } from '../app/fast';
import { audio, type Sfx } from '../audio/audio';
import { speech } from '../audio/speech';
import { FrameWatch, graphics, markSlowDevice } from '../engine/graphics';
import { Loop, Stage, VH } from '../engine/loop';
import { Particles } from '../engine/particles';
import { Rng } from '../engine/rng';
import { Tweens } from '../engine/tween';
import { drawBackground, type G } from '../gfx/draw';
import { type Mood, pawColors, tapkoElement, tapkoPictures, renderTapkoInto } from '../gfx/tapko';
import { friendPictures, picturesReady, preload } from '../gfx/assets';
import { type FairyMood, drawFairy } from '../gfx/fairy';
import { type RobotMood, type RobotState, drawRobot, robotFor } from '../gfx/robot';
import { locale, t, tList } from '../i18n/i18n';
import { nickname } from '../storage/store';
import { type InputHandlers, KeyInput, type TypedChar } from '../input/input';
import { setShortcuts, withKey } from '../input/shortcuts';
import { ENTER, LAYOUTS, LayoutMismatchDetector, enterAfter, fingerFor, homeKey, stepsFor } from '../keyboard/layouts';
import { SHIFT_L, SHIFT_R, SPACE, activeKeys, aimKeys, isKeyReady, isLetterKey, keysToIntroduce, masteryLevel, newestGroup, recentAccuracy, shiftKeyOf, useLayout } from '../learning/lessons';
import { keyWeights, recordPress, recordSession, typingStep } from '../learning/stats';
import { FINGER_KEYS, KeyboardGuide, keyLabel } from '../ui/keyboard-guide';
import { LayoutSwitch } from '../ui/layout-switch';
import { button, closeButton, closeModals, confirmDialog, h } from '../ui/dom';
import { globalButtons } from '../ui/chrome';
import { tip } from '../ui/tooltip';
import { accuracyPic, paintRound, pawRing, placeRing, rhythmPic, rhythmRing, roundButton, roundPic, worldName } from '../ui/hud';
import { type MenuEntry, menuPanel } from '../ui/menu';
import { OWN_SHARE, WordSource, type WordSourceOwn } from '../words/words';
import { type LangRef, type Profile, SUPER_ID, type Surprise } from '../storage/schema';
import type { LevelDef } from './levels';
import { LEVELS, WORLDS, grownCount, hasMinLength, levelOver, minActiveS, playedStep, shownProgress, storyOf } from './levels';
import { type Mode, TAPKO_FEET, TAPKO_H, TAPKO_X, driftOffset } from './mode';
import { PAW_MAX, PAW_STREAK, PAW_WORDS } from './paw';
import { ENTER_MAX, EnterMarks } from './enter';
import type { ModeMaker } from './modes';
import type { FreeTypeMode, FreeTyped } from './modes/freetype';
import { PressureValve, perChar, sayTime } from './pace';
import { Rhythm } from './rhythm';
import { type JourneyRun, type LevelResult, completeLevel, completeStay, joinRuns } from './progress';
import { type Style, type Target, TypingCore } from './typing';
import { type ControlKey, pickTip, showCard, showControlKey, showHomeRow, showKeysIntro, showNewKey, showPosture, showTravel } from './cards';
import { surpriseFor } from './own-content';
import { HELP_PLANS, type HelpHost, type HelpPlan, SuperHelper } from './super-help';
import { Callouts } from './runtime/callouts';
import { LABEL_GAP, Labels } from './runtime/labels';

/** Seconds every target gets to be read. */
const READ_TIME = 3;
/** Extra seconds a target with a capital letter gets (the Shift chord is hard). */
const CAPITAL_EXTRA = 1.5;
/** Travel time of dictated and remembered targets: hearing or recalling a target takes longer. */
const STYLE_PACE: Record<Style, number> = { copy: 1, dictation: 1.5, memory: 1.8, mixed: 1.8 };
/** Seconds without a key after which a dictated target is said once more. */
const DICTATION_REPEAT = 4;
/** Bolt's place next to the DOM Tapko and his height, in game units. */
const BOLT_X = 350;
const BOLT_SIZE = 150;
/** Melody's height, how high she floats above the friend's spot, and the seconds of her happy hop. */
const FAIRY_SIZE = 120;
const FAIRY_FLOAT = 110;
const FAIRY_HOP = 0.6;
/** The end of a level: Tapko hops HOPS times of HOP_TIME seconds, his tool fades in TOOL_FADE, then the results open. */
const HOPS = 3;
const HOP_TIME = 0.4;
const TOOL_FADE = 0.4;
const RESULTS_AFTER = 1.4;
/** Seconds a level waits at most for its own pictures: a stalled connection still opens it, with the fallbacks. */
const PICTURES_WAIT_S = 30;
/** Milliseconds after play begins in which Enter does nothing. */
const ENTER_GUARD_MS = 300;
/** Stretches done sitting, one of them shown on the pause card; its short exercise lasts STRETCH_S seconds. */
const STRETCHES = ['arms', 'fists', 'shoulders', 'neck', 'wrists', 'eyes'];
const STRETCH_S = 20;
/** A hero's journey plays a difficulty step above the profile's, its words a letter longer and its phrases up to three words (the planet's hard path). */
const JOURNEY_STEP = 1;
const DIFFICULTY_MAX = 10;
const JOURNEY_WORDS = 3;

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
export function wordSource(p: Profile, lang: LangRef, drill?: string[], own?: WordSourceOwn, chosen?: string[], focus?: string[], hard = false): WordSource {
  // Practice of space, punctuation or a Shift needs letters around it: the known ones.
  const keys = chosen ?? (!drill ? activeKeys(p) : drill.every(isLetterKey) ? drill : [...new Set([...activeKeys(p), ...drill])]);
  const s = p.settings;
  return new WordSource(app.words[lang], {
    keys,
    len: hard ? [s.wordLen[0] + 1, s.wordLen[1] + 1] : s.wordLen,
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
  /** Free practice: the style chosen in the key picker. */
  style?: Style;
  /** Staying a while: the level runs without an end until the child ends it on the pause card, for no stars. */
  stay?: boolean;
  /** Staying a while in a story level with the next one open: the pause card's first button goes on to it. */
  next?: () => void;
  onFinish(result: LevelResult | null): void;
  onExit(): void;
  /** Free typing left after something was typed: its end card. */
  onFreeDone(typed: FreeTyped): void;
  /** A click on Tapko during play (the level pauses first). */
  onTapko(): void;
  /** The help page over the paused or ended level, with what this level asks (`now`); `back` returns to the paused level. */
  onHelp(back: () => void, now: HTMLElement[]): void;
  /** The map's warm-up over the paused level: `back` returns to the pause card, `play` goes on typing. */
  onBreak(back: () => void, play: () => void): void;
  /** The player switched the keyboard layout under the on-screen keyboard: the level starts again with it. */
  onLayout(): void;
  /** A hero's journey part: the journey's parts so far, this one is added at its end. */
  journey?: JourneyRun;
  /** A hero's journey part that is not the last one ended: the next part comes. */
  onPart?(): void;
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
  /** Bolt walks with Tapko in story 2 levels; null elsewhere. */
  readonly robot: RobotState | null;
  private robotMood: RobotMood = 'idle';
  private robotMoodT = 0;
  /** Melody floats next to Tapko in story 3 levels. */
  readonly fairy: boolean;
  private fairyMood: FairyMood = 'idle';
  private fairyMoodT = 0;
  private fairyHop = 0;
  private labels = new Labels(this);
  private callouts = new Callouts(this);

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
  private pauseBtn: HTMLButtonElement | null = null;
  private guideBtn: HTMLButtonElement;
  /** The countdown of the short exercise on the pause card; 0 when none runs. */
  private stretchTimer = 0;
  /** Free typing's text shown above Tapko and the range's speech bubbles, for screen readers. */
  private saidEl: HTMLElement | null = null;
  private breakSaid = false;
  private paused = false;
  /** Play began (the preparation cards are done). */
  started = false;
  private finished = false;
  private deadPending = false;
  private mismatch: LayoutMismatchDetector;
  private layoutSwitch: LayoutSwitch;
  private mismatchShown = false;

  /** Keys the child pressed for a target in this level, right or wrong; leaving after one asks first. */
  private pressed = 0;
  /** Stats of this level. */
  chars = 0;
  errors = 0;
  private elapsed = 0;
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
  /** The super player's help: the button, its open menu and the helper while it types. */
  private superBtn: HTMLButtonElement | null = null;
  private closeHelpMenu: ((refocus?: boolean) => void) | null = null;
  private helper: SuperHelper | null = null;
  private pawWords = 0;
  private pawTimer = 0;
  private pawIdle = 0;
  private guideBeforePaws = true;

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
    const story = def.kind !== 'practice' && def.kind !== 'freetype' && def.kind !== 'aim' && def.kind !== 'parrot';
    this.robot = story && storyOf(def.world).id === 'robot' ? robotFor(def.world) : null;
    if (this.robot) this.el.dataset.bolt = this.robot.look;
    this.fairy = story && storyOf(def.world).id === 'fairy';
    if (this.fairy) this.el.dataset.fairy = 'melody';
    this.progressFill = h('div', { class: 'progress-fill' });
    const title = def.kind === 'practice' ? t(def.phrases ? 'level.ownText' : 'level.practice') : def.kind === 'freetype' ? t('level.freeType') : def.kind === 'aim' ? t('aim.title') : def.kind === 'parrot' ? t('parrot.title') : def.journey ? t('journey.title') : worldName(def);
    // Hiding the guide is the switch: the crossed keyboard, with the orange ring while the guide is hidden.
    const guideBtn = this.guideBtn = roundButton('control', 'keyboardOff', t('level.guide'), () => this.toggleGuide());
    tip(guideBtn, withKey(t('level.guide'), 'F2'));
    if (p.settings.guideLocked) guideBtn.disabled = true;
    const helpBtn = roundButton('control', 'help', t('level.help'), () => this.openHelp());
    tip(helpBtn, withKey(t('level.help'), 'F1'));
    this.readBtn = roundButton('control', 'read', t('level.read'), () => this.toggleRead());
    tip(this.readBtn, withKey(t('level.read'), 'F3'));
    this.paintRead();
    this.offVoices = speech.onVoices(() => this.paintRead());
    // Free typing has nothing to pause: its X leaves.
    const pauseBtn = def.kind === 'freetype' ? roundButton('control', 'close', t('level.leave'), () => this.exit()) : this.pauseBtn = roundButton('control', 'pause', t('level.pause'), () => (this.paused ? this.resume() : this.pause()));
    if (this.pawsAllowed) {
      this.pawBtn = roundButton('paw', 'paw', t('paw.title', { n: PAW_STREAK, words: PAW_WORDS }), () => this.startPaws());
      this.pawBtn.classList.add('paw-btn');
      this.renderPawBtn();
    }
    if (p.id === SUPER_ID && def.kind !== 'freetype') {
      this.superBtn = roundButton('super', 'lifebuoy', t('super.help.title'), () => this.toggleHelpMenu());
      this.superBtn.classList.add('super-help');
      this.superBtn.setAttribute('aria-haspopup', 'menu');
      this.paintHelpBtn();
    }
    if (def.kind === 'practice' || def.kind === 'aim') this.accuracyPics = [...this.words.focus].map((key) => ({ key, pic: accuracyPic(key) }));
    this.paintAccuracy();
    const hud = h('div', { class: 'hud' },
      pauseBtn,
      this.pawBtn,
      this.superBtn,
      def.kind === 'practice' || def.index < 0 ? null : placeRing(def),
      h('b', { class: 'hud-title' }, title),
      ...(def.kind === 'freetype' ? [] : [opts.stay ? null : h('div', { class: 'progress', tip: t('level.progress') }, this.progressFill), ...this.accuracyPics.map((a) => a.pic.el), def.kind === 'parrot' ? null : this.gauge.el]),
      h('span', { class: 'hud-divider', 'aria-hidden': 'true' }),
      guideBtn, this.readBtn, ...globalButtons(helpBtn));
    const stageWrap = h('div', { class: 'stage-wrap' });
    this.tapko = tapkoElement(p.companion, 'idle');
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
    this.onStageClick = this.onStageClick.bind(this);
    this.stage.canvas.addEventListener('pointerdown', this.onStageClick);
    this.mode = makeMode(this);
    this.free = def.kind === 'freetype' ? this.mode as FreeTypeMode : null;
    const extra = this.mode.hud();
    if (extra) hud.querySelector('.hud-title')!.after(extra);
    hud.querySelector('.hud-title')!.after(...this.mode.rings());
    if (this.free || def.kind === 'aim' || def.kind === 'parrot') {
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

  /** Story levels and hero's journeys; free practice, drills, the target range and the parrot count every key, and the valley's take-off is the child's own flight. */
  get pawsAllowed(): boolean {
    return this.def.kind !== 'practice' && this.def.kind !== 'freetype' && this.def.kind !== 'takeoff' && this.def.kind !== 'aim' && this.def.kind !== 'parrot' && !this.opts.keys;
  }

  get tapkoOnStage(): boolean {
    return ['freetype', 'aim', 'swamp', 'crossroads', 'greatswamp', 'doors', 'gate', 'rooms', 'buds', 'flower', 'owl', 'lilies', 'reflection', 'space', 'hop', 'command', 'asteroid'].includes(this.def.kind);
  }

  /** Preparation: assets, new keys, the get-ready card with the tip and its password, then play. */
  private async prepare(): Promise<void> {
    const p = app.profile!;
    // The level opens with every picture its mode, Tapko and the friends draw, so none shows its fallback first;
    // the other worlds' pictures keep loading in the background (main.ts).
    const { world, ground } = this.mode;
    const own = [`bg-${world}-far`, `bg-${world}${ground}-mid`, `bg-${world}${ground}-near`, `bg-${world}${ground}-shore`, ...this.mode.pictures, ...tapkoPictures(p.companion), ...friendPictures()];
    await Promise.race([preload(own), new Promise((r) => setTimeout(r, PICTURES_WAIT_S * 1000))]);
    if (this.disposed) return;
    audio.music(this.def.kind === 'practice' ? app.menuTrack : this.mode.world);
    // Free typing and staying a while start at once; the child has just played this level.
    if (this.free || this.opts.stay) return this.begin();
    const host = this.el.querySelector<HTMLElement>('.stage-wrap')!;
    const journey = this.def.journey;
    // A later part of a hero's journey: only the travel card to the next world.
    if (journey && journey.part > 0) {
      this.core.style = this.style;
      await showTravel(host, WORLDS[this.def.world], journey.line ? t(journey.line) : null);
      if (!this.disposed) this.begin();
      return;
    }
    let tip: string | undefined;
    if (!app.tipShown && !this.opts.keys) {
      app.tipShown = true;
      tip = pickTip(p, this.style)?.text;
      saveProfile();
    }
    const lay = layout();
    const homeKeys = [homeKey(lay, 3), homeKey(lay, 6)];
    const known = (k: string | null) => !!k && (p.progress.introducedKeys.includes(k) || this.shownKeys.includes(k));
    for (const key of this.opts.keys ? [] : keysToIntroduce(p)) {
      if (this.disposed) return;
      // The very first key card is preceded by why key cards come and how they close.
      if (!p.progress.introducedKeys.length && !this.shownKeys.length) await showKeysIntro(host, p);
      // Esc comes before the first key: it stops the game and closes every card.
      if (!this.disposed) await this.controlKey(host, 'escape');
      if (this.disposed) return;
      await showNewKey(host, key, lay, this.guide, p);
      this.shownKeys.push(key);
      // Once F and J are both known, the home row is taught, before they are used in play.
      if (homeKeys.includes(key) && homeKeys.every(known)) await showHomeRow(host, lay, this.guide, p);
    }
    if (this.disposed) return;
    // Tab comes a level after Enter (which comes with the right little finger's home key): together they get around any page without a mouse.
    if (p.progress.introducedKeys.includes(enterAfter(lay)) && !this.opts.keys) await this.controlKey(host, 'tab');
    if (this.disposed) return;
    // The first crossroads teaches Backspace: here it takes back a choice, it never fixes a typo.
    if (this.def.kind === 'crossroads' && !this.opts.keys) await this.controlKey(host, 'backspace');
    if (this.disposed) return;
    // Without a voice of the language a dictation runs as copy typing (a mixed run as memory), and the card says so.
    const noVoice = this.dictating && !speech.available(locale());
    const voiceNote = noVoice ? t(this.style === 'mixed' ? 'level.noVoiceMemory' : 'level.noVoice') : undefined;
    if (noVoice) this.style = this.style === 'mixed' ? 'memory' : 'copy';
    this.core.style = this.style;
    this.words.heard = this.dictating;
    this.paintRead();
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

  /** A control key's card, once per profile; it never counts among the learned keys. */
  private async controlKey(host: HTMLElement, id: ControlKey): Promise<void> {
    const p = app.profile!, seen = `key-${id}`;
    if (p.progress.scenesSeen.includes(seen)) return;
    p.progress.scenesSeen.push(seen);
    saveProfile();
    await showControlKey(host, id, layout(), p);
  }

  /** When play began (`performance.now()`). */
  private begunAt = 0;
  /** Keys whose cards were shown before this level; they count as introduced only once play begins. */
  private shownKeys: string[] = [];

  /** Play starts: the mode, the story line or the friend's first line, the keys. */
  private begin(): void {
    this.mode.start();
    this.started = true;
    this.begunAt = performance.now();
    if (this.shownKeys.length) {
      app.profile!.progress.introducedKeys.push(...this.shownKeys);
      saveProfile();
    }
    if (this.free) this.say(t('freeType.start'), 6);
    else if (this.opts.stay) this.say(t(this.def.kind === 'aim' ? 'aim.stayStart' : 'level.stayStart'), 6);
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
      onEscape: () => (this.paused ? this.resume() : this.free ? this.exit() : this.pause()),
      onRaw: (code, key, shift) => this.onRaw(code, key, shift),
      // A target waiting for Enter takes it; else the Enter that closed a card just before play is not a call for the paw.
      onEnter: () => (this.free ? this.freeSend() : this.waitsEnter ? this.typeEnter() : performance.now() - this.begunAt >= ENTER_GUARD_MS && (this.modeEnter() || this.startPaws())),
      onBackspace: () => (this.free ? this.freeErase() : this.restartTarget()),
      // A pause or a dialog: the keys belong to its buttons.
      idle: () => this.paused || !!document.querySelector('.modal-back'),
    };
  }

  private disposed = false;

  dispose(): void {
    // Leaving by the browser's back button still keeps the time and keys typed.
    if (this.started && !this.finished) this.flushSession();
    this.disposed = true;
    clearInterval(this.stretchTimer);
    speech.stop();
    this.offVoices();
    this.offShortcuts();
    this.layoutSwitch.dispose();
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
    this.ownKey();
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

  /** Backspace in a level: the started word is wiped and the child may start any word again. */
  private restartTarget(): void {
    if (!this.started || this.paused || this.finished || this.pawWords) return;
    this.ownKey();
    if (this.core.restart()) this.updateGuide();
  }

  /** A key of the child's own (never the paws' or the helper's) adds to the typing time. */
  private ownKey(): void {
    this.typedSeconds += typingStep(this.elapsed - this.ownKeyAt);
    this.ownKeyAt = this.elapsed;
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
  private toggleGuide(): void {
    this.guideOn = !this.guideOn;
    const s = app.profile!.settings;
    s.guide = !this.guideOn ? 'off' : s.guide === 'off' ? 'auto' : s.guide;
    saveProfile();
    this.guide.setVisible(this.guideOn);
    this.guideBtn.setAttribute('aria-pressed', String(!this.guideOn));
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

  /** Seconds of play since the child's last key (since play started before the first one). */
  get idleFor(): number {
    return this.elapsed - this.keyAt;
  }
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
    const hit = this.labels.at(x, y);
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

  private setRobotMood(mood: RobotMood, seconds: number): void {
    this.robotMood = mood;
    this.robotMoodT = seconds;
  }

  /** Melody looks curious, sings, or hops once (happy). */
  private setFairyMood(mood: FairyMood, seconds: number): void {
    this.fairyMood = mood;
    this.fairyMoodT = seconds;
    if (mood === 'happy' && !this.reduceMotion) this.fairyHop = FAIRY_HOP;
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

  /** The story friend's feet (Bolt, Melody below where she floats): where the mode puts them, else next to Tapko. */
  friendSpot(): { x: number; y: number } {
    return this.mode.friendSpot() ?? { x: BOLT_X, y: VH - 6 };
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

  /** A path taken at a crossroads makes the rest of the level shorter or longer: the minimum time, scaled by `k`. */
  stretchMin(k: number): void {
    if (Number.isFinite(this.minActive)) this.minActive *= k;
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

  // ---- super help ----------------------------------------------------------------

  /** The super help's menu: how the game types for the super player, or stop it. */
  private toggleHelpMenu(): void {
    if (this.closeHelpMenu) return this.closeHelpMenu();
    const btn = this.superBtn!;
    const entries: MenuEntry[] = (Object.keys(HELP_PLANS) as HelpPlan[]).map((plan) => ({ label: t(`super.help.${plan}`), art: roundPic('super', 'lifebuoy'), pick: () => this.startHelp(plan) }));
    if (this.helper) entries.push({ label: t('super.help.stop'), art: roundPic('super', 'close'), pick: () => this.stopHelp() });
    this.closeHelpMenu = menuPanel(btn, t('super.help.title'), entries, (panel) => {
      const r = btn.getBoundingClientRect();
      panel.classList.add('service-menu');
      panel.style.top = `${r.bottom + 10}px`;
      panel.style.left = `${r.left}px`;
      panel.style.right = 'auto';
      document.querySelector('#app')!.append(panel);
    }, (refocus) => {
      this.closeHelpMenu = null;
      if (refocus) btn.focus();
    });
  }

  private startHelp(plan: HelpPlan): void {
    this.helper = new SuperHelper(plan, () => this.rng.next());
    this.paintHelpBtn();
  }

  private stopHelp(): void {
    this.helper = null;
    this.paintHelpBtn();
  }

  /** A full ring around the button while the super help types, like the other round buttons show their state. */
  private paintHelpBtn(): void {
    if (!this.superBtn) return;
    paintRound(this.superBtn, 'lifebuoy', this.helper ? rhythmRing(1) : '');
    this.superBtn.setAttribute('aria-pressed', String(!!this.helper));
  }

  /** The super help types through the same key handler as the child, so everything counts as typed. */
  private readonly helpHost: HelpHost = {
    progress: () => this.share(),
    next: () => {
      const tg = this.core.focus();
      if (!tg || !this.core.typable(tg)) return null;
      return { ch: tg.word[tg.typed], last: tg.typed === tg.word.length - 1 };
    },
    press: (ch) => {
      const shift = shiftKeyOf(layout(), ch);
      this.onChar({ ch, code: '', shift: !!shift, shiftCode: shift ? (shift === SHIFT_L ? 'ShiftLeft' : 'ShiftRight') : null, time: performance.now() });
    },
    wrongKey: () => {
      const expected = this.core.expectedChar();
      const keys = activeKeys(app.profile!).filter((k) => isLetterKey(k) && k !== expected);
      return keys.length ? this.rng.pick(keys) : expected === 'x' ? 'q' : 'x';
    },
    missed: () => this.core.missed,
    canMiss: () => !this.noPressure,
  };

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
    const focus = this.core.focus();
    if (p.progress.pawHelp <= 0 || !focus || !this.mode.pawMay(focus)) return false;
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
    // A decision waits: the paws stop and the child chooses.
    if (!this.mode.pawMay(tg)) return this.stopPaws();
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

  /** Also while the cards before play are open: their keys wait, and the pause card has no Slower then. */
  pause(): void {
    if (this.paused || this.finished) return;
    this.paused = true;
    speech.stop();
    this.paintPause();
    this.pauseEl = h('div', { class: 'card pause-card', role: 'dialog', 'aria-label': t('level.paused') });
    // Before play there is no key input yet: Esc on the card goes on to the cards.
    if (!this.started) this.pauseEl.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.resume(); });
    this.pauseCard();
    this.el.querySelector('.stage-wrap')!.append(this.pauseEl);
    this.focusPause();
  }

  /**
   * A small card at the top (the words and the guide's next key stay in sight): a stretch to try,
   * the X (Esc too) to go on, and Continue, Slower (only in play), the short exercise of that stretch and the end.
   * Staying a while, the level is already done: the next level (when open), else the end comes first.
   */
  private pauseCard(): void {
    const stretch = STRETCHES[Math.floor(Math.random() * STRETCHES.length)];
    const slower = this.started ? button(t('level.slower'), () => this.slowDown(), 'btn') : null;
    if (slower) slower.disabled = this.difficulty <= 1;
    const { next, stay } = this.opts;
    const keep = button(t(this.ending.keep), () => this.resume(), 'btn', 'play');
    const end = button(t(this.ending.label), () => void this.leave(), 'btn', 'close');
    const first = !stay ? keep : next ? button(t('results.next'), next, 'btn', 'next') : end;
    first.classList.add('primary');
    this.pauseEl!.replaceChildren(
      closeButton(() => this.resume(), t('level.pauseClose')),
      h('h2', {}, t('level.paused')),
      h('p', { class: 'pause-tip' }, t(`break.${stretch}`)),
      h('div', { class: 'row' }, first, ...[keep, slower, button(t('level.stretch'), () => this.stretch(stretch), 'btn', 'smile'), end].filter((b) => b !== first)));
  }

  /** The short exercise on the pause card: the stretch with a countdown, then the pause again; or the longer break instead. */
  private stretch(name: string): void {
    let left = STRETCH_S;
    const count = h('div', { class: 'break-timer' }, String(left));
    const back = () => {
      clearInterval(this.stretchTimer);
      this.stretchTimer = 0;
      if (!this.pauseEl) return;
      this.pauseCard();
      this.focusPause();
    };
    this.pauseEl!.replaceChildren(
      closeButton(() => this.resume(), t('level.pauseClose')),
      h('h2', {}, t('level.stretch')),
      h('p', { class: 'pause-tip' }, t(`break.${name}`)),
      count,
      h('div', { class: 'row' },
        button(t('level.stretchDone'), back, 'btn primary', 'check'),
        button(t('level.stretchLong'), () => {
          clearInterval(this.stretchTimer);
          this.stretchTimer = 0;
          this.opts.onBreak(back, () => this.resume());
        }, 'btn', 'wave')));
    this.focusPause();
    this.stretchTimer = window.setInterval(() => {
      count.textContent = String(--left);
      if (left <= 0) back();
    }, 1000);
  }

  /** The pause button shows what it does: pause while playing, play while paused. */
  private paintPause(): void {
    if (!this.pauseBtn) return;
    const label = t(this.paused ? this.ending.keep : 'level.pause');
    paintRound(this.pauseBtn, this.paused ? 'play' : 'pause');
    this.pauseBtn.setAttribute('aria-label', label);
    tip(this.pauseBtn, label);
  }

  /** The pause card's first button: Continue, or staying a while the next level or the end. */
  private focusPause(): void {
    this.pauseEl?.querySelector<HTMLButtonElement>('.btn.primary')?.focus();
  }

  /** What leaving and going on are called, and what the question says is lost: a story level, an exercise or a hero's journey. */
  private get ending(): { label: string; keep: string; text: string } {
    if (this.def.kind === 'freetype') return { label: 'level.leave', keep: 'level.keepTyping', text: '' };
    if (this.def.kind === 'practice' || this.def.kind === 'aim' || this.def.kind === 'parrot' || this.opts.stay) return { label: 'level.end', keep: 'level.keepPractice', text: 'level.endPracticeText' };
    if (this.def.journey) return { label: 'level.end', keep: 'level.keepLevel', text: 'level.endJourneyText' };
    return { label: 'level.end', keep: 'level.keepLevel', text: 'level.endLevelText' };
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
    // A later part of a hero's journey always has the parts before it to lose.
    if ((this.pressed || (this.def.journey?.part ?? 0) > 0) && !this.free) {
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
    if (!this.started) return;
    closeModals();
    if (!this.finished) {
      this.pause();
      if (!this.pauseEl) return;
    }
    const intro = this.mode.intro();
    const tip = pickTip(app.profile!, this.style)?.text;
    this.opts.onHelp(() => this.focusPause(), [intro, tip].filter((x): x is string => !!x).map((x) => h('p', {}, x)));
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
    if (!this.paused || !this.pauseEl) return;
    clearInterval(this.stretchTimer);
    this.stretchTimer = 0;
    this.pauseEl.remove();
    this.pauseEl = null;
    this.paused = false;
    this.paintPause();
    this.rhythm.ready(performance.now());
    // The pause cut the voice: a dictated target is said again.
    if (this.dictating) this.readId = 0;
  }

  /** Leaving: free typing after something was typed ends with its card, everything else goes to the map. */
  private exit(): void {
    speech.stop();
    const seconds = this.typedSeconds;
    this.flushSession();
    const typed = this.free && { ...this.free.summary(), seconds };
    if (!typed?.words) return this.opts.onExit();
    this.finished = true;
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
    if (this.paused || !this.started) {
      this.tweens.update(this.paused ? 0 : dt);
      return;
    }
    this.elapsed += dt;
    if (!this.finished) {
      app.sessionSeconds += dt;
      // The paws typing for the child count as play.
      this.played += playedStep(dt, this.pawWords ? 0 : this.idleFor, this.core.active.some((tg) => tg.selectable));
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
    else if (this.helper && !this.finished) this.helper.tick(dt, this.helpHost);
    this.readFocus();
    // Free typing and staying a while have no end on their own: the bubble says when a break is due.
    if ((this.free || this.opts.stay) && !this.breakSaid && isBreakDue()) {
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
    this.callouts.update(dt);
    // More targets after the minimum grew the level lower the mode's share; the bar never goes back.
    const pct = Math.max(this.progressPct, Math.round(this.share() * 100));
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
    if (this.core.shownChar() !== this.lastExpected) this.updateGuide();
    if (!this.finished && levelOver(this.mode.finished, this.played, this.minActive)) this.finish();
  }

  private lastExpected: string | null = null;
  private progressPct = -1;

  /** The DOM Tapko keeps his size in game units, so he grows and shrinks with the scene. */
  private sizeTapko(): void {
    const k = this.stage.scale;
    const px = Math.round(TAPKO_H * k);
    if (px === this.tapkoPx) return;
    this.tapkoPx = px;
    this.tapko.style.setProperty('--size', `${px}px`);
    this.tapko.style.left = `${Math.round((TAPKO_X - TAPKO_H / 2) * k)}px`;
    this.tapko.style.bottom = `${Math.round((TAPKO_FEET - this.mode.tapkoFeet) * k)}px`;
  }

  private tapkoPx = 0;
  private frameWatch = new FrameWatch();

  /** Automatic graphics: when the first seconds of play are too slow, this device switches to the simple drawing. */
  private watchFrames(): void {
    if (graphics.simple || app.profile!.settings.graphics !== 'auto') return;
    if (!this.started || this.paused || this.finished) return this.frameWatch.pause();
    if (!this.frameWatch.frame(performance.now())) return;
    markSlowDevice();
    this.particles.enabled = false;
    this.stage.resize();
  }
  /** Pictures ready when the last frame was drawn. */
  private drawnPictures = -1;

  private render(): void {
    this.sizeTapko();
    this.watchFrames();
    // A paused level and the cards before play do not move: the last frame stays unless a resize cleared it or a picture came.
    const still = this.paused || (!this.started && !this.tweens.busy);
    if (still && !this.stage.dirty && picturesReady() === this.drawnPictures) return;
    this.drawnPictures = picturesReady();
    const g = this.stage.begin();
    const drift = this.mode.drift;
    drawBackground(g, this.mode.world, this.stage.vw, this.mode.scroll, !this.reduceMotion, this.mode.midOnly, drift && { layer: drift.layer, offset: driftOffset(drift, this.elapsed, !this.reduceMotion) }, this.mode.ground, this.mode.shore);
    if (this.robot) this.drawBolt(g);
    if (this.fairy) this.drawMelody(g);
    this.labels.begin();
    this.mode.render(g);
    this.labels.draw(g);
    this.particles.render(g);
    this.callouts.draw(g, this.labels.rects);
    this.mode.renderFront?.(this.stage.beginFront());
    this.placeBubble();
  }


  /**
   * Word label above a target (helper for modes); drawn after the mode, so labels never overlap.
   * A word the child sees can be typed at once, so a target not selectable yet gets no label.
   */
  label(_g: G, tg: Target, x: number, y: number, size = 40): void {
    this.labels.add(tg, x, y, size);
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
      return this.labels.rects.some((r) => r.x0 < x1 && r.x1 > x0 && r.y0 < y1 && r.y1 > y0);
    };
    b.classList.toggle('covered', covers());
  }

  // ---- end ---------------------------------------------------------------------

  private flushSession(): void {
    const p = app.profile!;
    if (this.chars + this.errors > 0) recordSession(p, this.typedSeconds, this.chars, this.errors, this.rhythm.cpm);
    this.elapsed = 0;
    this.typedSeconds = 0;
    this.ownKeyAt = 0;
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
    if (this.fairy && !this.def.isSuper) this.say(pickLine('fairy.done'), RESULTS_AFTER);
    else this.hideBubble();
    // A beaten super-obstacle finishes the world: Tapko cheers, unless the mode's last cheer is still up.
    if (this.def.isSuper && !this.callouts.shouting) this.hooray();
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
