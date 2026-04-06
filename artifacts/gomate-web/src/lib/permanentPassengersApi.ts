import { API_BASE_URL } from "./api";

function authHeaders(): HeadersInit {
  const token = localStorage.getItem("token");
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  return h;
}

export type PpDirection = "request" | "invitation";

export type PpRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";

export type PpPublicUser = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  rating?: number | null;
  phoneNumber?: string | null;
  age?: number | null;
  carBrand?: string | null;
  carModel?: string | null;
  carColor?: string | null;
  carPlateNumber?: string | null;
};

export type PpRequest = {
  id: string;
  driverId: string;
  passengerId: string;
  requestedByUserId: string;
  direction: PpDirection;
  templateId: string | null;
  tripId: string | null;
  originText: string | null;
  destinationText: string | null;
  preferredTime: string | null;
  weekdays: string[];
  note: string | null;
  status: PpRequestStatus;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  driver: PpPublicUser | null;
  passenger: PpPublicUser | null;
  creator: PpPublicUser | null;
};

export type PpRelationship = {
  id: string;
  driverId: string;
  passengerId: string;
  sourceRequestId: string | null;
  templateId: string | null;
  preferredTime: string | null;
  weekdays: string[];
  originText: string | null;
  destinationText: string | null;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
  driver: PpPublicUser | null;
  passenger: PpPublicUser | null;
};

export type PpTripContext = {
  tripId: string;
  driverId: string;
  viewerRole: "driver" | "passenger";
  activeRelationshipWithDriver: null | {
    id: string;
    weekdays: string[];
    preferredTime: string | null;
    originText: string | null;
    destinationText: string | null;
    skippingToday: boolean;
  };
  driverPermanentPassengerCount: number | null;
  seatMessageHint: string | null;
};

export async function fetchPpIncoming(): Promise<{ requests: PpRequest[] }> {
  const res = await fetch(`${API_BASE_URL}/api/permanent-passengers/requests/incoming`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data as { requests: PpRequest[] };
}

export async function fetchPpOutgoing(): Promise<{ requests: PpRequest[] }> {
  const res = await fetch(`${API_BASE_URL}/api/permanent-passengers/requests/outgoing`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data as { requests: PpRequest[] };
}

export async function fetchPpRelationships(): Promise<{
  asDriver: PpRelationship[];
  asPassenger: PpRelationship[];
}> {
  const res = await fetch(`${API_BASE_URL}/api/permanent-passengers/relationships`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data as { asDriver: PpRelationship[]; asPassenger: PpRelationship[] };
}

export async function createPpRequest(body: {
  direction: PpDirection;
  targetUserId: string;
  weekdays: string[];
  preferredTime?: string | null;
  note?: string | null;
  templateId?: string | null;
  tripId?: string | null;
}): Promise<{ request: PpRequest; messageCode?: string }> {
  const res = await fetch(`${API_BASE_URL}/api/permanent-passengers/requests`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data as { request: PpRequest; messageCode?: string };
}

export async function acceptPpRequest(id: string): Promise<unknown> {
  const res = await fetch(
    `${API_BASE_URL}/api/permanent-passengers/requests/${encodeURIComponent(id)}/accept`,
    { method: "POST", headers: authHeaders() }
  );
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

export async function rejectPpRequest(id: string): Promise<unknown> {
  const res = await fetch(
    `${API_BASE_URL}/api/permanent-passengers/requests/${encodeURIComponent(id)}/reject`,
    { method: "POST", headers: authHeaders() }
  );
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

export async function cancelPpRequest(id: string): Promise<unknown> {
  const res = await fetch(
    `${API_BASE_URL}/api/permanent-passengers/requests/${encodeURIComponent(id)}/cancel`,
    { method: "POST", headers: authHeaders() }
  );
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

export async function endPpRelationship(id: string): Promise<unknown> {
  const res = await fetch(
    `${API_BASE_URL}/api/permanent-passengers/relationships/${encodeURIComponent(id)}/end`,
    { method: "POST", headers: authHeaders() }
  );
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

export async function registerPpSkip(id: string, date: string): Promise<unknown> {
  const res = await fetch(
    `${API_BASE_URL}/api/permanent-passengers/relationships/${encodeURIComponent(id)}/skip`,
    { method: "POST", headers: authHeaders(), body: JSON.stringify({ date }) }
  );
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data;
}

export async function fetchPpTripContext(tripId: string): Promise<PpTripContext> {
  const res = await fetch(
    `${API_BASE_URL}/api/permanent-passengers/trip/${encodeURIComponent(tripId)}/context`,
    { headers: authHeaders() }
  );
  const data = await res.json();
  if (!res.ok) {
    throw data;
  }
  return data as PpTripContext;
}

export function localCalendarYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function preferredTimeFromDeparture(iso: string): string {
  try {
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return "";
    const h = String(dt.getHours()).padStart(2, "0");
    const m = String(dt.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "";
  }
}
