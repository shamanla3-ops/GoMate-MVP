const STORAGE_KEY = "gomate-match-sound-acked-v1";

/**
 * Plays at most one sound per batch of newly surfaced suggestion keys.
 * Persists ack so polling / revisits do not replay audio for the same match.
 */
export function applyMatchSoundAck(keys: string[], play: () => void): void {
  if (keys.length === 0) return;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const ack = new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
    let fresh = false;
    for (const k of keys) {
      if (!ack.has(k)) {
        ack.add(k);
        fresh = true;
      }
    }
    if (fresh) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...ack].slice(-200)));
      play();
    }
  } catch {
    /* ignore */
  }
}
