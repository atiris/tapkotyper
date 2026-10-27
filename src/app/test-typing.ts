import { ENTER, shiftKeyFor, stepsFor } from '../keyboard/layouts';
import { layout } from './app';

/** One key event as the browser sends it. */
function press(type: 'keydown' | 'keyup', key: string, code: string, shiftKey: boolean): void {
  window.dispatchEvent(new KeyboardEvent(type, { key, code, shiftKey, bubbles: true, cancelable: true }));
}

/**
 * Dev and e2e builds: `window.tapkoType(text)` types like a child on the player's layout, with
 * the real key codes, Shift held for capitals and a dead key before a composed letter (ô, ä, ľ),
 * so testing through the browser types every character the game asks for. A browser driver's own
 * typing sends the US layout's keys, which the Slovak keyboard does not match.
 */
export function installTestTyping(): void {
  if (!(import.meta.env.DEV || import.meta.env.MODE === 'e2e')) return;
  (window as unknown as { tapkoType: (text: string) => void }).tapkoType = (text) => {
    for (const ch of text) {
      if (ch === ENTER) {
        press('keydown', 'Enter', 'Enter', false);
        press('keyup', 'Enter', 'Enter', false);
        continue;
      }
      const steps = stepsFor(layout(), ch);
      steps.forEach((step, i) => {
        const shift = shiftKeyFor(layout(), step);
        if (shift) press('keydown', 'Shift', shift, true);
        // The browser names a dead key Dead and gives the letter after it already composed.
        const key = i < steps.length - 1 ? 'Dead' : ch;
        press('keydown', key, step.code, step.shift);
        press('keyup', key, step.code, step.shift);
        if (shift) press('keyup', 'Shift', shift, false);
      });
    }
  };
}
