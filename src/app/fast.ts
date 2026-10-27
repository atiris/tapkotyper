/** Dev and e2e builds: `?fast` in the address cuts every wait (level minimums, breaks, play before a break) to a sixth, for quick testing. */
const FAST = (import.meta.env.DEV || import.meta.env.MODE === 'e2e') && typeof location !== 'undefined' && new URLSearchParams(location.search).has('fast');

/** `seconds`, or a sixth of it with `?fast`. */
export function fast(seconds: number): number {
  return FAST ? seconds / 6 : seconds;
}
