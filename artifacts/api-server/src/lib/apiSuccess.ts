/** Legacy English copy for clients that read `message`; prefer `messageCode` in new clients */
const SUCCESS_LEGACY: Record<string, string> = {
  PROFILE_SAVED: "Profile saved",
  REQUEST_SENT: "Request sent to the driver",
  REQUEST_ACCEPTED: "Request accepted",
  REQUEST_REJECTED: "Request rejected",
  REQUEST_CANCELLED: "Request cancelled",
  REQUEST_PARTICIPATION_CANCELLED: "Participation cancelled",
  PUSH_SUBSCRIPTION_SAVED: "Push subscription saved",
  TRIP_DELETED: "Trip deleted",
  TRIP_CREATED: "Trip created",
  TEMPLATE_CREATED: "Template created",
  TEMPLATE_DELETED: "Template deleted",
  REVIEW_SUBMITTED: "Review submitted",
  EMAIL_VERIFIED: "Email verified",
  TERMS_ACCEPTED: "Terms accepted",
  PP_REQUEST_CREATED: "Regular ride request sent",
  PP_REQUEST_ACCEPTED: "Regular ride accepted",
  PP_REQUEST_REJECTED: "Regular ride request declined",
  PP_REQUEST_CANCELLED: "Regular ride request withdrawn",
  PP_RELATIONSHIP_ENDED: "Regular ride relationship ended",
  PP_SKIP_REGISTERED: "Skip registered for this date",
  MATCH_PREFERENCES_LISTED: "Match preferences loaded",
  MATCH_PREFERENCE_CREATED: "Match preference saved",
  MATCH_PREFERENCE_UPDATED: "Match preference updated",
  MATCH_PREFERENCE_DELETED: "Match preference removed",
  MATCH_SUGGESTIONS_LISTED: "Suggestions loaded",
  MATCH_SUGGESTION_DISMISSED: "Suggestion dismissed",
  MATCH_SUGGESTIONS_SEEN: "Match suggestions marked as seen",
  MATCH_SUGGESTIONS_POLL: "Match poll snapshot loaded",
  MATCH_SUGGESTIONS_RECONCILED: "Match suggestions reconciled",
};

export function withApiSuccess<T extends Record<string, unknown>>(
  body: T,
  messageCode: string
): T & { messageCode: string; message: string } {
  return {
    ...body,
    messageCode,
    message: SUCCESS_LEGACY[messageCode] ?? messageCode,
  };
}
