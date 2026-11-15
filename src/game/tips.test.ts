import { describe, expect, it } from 'vitest';
import { LAYOUTS } from '../keyboard/layouts';
import { tipFits, tipKeys } from './tips';

const LAYOUT_TIPS = ['yz-swap', 'z-finger', 'number-row', 'dead-keys', 'caron-shift', 'accent-pinky', 'diacritics-fun'];
const fitting = (id: keyof typeof LAYOUTS) => LAYOUT_TIPS.filter((tip) => tipFits(tip, LAYOUTS[id]));

describe('tips', () => {
  it('offers a tip only on a layout that has what it talks about', () => {
    expect(fitting('sk-qwertz')).toEqual(LAYOUT_TIPS);
    expect(fitting('sk-qwerty')).toEqual(LAYOUT_TIPS.filter((tip) => tip !== 'yz-swap' && tip !== 'z-finger'));
    expect(fitting('us-qwerty')).toEqual([]);
    expect(tipFits('back', LAYOUTS['us-qwerty'])).toBe(true);
  });

  it('names the keys of the layout', () => {
    expect(tipKeys(LAYOUTS['sk-qwertz'])).toEqual({ pinky: 'Ô', numberRow: 'ľ š č ť ž ý á í é', pinkyKeys: 'ú ä ô ň' });
    expect(tipKeys(LAYOUTS['us-qwerty']).pinky).toBe(';');
  });
});
