import { describe, expect, it } from 'vitest';
import { foldName, matchNick } from './nick-pick';

describe('nickname pick', () => {
  it('folds case and accents', () => {
    expect(foldName('Šimon Ľubo')).toBe('simon lubo');
  });

  it('picks the one name that begins with two typed letters, without accents', () => {
    const names = ['Ema', 'Šimon', 'Sára'];
    expect(matchNick(names, 's')).toBeNull();
    expect(matchNick(names, 'si')).toBe(1);
    expect(matchNick(names, 'SA')).toBe(2);
    expect(matchNick(names, 'em')).toBe(0);
  });

  it('waits while several names fit, and finds none for other letters', () => {
    const names = ['Ema', 'Emil'];
    expect(matchNick(names, 'em')).toBeNull();
    expect(matchNick(names, 'emi')).toBe(1);
    expect(matchNick(names, 'x')).toBeNull();
    expect(matchNick(names, '')).toBeNull();
  });

  it('a one-letter name is picked by its letter', () => {
    expect(matchNick(['J', 'Ema'], 'j')).toBe(0);
    expect(matchNick(['Jana', 'Ema'], 'j')).toBeNull();
  });
});
