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
