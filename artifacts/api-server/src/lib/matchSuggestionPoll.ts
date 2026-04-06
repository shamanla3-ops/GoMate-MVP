import {
  and,
  count,
  db,
  eq,
  isNotNull,
  isNull,
  matchSuggestionStates,
} from "@gomate/db";

/**
 * Lightweight poll snapshot for notification badges + one-shot client cues.
 * Does NOT run computeMatchSuggestions — reads/updates persisted state only.
 *
 * - newMatchCount: rows with seen_at IS NULL (may include stale keys until next reconcile)
 * - matchNewNotifiedKeys: keys delivered to the polling client for this response only
 *   (poll_delivered_at set), deduped server-side across polls
 */
export async function getMatchSuggestionPollSnapshot(userId: string): Promise<{
  newMatchCount: number;
  matchNewNotifiedKeys: string[];
}> {
  const [countRow] = await db
    .select({ n: count() })
    .from(matchSuggestionStates)
    .where(
      and(eq(matchSuggestionStates.userId, userId), isNull(matchSuggestionStates.seenAt))
    );

  const newMatchCount = Number(countRow?.n ?? 0);

  const claimed = await db
    .update(matchSuggestionStates)
    .set({ pollDeliveredAt: new Date() })
    .where(
      and(
        eq(matchSuggestionStates.userId, userId),
        isNull(matchSuggestionStates.seenAt),
        isNull(matchSuggestionStates.pollDeliveredAt),
        isNotNull(matchSuggestionStates.inAppNotifiedAt)
      )
    )
    .returning({ suggestionKey: matchSuggestionStates.suggestionKey });

  return {
    newMatchCount,
    matchNewNotifiedKeys: claimed.map((r) => r.suggestionKey),
  };
}
