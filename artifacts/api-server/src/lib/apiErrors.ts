import type { Response } from "express";

/** Stable machine-readable codes; optional legacy `error` string for older clients */
const LEGACY_MESSAGES: Record<string, string> = {
  AUTH_MISSING_HEADER: "Missing or invalid Authorization header",
  SERVER_MISCONFIGURED: "Server misconfiguration",
  AUTH_TOKEN_INVALID: "Invalid or expired token",

  AUTH_REGISTER_FIELDS_MISSING: "Missing required fields: email, password, name",
  AUTH_TERMS_REQUIRED: "You must accept the Terms of Use to register",
  AUTH_EMAIL_IN_USE: "Email already registered",
  AUTH_REGISTRATION_FAILED: "Registration failed",

  AUTH_LOGIN_FIELDS_MISSING: "Missing email or password",
  AUTH_INVALID_CREDENTIALS: "Invalid email or password",
  AUTH_EMAIL_NOT_VERIFIED: "Please verify your email",
  AUTH_LOGIN_FAILED: "Login failed",

  AUTH_ACCEPT_TERMS_FAILED: "Could not save terms acceptance",

  AUTH_VERIFY_TOKEN_MISSING: "Verification token is required",
  AUTH_VERIFY_TOKEN_INVALID: "Invalid or expired verification token",
  AUTH_VERIFY_FAILED: "Email verification failed",

  AUTH_RESEND_VERIFICATION_EMAIL_MISSING: "Email is required",
  AUTH_RESEND_VERIFICATION_FAILED: "Could not process resend verification request",

  UNAUTHORIZED: "Unauthorized",

  USER_NOT_FOUND: "User not found",
  PROFILE_LOAD_FAILED: "Failed to load profile",

  TRIP_CREATE_FIELDS_MISSING:
    "Missing required fields: origin, destination, departureTime, seatsTotal, price, currency, tripType",
  TRIP_COORDINATES_INVALID:
    "Valid coordinates are required for origin and destination (originLat, originLng, destinationLat, destinationLng)",
  TRIP_SEATS_INVALID: "seatsTotal must be at least 1",
  TRIP_PRICE_INVALID: "price must be a positive number or 0",
  TRIP_CURRENCY_INVALID: "currency must be EUR, USD, or PLN",
  TRIP_TYPE_INVALID: "tripType must be one-time or regular",
  TRIP_DEPARTURE_INVALID: "departureTime must be a valid date",
  TRIP_WEEKDAYS_ARRAY_REQUIRED: "weekdays must be an array for regular trips",
  TRIP_WEEKDAYS_EMPTY:
    "regular trips must have at least one weekday (mon, tue, wed, thu, fri, sat, sun)",
  TRIP_DRIVER_MISSING: "Driver not found after trip creation",
  DATABASE_SCHEMA_OUTDATED_TRIPS:
    "Database schema is out of date (missing columns). Run migrations / SQL for trips (coordinates, weekdays).",
  TRIP_CREATE_FAILED: "Failed to create trip",
  TRIP_SEARCH_FAILED: "Failed to search trips",
  TRIP_LIST_FAILED: "Failed to load trips",
  TRIP_ID_REQUIRED: "Trip id is required",
  TRIP_NOT_FOUND: "Trip not found",
  TRIP_DETAILS_FAILED: "Failed to load trip details",
  TRIP_DELETE_FORBIDDEN: "You do not have permission to delete this trip",
  TRIP_ALREADY_CANCELLED: "Trip is already cancelled",
  TRIP_DELETE_FAILED: "Failed to delete trip",

  TEMPLATE_FIELDS_MISSING:
    "Missing required fields: name, origin, destination, availableSeats, price, currency, tripType",
  TEMPLATE_COORDINATES_INVALID:
    "Valid coordinates are required for origin and destination (originLat, originLng, destinationLat, destinationLng)",
  TEMPLATE_SEATS_INVALID: "availableSeats must be at least 1",
  TEMPLATE_PRICE_INVALID: "price must be a positive number or 0",
  TEMPLATE_CURRENCY_INVALID: "currency must be EUR, USD, or PLN",
  TEMPLATE_TYPE_INVALID: "tripType must be one-time or regular",
  TEMPLATE_WEEKDAYS_ARRAY_REQUIRED: "weekdays must be an array for regular templates",
  TEMPLATE_WEEKDAYS_EMPTY:
    "regular templates must have at least one weekday (mon, tue, wed, thu, fri, sat, sun)",
  TEMPLATE_CREATE_FAILED: "Failed to create template",
  TEMPLATE_LIST_FAILED: "Failed to load templates",
  TEMPLATE_ID_REQUIRED: "Template id is required",
  TEMPLATE_NOT_FOUND: "Template not found",
  TEMPLATE_DELETE_FORBIDDEN: "You do not have permission to delete this template",
  TEMPLATE_DELETE_FAILED: "Failed to delete template",

  REQUEST_TRIP_ID_REQUIRED: "tripId is required",
  REQUEST_SEATS_INVALID: "seatsRequested must be at least 1",
  REQUEST_OWN_TRIP_FORBIDDEN: "You cannot join your own trip",
  TRIP_NOT_AVAILABLE: "This trip is not available anymore",
  TRIP_SEATS_NOT_ENOUGH: "Not enough free seats",
  TRIP_SEATS_NOT_ENOUGH_ACCEPT: "Not enough free seats anymore",
  REQUEST_DUPLICATE_ACTIVE: "You already have an active request for this trip",
  REQUEST_CREATE_FAILED: "Failed to create trip request",
  REQUEST_INCOMING_LOAD_FAILED: "Failed to load incoming requests",
  REQUEST_OUTGOING_LOAD_FAILED: "Failed to load outgoing requests",
  REQUEST_ID_REQUIRED: "Request id is required",
  REQUEST_NOT_FOUND: "Request not found",
  REQUEST_MANAGE_FORBIDDEN: "You cannot manage this request",
  REQUEST_ACCEPT_NOT_PENDING: "Only pending requests can be accepted",
  REQUEST_ACCEPT_FAILED: "Failed to accept trip request",
  REQUEST_REJECT_NOT_PENDING: "Only pending requests can be rejected",
  REQUEST_REJECT_FAILED: "Failed to reject trip request",
  REQUEST_CANCEL_FORBIDDEN: "You can cancel only your own request",
  REQUEST_CANCEL_INVALID_STATE: "Only pending or accepted requests can be cancelled",
  REQUEST_CANCEL_FAILED: "Failed to cancel trip request",

  CHAT_TRIP_ID_REQUIRED: "Trip id is required",
  CHAT_DRIVER_CANNOT_MESSAGE_SELF: "Driver cannot create chat with self",
  CHAT_OPEN_FAILED: "Failed to create or open chat",
  CHAT_LIST_FAILED: "Failed to load chats",
  CHAT_ID_REQUIRED: "Chat id is required",
  CHAT_NOT_FOUND: "Chat not found",
  CHAT_MESSAGES_LOAD_FAILED: "Failed to load messages",
  CHAT_MESSAGE_TEXT_REQUIRED: "Text is required",
  CHAT_MESSAGE_SEND_FAILED: "Failed to send message",
  CHAT_READ_FAILED: "Failed to mark chat as read",

  PROFILE_NAME_REQUIRED: "Name is required",
  PROFILE_AVATAR_TOO_LARGE: "Avatar is too large. Use a smaller image (max ~2 MB).",
  PROFILE_AGE_INVALID: "Age must be between 1 and 120",
  DATABASE_SCHEMA_OUTDATED:
    "Database schema is out of date. Run migrations (including user_reviews).",
  PROFILE_SAVE_FAILED: "Failed to save profile",

  REVIEWS_SUBJECT_REQUIRED: "subjectId query is required",
  REVIEWS_LIST_FAILED: "Failed to load reviews",
  REVIEWS_ELIGIBLE_FAILED: "Failed to load review targets",
  REVIEWS_BODY_INVALID: "tripId and revieweeId are required",
  REVIEWS_RATING_INVALID: "rating must be an integer from 1 to 5",
  REVIEWS_SELF_FORBIDDEN: "You cannot review yourself",
  REVIEWS_NOT_ALLOWED:
    "Reviews are available only after the trip is marked completed",
  REVIEWS_FORBIDDEN_TARGET:
    "You can only review your driver or accepted passengers on this trip",
  REVIEWS_COMMENT_REQUIRED: "Comment is required when rating is 3 or lower",
  REVIEWS_DUPLICATE: "You already reviewed this person for this trip",
  REVIEWS_TRIP_NOT_COMPLETED: "The trip must be completed before reviews are allowed",
  REVIEW_TASK_REQUIRED:
    "No pending review task for this person on this trip — use your review reminders or the trip page",
  DATABASE_SCHEMA_OUTDATED_REVIEWS:
    "Database schema is out of date. Run migrations for user_reviews.",
  REVIEWS_SUBMIT_FAILED: "Failed to submit review",

  REVIEW_TASKS_LOAD_FAILED: "Failed to load review tasks",
  REVIEW_TASK_ID_REQUIRED: "taskId is required",
  REVIEW_TASK_NOT_FOUND: "Review task not found",
  REVIEW_TASK_NOT_PENDING: "This review task is no longer pending",
  REVIEW_TASK_TRIP_UNAVAILABLE:
    "Trip is not available for review (must be completed, not cancelled)",
  REVIEW_TASK_NO_SHOW_REASON_INVALID: "Invalid noShowReason",
  REVIEW_TASK_RELATIONSHIP_INVALID: "Invalid review relationship for this trip",

  PUSH_SUBSCRIPTION_INVALID: "Invalid subscription",
  PUSH_SUBSCRIBE_FAILED: "Failed to subscribe",

  NOTIFICATION_SUMMARY_FAILED: "Failed to load notification summary",

  PP_DIRECTION_INVALID: "direction must be request or invitation",
  PP_TARGET_USER_REQUIRED: "targetUserId is required",
  PP_SAME_USER_FORBIDDEN: "Driver and passenger must be different users",
  PP_WEEKDAYS_INVALID: "weekdays must be a non-empty list of valid weekday codes",
  PP_NOTE_TOO_LONG: "note is too long",
  PP_PREFERRED_TIME_INVALID: "preferredTime is too long",
  PP_TRIP_NOT_FOUND: "Trip not found",
  PP_TRIP_CONTEXT_INVALID: "Trip context does not match the selected driver",
  PP_TEMPLATE_NOT_FOUND: "Template not found",
  PP_TEMPLATE_FORBIDDEN: "You cannot use this template in this request",
  PP_DUPLICATE_PENDING: "A pending permanent passenger request already exists for this pattern",
  PP_ACTIVE_EXISTS: "An active permanent passenger relationship already exists for this pattern",
  PP_CREATE_FAILED: "Failed to create permanent passenger request",
  PP_LOAD_INCOMING_FAILED: "Failed to load incoming permanent passenger requests",
  PP_LOAD_OUTGOING_FAILED: "Failed to load outgoing permanent passenger requests",
  PP_REQUEST_ID_REQUIRED: "Request id is required",
  PP_REQUEST_NOT_FOUND: "Permanent passenger request not found",
  PP_NOT_PARTICIPANT: "You are not part of this permanent passenger request",
  PP_ACCEPT_FORBIDDEN: "Only the recipient can accept this request",
  PP_REJECT_FORBIDDEN: "Only the recipient can reject this request",
  PP_CANCEL_FORBIDDEN: "Only the creator can cancel this request",
  PP_NOT_PENDING: "This request is not pending",
  PP_ACCEPT_FAILED: "Failed to accept permanent passenger request",
  PP_REJECT_FAILED: "Failed to reject permanent passenger request",
  PP_CANCEL_FAILED: "Failed to cancel permanent passenger request",
  PP_LOAD_RELATIONSHIPS_FAILED: "Failed to load permanent passenger relationships",
  PP_RELATIONSHIP_ID_REQUIRED: "Relationship id is required",
  PP_RELATIONSHIP_NOT_FOUND: "Permanent passenger relationship not found",
  PP_REL_NOT_ACTIVE: "This relationship is not active",
  PP_END_FORBIDDEN: "You cannot end this relationship",
  PP_END_FAILED: "Failed to end permanent passenger relationship",
  PP_SKIP_DATE_REQUIRED: "date is required (YYYY-MM-DD)",
  PP_SKIP_DATE_INVALID: "date must be a valid calendar day (YYYY-MM-DD)",
  PP_SKIP_PAST_FORBIDDEN: "Cannot register a skip for a past date",
  PP_SKIP_DUPLICATE: "A skip for this date already exists",
  PP_SKIP_FORBIDDEN: "You cannot register a skip for this relationship",
  PP_SKIP_FAILED: "Failed to register skip",
  PP_LOAD_SKIPS_FAILED: "Failed to load skips",
  PP_TRIP_CONTEXT_LOAD_FAILED: "Failed to load trip context for permanent passengers",

  SERVER_ERROR: "Something went wrong",
};

export function jsonApiError(res: Response, status: number, errorCode: string): void {
  res.status(status).json({
    errorCode,
    error: LEGACY_MESSAGES[errorCode] ?? LEGACY_MESSAGES.SERVER_ERROR,
  });
}
