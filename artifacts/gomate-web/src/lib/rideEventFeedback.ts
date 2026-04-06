/**
 * Session-scoped dedupe for ride request UI sounds / match modal.
 * Survives React Strict Mode remounts; avoids replays on rehydrate.
 */

const INCOMING_SEEDED = "gomate_incoming_pending_sound_seeded_v1";
const INCOMING_KNOWN = "gomate_incoming_pending_sound_known_v1";
const OUTGOING_STATUS = "gomate_outgoing_status_snapshot_v1";
const MATCH_MODAL_PREFIX = "gomate_match_modal_done_v1_";

function readJsonArray(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Pending incoming request ids that are new since the first seeded load this session. */
export function consumeNewIncomingPendingRequestIds(currentPendingIds: string[]): string[] {
  if (typeof window === "undefined") return [];
  try {
    const seeded = sessionStorage.getItem(INCOMING_SEEDED);
    const known = new Set(readJsonArray(sessionStorage.getItem(INCOMING_KNOWN)));

    if (!seeded) {
      sessionStorage.setItem(INCOMING_SEEDED, "1");
      for (const id of currentPendingIds) known.add(id);
      sessionStorage.setItem(INCOMING_KNOWN, JSON.stringify([...known]));
      return [];
    }

    const newIds = currentPendingIds.filter((id) => !known.has(id));
    for (const id of currentPendingIds) known.add(id);
    sessionStorage.setItem(INCOMING_KNOWN, JSON.stringify([...known]));
    return newIds;
  } catch {
    return [];
  }
}

export type OutgoingStatusSnapshot = { id: string; status: string };

/**
 * Returns request ids that transitioned from pending → accepted since last snapshot write.
 */
export function consumePendingToAcceptedOutgoing(
  requests: OutgoingStatusSnapshot[]
): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(OUTGOING_STATUS);
    let prev: Record<string, string> = {};
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as unknown;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          prev = parsed as Record<string, string>;
        }
      } catch {
        prev = {};
      }
    }

    const hits: string[] = [];
    const next: Record<string, string> = { ...prev };

    for (const r of requests) {
      const was = prev[r.id];
      if (was === "pending" && r.status === "accepted") {
        hits.push(r.id);
      }
      next[r.id] = r.status;
    }

    sessionStorage.setItem(OUTGOING_STATUS, JSON.stringify(next));
    return hits;
  } catch {
    return [];
  }
}

/** One match celebration per request id per browser tab session. */
export function consumeMatchCelebrationOnce(requestId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const k = MATCH_MODAL_PREFIX + requestId;
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, "1");
    return true;
  } catch {
    return false;
  }
}
