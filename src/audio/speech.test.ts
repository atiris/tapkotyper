import { describe, expect, it } from 'vitest';
import { pickVoice } from './speech';

describe('voice picker', () => {
  const voices = [
    { name: 'en-online', lang: 'en-US', localService: false },
    { name: 'sk-online', lang: 'sk-SK', localService: false },
    { name: 'en-local', lang: 'en_GB', localService: true },
  ];

  it('takes a local voice of the language first', () => {
    expect(pickVoice(voices, 'en')?.name).toBe('en-local');
  });

  it('takes any voice of the language when none is local', () => {
    expect(pickVoice(voices, 'sk')?.name).toBe('sk-online');
  });

  it('has none for a language without voices', () => {
    expect(pickVoice(voices, 'de')).toBeNull();
  });
});
