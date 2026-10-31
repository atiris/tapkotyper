import { app, layout } from '../../app/app';
import type { Rng } from '../../engine/rng';
import { t } from '../../i18n/i18n';
import type { TypedChar } from '../../input/input';
import { SHIFT_L, activeKeys, isLetterKey, shiftKeyOf } from '../../learning/lessons';
import { paintRound, rhythmRing, roundButton, roundPic } from '../../ui/hud';
import { type MenuEntry, menuPanel } from '../../ui/menu';
import { HELP_PLANS, type HelpHost, type HelpPlan, SuperHelper } from '../super-help';
import type { LevelState } from './state';

/** What the super help needs of the level besides its state. */
export interface SuperHost {
  readonly rng: Rng;
  readonly noPressure: boolean;
  /** The share of the level done. */
  share(): number;
  /** A key through the same handler as the child's, so everything counts as typed. */
  type(c: TypedChar): void;
}

/** The super player's help: the HUD button, its menu of how the game types for them, and the helper while it types. */
export class SuperHelp {
  readonly btn: HTMLButtonElement;
  private closeMenu: ((refocus?: boolean) => void) | null = null;
  private helper: SuperHelper | null = null;

  constructor(private state: LevelState, private host: SuperHost) {
    this.btn = roundButton('super', 'lifebuoy', t('super.help.title'), () => this.toggleMenu());
    this.btn.classList.add('super-help');
    this.btn.setAttribute('aria-haspopup', 'menu');
    this.paint();
  }

  /** The helper types its next keys while the level runs. */
  tick(dt: number): void {
    if (this.helper && !this.state.finished) this.helper.tick(dt, this.helpHost);
  }

  /** The menu: how the game types for the super player, or stop it. */
  private toggleMenu(): void {
    if (this.closeMenu) return this.closeMenu();
    const btn = this.btn;
    const entries: MenuEntry[] = (Object.keys(HELP_PLANS) as HelpPlan[]).map((plan) => ({ label: t(`super.help.${plan}`), art: roundPic('super', 'lifebuoy'), pick: () => this.start(plan) }));
    if (this.helper) entries.push({ label: t('super.help.stop'), art: roundPic('super', 'close'), pick: () => this.stop() });
    this.closeMenu = menuPanel(btn, t('super.help.title'), entries, (panel) => {
      const r = btn.getBoundingClientRect();
      panel.classList.add('service-menu');
      panel.style.top = `${r.bottom + 10}px`;
      panel.style.left = `${r.left}px`;
      panel.style.right = 'auto';
      document.querySelector('#app')!.append(panel);
    }, (refocus) => {
      this.closeMenu = null;
      if (refocus) btn.focus();
    });
  }

  private start(plan: HelpPlan): void {
    this.helper = new SuperHelper(plan, () => this.host.rng.next());
    this.paint();
  }

  private stop(): void {
    this.helper = null;
    this.paint();
  }

  /** A full ring around the button while the super help types, like the other round buttons show their state. */
  private paint(): void {
    paintRound(this.btn, 'lifebuoy', this.helper ? rhythmRing(1) : '');
    this.btn.setAttribute('aria-pressed', String(!!this.helper));
  }

  private readonly helpHost: HelpHost = {
    progress: () => this.host.share(),
    next: () => {
      const { core } = this.state;
      const tg = core.focus();
      if (!tg || !core.typable(tg)) return null;
      return { ch: tg.word[tg.typed], last: tg.typed === tg.word.length - 1 };
    },
    press: (ch) => {
      const shift = shiftKeyOf(layout(), ch);
      this.host.type({ ch, code: '', shift: !!shift, shiftCode: shift ? (shift === SHIFT_L ? 'ShiftLeft' : 'ShiftRight') : null, time: performance.now() });
    },
    wrongKey: () => {
      const expected = this.state.core.expectedChar();
      const keys = activeKeys(app.profile!).filter((k) => isLetterKey(k) && k !== expected);
      return keys.length ? this.host.rng.pick(keys) : expected === 'x' ? 'q' : 'x';
    },
    missed: () => this.state.core.missed,
    canMiss: () => !this.host.noPressure,
  };
}
