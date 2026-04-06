import {
  and,
  db,
  eq,
  inArray,
  matchSuggestionStates,
} from "@gomate/db";
import {
  computeMatchSuggestions,
  type EnrichedMatchSuggestionDto,
} from "./smartMatching.js";

/**
 * Upserts visibility rows for current suggestions, returns enriched DTOs and keys
 * that were inserted for the first time (used for sound + one-shot client cues).
 */
export async function syncMatchSuggestionsWithState(userId: string): Promise<{
  suggestions: EnrichedMatchSuggestionDto[];
  newNotifiedKeys: string[];
  newMatchCount: number;
}> {
  const suggestions = await computeMatchSuggestions(userId);
  if (suggestions.length === 0) {
    return { suggestions: [], newNotifiedKeys: [], newMatchCount: 0 };
  }

  const newNotifiedKeys: string[] = [];
  const now = new Date();

  for (const s of suggestions) {
    const inserted = await db
      .insert(matchSuggestionStates)
      .values({
        userId,
        suggestionKey: s.id,
        firstSeenAt: now,
        inAppNotifiedAt: now,
        pollDeliveredAt: null,
        pushPayload: {
          kind: s.kind,
          tripId: s.tripId ?? null,
          templateId: s.templateId ?? null,
          preferenceId: s.preferenceId ?? null,
          otherUserId: s.otherUserId,
        },
      })
      .onConflictDoNothing()
      .returning({ suggestionKey: matchSuggestionStates.suggestionKey });

    if (inserted.length > 0) {
      newNotifiedKeys.push(inserted[0].suggestionKey);
    }
  }

  const keys = suggestions.map((s) => s.id);
  const stateRows = await db
    .select()
    .from(matchSuggestionStates)
    .where(
      and(
        eq(matchSuggestionStates.userId, userId),
        inArray(matchSuggestionStates.suggestionKey, keys)
      )
    );

  const byKey = new Map(stateRows.map((r) => [r.suggestionKey, r]));

  let newMatchCount = 0;
  const enriched: EnrichedMatchSuggestionDto[] = suggestions.map((s) => {
    const row = byKey.get(s.id);
    const seenAt = row?.seenAt ?? null;
    const isNew = !seenAt;
    if (isNew) newMatchCount += 1;
    return {
      ...s,
      isNew,
      seenAt: seenAt ? seenAt.toISOString() : null,
    };
  });

  return { suggestions: enriched, newNotifiedKeys, newMatchCount };
}

export async function markMatchSuggestionsSeen(
  userId: string,
  suggestionKeys: string[]
): Promise<void> {
  if (suggestionKeys.length === 0) return;
  const now = new Date();
  await db
    .update(matchSuggestionStates)
    .set({ seenAt: now })
    .where(
      and(
        eq(matchSuggestionStates.userId, userId),
        inArray(matchSuggestionStates.suggestionKey, suggestionKeys)
      )
    );
}

export async function deleteMatchSuggestionState(
  userId: string,
  suggestionKey: string
): Promise<void> {
  await db
    .delete(matchSuggestionStates)
    .where(
      and(
        eq(matchSuggestionStates.userId, userId),
        eq(matchSuggestionStates.suggestionKey, suggestionKey)
      )
    );
}
