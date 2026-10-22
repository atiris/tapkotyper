/** Reading aloud with the browser's speech voices (they work offline). */

const RATE = 0.9;

/** The voice for a language: a local one whose language starts with it, else any such voice. */
export function pickVoice<V extends { lang: string; localService: boolean }>(voices: V[], lang: string): V | null {
  const fits = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(lang.toLowerCase()));
  return fits.find((v) => v.localService) ?? fits[0] ?? null;
}

class Speech {
  private voices: SpeechSynthesisVoice[] = [];
  private listeners = new Set<() => void>();
  private synth = typeof speechSynthesis === 'undefined' ? null : speechSynthesis;

  constructor() {
    if (!this.synth) return;
    const load = () => {
      this.voices = this.synth!.getVoices();
      this.listeners.forEach((l) => l());
    };
    load();
    this.synth.addEventListener('voiceschanged', load);
  }

  /** Called when the voices change (browsers load them late); returns the unsubscribe. */
  onVoices(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  available(lang: string): boolean {
    return !!pickVoice(this.voices, lang);
  }

  /** Queues a line after the ones still being read. */
  say(text: string, lang: string): void {
    const voice = pickVoice(this.voices, lang);
    if (!this.synth || !voice || !text.trim()) return;
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = RATE;
    this.synth.speak(u);
  }

  stop(): void {
    this.synth?.cancel();
  }
}

export const speech = new Speech();
