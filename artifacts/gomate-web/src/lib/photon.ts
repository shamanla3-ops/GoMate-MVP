/** Photon (Komoot) — free OSM-based geocoder, browser-friendly (no API key). */

const PHOTON_SEARCH = "https://photon.komoot.io/api";
const PHOTON_REVERSE = "https://photon.komoot.io/reverse";

/**
 * Komoot's public Photon rejects unknown `lang` values with HTTP 400 (e.g. pl, ru, uk).
 * Only pass `lang` for codes their instance accepts; otherwise omit and rely on
 * Accept-Language (see Photon API docs).
 */
const PHOTON_LANG_SUPPORTED = new Set(["en", "de", "fr"]);

function photonLangParam(locale: string): string | undefined {
  const code = locale.split("-")[0]?.toLowerCase().trim();
  if (!code) return undefined;
  return PHOTON_LANG_SUPPORTED.has(code) ? code : undefined;
}

export type PhotonFeature = {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: [number, number] };
};

export type PhotonSearchResponse = {
  features?: PhotonFeature[];
};

function formatLabel(properties: Record<string, unknown>): string {
  const name = String(properties.name ?? "");
  const street = String(properties.street ?? "");
  const housenumber = String(properties.housenumber ?? "");
  const locality = String(
    properties.city ??
      properties.town ??
      properties.village ??
      properties.district ??
      ""
  );
  const country = String(properties.country ?? "");
  const streetLine = [street, housenumber].filter(Boolean).join(" ").trim();
  const top = name || streetLine;
  return [top, locality, country].filter(Boolean).join(", ");
}

export async function photonSearch(
  query: string,
  lang: string
): Promise<{ label: string; lat: number; lng: number }[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }

  const params = new URLSearchParams({ q, limit: "8" });
  const photonLang = photonLangParam(lang);
  if (photonLang) {
    params.set("lang", photonLang);
  }

  const url = `${PHOTON_SEARCH}?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Photon search failed");
  }

  const data = (await res.json()) as PhotonSearchResponse;
  const features = Array.isArray(data.features) ? data.features : [];

  return features
    .map((f) => {
      const coords = f.geometry?.coordinates;
      if (!coords || coords.length < 2) return null;
      const lng = coords[0];
      const lat = coords[1];
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const label = formatLabel(f.properties ?? {});
      return { label: label || q, lat, lng };
    })
    .filter(Boolean) as { label: string; lat: number; lng: number }[];
}

export async function photonReverse(
  lat: number,
  lng: number,
  lang: string
): Promise<string> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
  });
  const photonLang = photonLangParam(lang);
  if (photonLang) {
    params.set("lang", photonLang);
  }

  const url = `${PHOTON_REVERSE}?${params.toString()}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Photon reverse failed");
  }

  const data = (await res.json()) as PhotonSearchResponse;
  const f = data.features?.[0];
  if (!f) {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }

  return formatLabel(f.properties ?? {}) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
