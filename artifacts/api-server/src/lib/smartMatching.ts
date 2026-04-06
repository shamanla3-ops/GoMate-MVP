import {
  and,
  db,
  eq,
  gt,
  inArray,
  ne,
  or,
  routeMatchPreferences,
  routeTemplates,
  trips,
  tripRequests,
  users,
  permanentPassengerRelationships,
  matchSuggestionDismissals,
} from "@gomate/db";

export const VALID_WEEKDAYS = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;

export type SuggestionReason =
  | "same_route"
  | "weekday_overlap"
  | "time_close"
  | "morning_commute"
  | "evening_commute";

export type MatchSuggestionDto = {
  id: string;
  kind: "trip" | "template" | "passenger_preference";
  origin: string;
  destination: string;
  weekdays: string[];
  timeLabel: string;
  reasons: SuggestionReason[];
  tripId?: string;
  templateId?: string;
  preferenceId?: string;
  otherUserId: string;
  otherUserName: string;
  priceCents?: number;
  currency?: "EUR" | "USD" | "PLN";
  availableSeats?: number;
  tripType?: "one-time" | "regular";
};

export type EnrichedMatchSuggestionDto = MatchSuggestionDto & {
  isNew: boolean;
  seenAt: string | null;
};

const DEFAULT_TIME_WINDOW_MIN = 30;
const MAX_RESULTS = 24;

export function normalizeRouteText(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function routesMatch(a: string, b: string): boolean {
  const na = normalizeRouteText(a);
  const nb = normalizeRouteText(b);
  if (na.length < 2 || nb.length < 2) return false;
  if (na === nb) return true;
  return na.includes(nb) || nb.includes(na);
}

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = String(value).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (
    Number.isNaN(h) ||
    Number.isNaN(min) ||
    h < 0 ||
    h > 23 ||
    min < 0 ||
    min > 59
  ) {
    return null;
  }
  return h * 60 + min;
}

function minutesFromDateUtc(d: Date): number {
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

function weekdayKeyUtc(d: Date): (typeof VALID_WEEKDAYS)[number] {
  const day = d.getUTCDay();
  const map: Record<number, (typeof VALID_WEEKDAYS)[number]> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  };
  return map[day] ?? "mon";
}

export function weekdaysOverlap(a: string[], b: string[] | null | undefined): boolean {
  if (!b || b.length === 0) return false;
  const set = new Set(a);
  return b.some((x) => set.has(x));
}

function timeCloseEnough(
  prefMinutes: number,
  candidateMinutes: number,
  flexExtra: number | null | undefined
): boolean {
  const flex = DEFAULT_TIME_WINDOW_MIN + (flexExtra ?? 0);
  let diff = Math.abs(prefMinutes - candidateMinutes);
  diff = Math.min(diff, 24 * 60 - diff);
  return diff <= flex;
}

function commuteBandFromMinutes(
  min: number | null | undefined
): "morning_commute" | "evening_commute" | null {
  if (min === null || min === undefined) return null;
  const h = Math.floor(min / 60);
  if (h >= 5 && h <= 11) return "morning_commute";
  if (h >= 16 && h <= 20) return "evening_commute";
  return null;
}

function uniqReasons(r: SuggestionReason[]): SuggestionReason[] {
  const seen = new Set<SuggestionReason>();
  const out: SuggestionReason[] = [];
  for (const x of r) {
    if (seen.has(x)) continue;
    seen.add(x);
    out.push(x);
  }
  return out;
}

export function buildMatchReasons(
  sameRoute: boolean,
  weekday: boolean,
  timeOk: boolean,
  anchorMinutes: number | null,
  otherMinutes: number | null
): SuggestionReason[] {
  const r: SuggestionReason[] = [];
  if (sameRoute) r.push("same_route");
  if (weekday) r.push("weekday_overlap");
  if (timeOk) r.push("time_close");
  const bandA = commuteBandFromMinutes(anchorMinutes);
  const bandB = commuteBandFromMinutes(otherMinutes);
  if (bandA && bandB && bandA === bandB) {
    r.push(bandA);
  } else if (bandA) {
    r.push(bandA);
  } else if (bandB) {
    r.push(bandB);
  }
  return uniqReasons(r);
}

async function loadDismissedSet(userId: string): Promise<Set<string>> {
  const rows = await db
    .select()
    .from(matchSuggestionDismissals)
    .where(eq(matchSuggestionDismissals.userId, userId));
  const set = new Set<string>();
  for (const row of rows) {
    set.add(`${row.targetType}:${row.targetId}`);
  }
  return set;
}

async function loadActiveRelationships(userId: string) {
  const rels = await db
    .select()
    .from(permanentPassengerRelationships)
    .where(
      and(
        eq(permanentPassengerRelationships.status, "active"),
        or(
          eq(permanentPassengerRelationships.driverId, userId),
          eq(permanentPassengerRelationships.passengerId, userId)
        )
      )
    );
  return rels;
}

