/** The next track of the whole library: a random one, never the one playing now. */
export function nextTrack(tracks: string[], current: string | null, rnd: () => number = Math.random): string | null {
  const others = tracks.filter((t) => t !== current);
  return others.length ? others[Math.min(others.length - 1, Math.floor(rnd() * others.length))] : null;
}