function relationshipBlocksPair(
  rel: (typeof permanentPassengerRelationships.$inferSelect),
  viewerId: string,
  otherId: string,
  origin: string,
  destination: string
): boolean {
  const involves =
    (rel.driverId === viewerId && rel.passengerId === otherId) ||
    (rel.driverId === otherId && rel.passengerId === viewerId);
  if (!involves) return false;
  const o = rel.originText?.trim();
  const d = rel.destinationText?.trim();
  if (o && d && routesMatch(o, origin) && routesMatch(d, destination)) {
    return true;
  }
  return false;
}

export async function computeMatchSuggestions(
  userId: string
): Promise<MatchSuggestionDto[]> {
  const dismissed = await loadDismissedSet(userId);
  const relationships = await loadActiveRelationships(userId);

  const myPrefs = await db
    .select()
    .from(routeMatchPreferences)
    .where(
      and(
        eq(routeMatchPreferences.userId, userId),
        eq(routeMatchPreferences.isActive, true)
      )
    );

  const wantPassenger =
    myPrefs.filter((p) => p.role === "passenger" || p.role === "both").length >
    0;
  const wantDriver =
    myPrefs.filter((p) => p.role === "driver" || p.role === "both").length > 0;

  const out: MatchSuggestionDto[] = [];

  /** Passenger / both: trips + templates from others */
  if (wantPassenger) {
    const prefs = myPrefs.filter((p) => p.role === "passenger" || p.role === "both");

    const existingPassengerTrips = await db
      .select({ tripId: tripRequests.tripId })
      .from(tripRequests)
      .where(
        and(
          eq(tripRequests.passengerId, userId),
          inArray(tripRequests.status, ["pending", "accepted"])
        )
      );
    const blockedTripIds = new Set(existingPassengerTrips.map((r) => r.tripId));

    const tripRows = await db
      .select({ trip: trips, driver: users })
      .from(trips)
      .innerJoin(users, eq(trips.driverId, users.id))
      .where(
        and(
          eq(trips.status, "scheduled"),
          gt(trips.availableSeats, 0),
          ne(trips.driverId, userId)
        )
      );

    const addedTripIds = new Set<string>();

    for (const row of tripRows) {
      const t = row.trip;
      const idKey = `trip:${t.id}`;
      if (addedTripIds.has(t.id)) continue;
      if (dismissed.has(`trip:${t.id}`)) continue;
      if (blockedTripIds.has(t.id)) continue;

      for (const pref of prefs) {
        if (!routesMatch(pref.originText, t.origin)) continue;
        if (!routesMatch(pref.destinationText, t.destination)) continue;

        const prefTime = parseTimeToMinutes(pref.preferredTime);
        const dep = new Date(t.departureTime);
        const tripMin = minutesFromDateUtc(dep);
        const tripWd = weekdayKeyUtc(dep);

        let wdOk = false;
        if (t.tripType === "regular" && t.weekdays && t.weekdays.length > 0) {
          wdOk = weekdaysOverlap(pref.weekdays, t.weekdays);
        } else {
          wdOk = pref.weekdays.includes(tripWd);
        }

        const timeOk =
          prefTime === null
            ? true
            : timeCloseEnough(prefTime, tripMin, pref.timeFlexMinutes);

        if (!wdOk) continue;

        const sameRoute = true;
        const reasons = buildMatchReasons(
          sameRoute,
          wdOk,
          timeOk,
          prefTime,
          tripMin
        );
        if (reasons.length === 0) continue;

        let blocked = false;
        for (const rel of relationships) {
          if (
            relationshipBlocksPair(rel, userId, t.driverId, t.origin, t.destination)
          ) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        addedTripIds.add(t.id);
        out.push({
          id: idKey,
          kind: "trip",
          origin: t.origin,
          destination: t.destination,
          weekdays:
            t.tripType === "regular" && t.weekdays?.length
              ? t.weekdays
              : [tripWd],
          timeLabel: dep.toISOString(),
          reasons,
          tripId: t.id,
          otherUserId: t.driverId,
          otherUserName: row.driver.name,
          priceCents: t.price,
          currency: t.currency as "EUR" | "USD" | "PLN",
          availableSeats: t.availableSeats,
          tripType: t.tripType as "one-time" | "regular",
        });
        break;
      }
    }

    const templateRows = await db
      .select({ tpl: routeTemplates, owner: users })
      .from(routeTemplates)
      .innerJoin(users, eq(routeTemplates.userId, users.id))
      .where(ne(routeTemplates.userId, userId));

    const addedTemplateIds = new Set<string>();

    for (const row of templateRows) {
      const tpl = row.tpl;
      if (addedTemplateIds.has(tpl.id)) continue;
      if (dismissed.has(`template:${tpl.id}`)) continue;

      for (const pref of prefs) {
        if (!routesMatch(pref.originText, tpl.origin)) continue;
        if (!routesMatch(pref.destinationText, tpl.destination)) continue;
        if (tpl.tripType !== "regular" || !tpl.weekdays?.length) continue;
        if (!weekdaysOverlap(pref.weekdays, tpl.weekdays)) continue;

        const tplTime = parseTimeToMinutes(tpl.defaultDepartureTime);
        const prefTime = parseTimeToMinutes(pref.preferredTime);
        const timeOk =
          prefTime === null || tplTime === null
            ? true
            : timeCloseEnough(prefTime, tplTime, pref.timeFlexMinutes);

        if (!timeOk) continue;

        let blocked = false;
        for (const rel of relationships) {
          if (
            relationshipBlocksPair(
              rel,
              userId,
              tpl.userId,
              tpl.origin,
              tpl.destination
            )
          ) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        addedTemplateIds.add(tpl.id);
        out.push({
          id: `template:${tpl.id}`,
          kind: "template",
          origin: tpl.origin,
          destination: tpl.destination,
          weekdays: tpl.weekdays ?? [],
          timeLabel: tpl.defaultDepartureTime ?? "",
          reasons: buildMatchReasons(true, true, timeOk, prefTime, tplTime),
          templateId: tpl.id,
          otherUserId: tpl.userId,
          otherUserName: row.owner.name,
          priceCents: tpl.price,
          currency: tpl.currency as "EUR" | "USD" | "PLN",
          availableSeats: tpl.availableSeats,
          tripType: tpl.tripType as "one-time" | "regular",
        });
        break;
      }
    }
  }

  /** Driver / both: passenger preferences from others */
  if (wantDriver) {
    const prefs = myPrefs.filter((p) => p.role === "driver" || p.role === "both");
    const others = await db
      .select()
      .from(routeMatchPreferences)
      .where(
        and(
          ne(routeMatchPreferences.userId, userId),
          eq(routeMatchPreferences.isActive, true),
          or(
            eq(routeMatchPreferences.role, "passenger"),
            eq(routeMatchPreferences.role, "both")
          )
        )
      );

    const addedPreferenceIds = new Set<string>();

    for (const op of others) {
      const idKey = `preference:${op.id}`;
      if (addedPreferenceIds.has(op.id)) continue;
      if (dismissed.has(`preference:${op.id}`)) continue;

      const otherUser = await db
        .select()
        .from(users)
        .where(eq(users.id, op.userId))
        .limit(1);
      const otherName = otherUser[0]?.name ?? "?";

      for (const pref of prefs) {
        if (!routesMatch(pref.originText, op.originText)) continue;
        if (!routesMatch(pref.destinationText, op.destinationText)) continue;
        if (!weekdaysOverlap(pref.weekdays, op.weekdays)) continue;

        const prefTime = parseTimeToMinutes(pref.preferredTime);
        const opTime = parseTimeToMinutes(op.preferredTime);
        const timeOk =
          prefTime === null || opTime === null
            ? true
            : timeCloseEnough(prefTime, opTime, pref.timeFlexMinutes ?? op.timeFlexMinutes);

        if (!timeOk) continue;

        let blocked = false;
        for (const rel of relationships) {
          if (
            relationshipBlocksPair(
              rel,
              userId,
              op.userId,
              op.originText,
              op.destinationText
            )
          ) {
            blocked = true;
            break;
          }
        }
        if (blocked) continue;

        addedPreferenceIds.add(op.id);
        out.push({
          id: idKey,
          kind: "passenger_preference",
          origin: op.originText,
          destination: op.destinationText,
          weekdays: op.weekdays,
          timeLabel: op.preferredTime,
          reasons: buildMatchReasons(true, true, timeOk, prefTime, opTime),
          preferenceId: op.id,
          otherUserId: op.userId,
          otherUserName: otherName,
        });
        break;
      }
    }
  }

  const seen = new Set<string>();
  const deduped: MatchSuggestionDto[] = [];
  for (const s of out) {
    if (seen.has(s.id)) continue;
    seen.add(s.id);
    deduped.push(s);
    if (deduped.length >= MAX_RESULTS) break;
  }
  return deduped;
}

export function validateWeekdays(days: string[]): boolean {
  if (!days.length) return false;
  const set = new Set(VALID_WEEKDAYS);
  return days.every((d) => set.has(d as (typeof VALID_WEEKDAYS)[number]));
}

export function validateRole(
  r: string
): r is "passenger" | "driver" | "both" {
  return r === "passenger" || r === "driver" || r === "both";
}
