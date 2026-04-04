import { useCallback, useEffect, useRef, useState } from "react";
import L from "leaflet";
import type { Locale } from "../i18n/locales";
import { isCompleteMapPoint, type MapPointValue } from "../lib/mapTypes";
import { photonReverse, photonSearch } from "../lib/photon";

type Props = {
  id: string;
  heading: string;
  value: MapPointValue;
  onChange: (next: MapPointValue) => void;
  locale: Locale;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

const DEFAULT_CENTER: L.LatLngExpression = [52.1, 19.4];
const DEFAULT_ZOOM = 6;

function makeDivIcon(color: string) {
  return L.divIcon({
    className: "gomate-marker",
    html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function LocationPicker({
  id,
  heading,
  value,
  onChange,
  locale,
  t,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const skipNextSearchRef = useRef(false);
  const onChangeRef = useRef(onChange);
  const localeRef = useRef(locale);
  const tRef = useRef(t);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    localeRef.current = locale;
  }, [locale]);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  const [query, setQuery] = useState(value.label);
  const [suggestions, setSuggestions] = useState<
    { label: string; lat: number; lng: number }[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(value.label);
  }, [value.label]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    map.on("click", async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setMapError(null);
      try {
        const label = await photonReverse(lat, lng, localeRef.current);
        onChangeRef.current({ label, lat, lng });
        setQuery(label);
        setListOpen(false);
        setSuggestions([]);
      } catch {
        setMapError(tRef.current("location.reverseFailed"));
        onChangeRef.current({
          label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
        });
        setQuery(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      }
    });

    mapRef.current = map;

    const onResize = () => {
      map.invalidateSize();
    };
    window.addEventListener("resize", onResize);

    const container = containerRef.current;
    let ro: ResizeObserver | undefined;
    if (container && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          map.invalidateSize();
        });
      });
      ro.observe(container);
    }

    setTimeout(onResize, 0);
    setTimeout(onResize, 200);
    setTimeout(onResize, 600);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", onResize);
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map init once; locale/onChange via refs where needed
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isCompleteMapPoint(value)) {
      const ll: L.LatLngExpression = [value.lat as number, value.lng as number];
      if (!markerRef.current) {
        markerRef.current = L.marker(ll, { icon: makeDivIcon("#163c59") }).addTo(
          map
        );
      } else {
        markerRef.current.setLatLng(ll);
      }
      map.setView(ll, Math.max(map.getZoom(), 12), { animate: true });
    } else {
      markerRef.current?.remove();
      markerRef.current = null;
    }
  }, [value.lat, value.lng, value.label]);

  useEffect(() => {
    if (skipNextSearchRef.current) {
      skipNextSearchRef.current = false;
      return;
    }

    const q = query.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    const handle = window.setTimeout(async () => {
      setSearching(true);
      setMapError(null);
      try {
        const rows = await photonSearch(q, locale);
        setSuggestions(rows);
        setListOpen(rows.length > 0);
      } catch {
        setSuggestions([]);
        setMapError(t("location.networkError"));
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => window.clearTimeout(handle);
  }, [query, locale, t]);

  const handleInputChange = useCallback(
    (text: string) => {
      setQuery(text);
      onChange({ label: text, lat: null, lng: null });
      if (text.trim().length < 2) {
        setSuggestions([]);
        setListOpen(false);
      }
    },
    [onChange]
  );

  const pickSuggestion = useCallback(
    (row: { label: string; lat: number; lng: number }) => {
      skipNextSearchRef.current = true;
      setQuery(row.label);
      onChange({ label: row.label, lat: row.lat, lng: row.lng });
      setSuggestions([]);
      setListOpen(false);
    },
    [onChange]
  );

  const selected = isCompleteMapPoint(value);

  return (
    <div className="space-y-2">
      <label
        htmlFor={`${id}-input`}
        className="block text-sm font-semibold text-[#28475d]"
      >
        {heading}
      </label>
      <p className="text-xs text-[#5d7485]">{t("location.inputHint")}</p>

      <div className="relative z-20">
        <input
          id={`${id}-input`}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setListOpen(true);
          }}
          onBlur={() => {
            window.setTimeout(() => setListOpen(false), 200);
          }}
          autoComplete="off"
          placeholder={t("location.searchPlaceholder")}
          className="w-full rounded-2xl border border-white/80 bg-white/90 px-4 py-3 text-[#193549] shadow-sm outline-none placeholder:text-[#7a94a5]"
        />

        {listOpen && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-2xl border border-[#d7e4eb] bg-white py-1 text-sm shadow-lg">
            {suggestions.map((row, index) => (
              <li key={`${row.lat}-${row.lng}-${index}`}>
                <button
                  type="button"
                  className="w-full px-4 py-2.5 text-left hover:bg-[#eef4f8]"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickSuggestion(row)}
                >
                  {row.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {searching && (
          <p className="mt-1 text-xs text-[#5d7485]">{t("location.searching")}</p>
        )}
      </div>

      {mapError && (
        <p className="text-xs text-[#b42318]" role="alert">
          {mapError}
        </p>
      )}

      <p className="text-xs text-[#5d7485]">{t("location.mapHint")}</p>

      <div
        ref={containerRef}
        className="gomate-leaflet-map z-10 min-h-[280px] h-[min(45vh,380px)] w-full overflow-hidden rounded-2xl border border-white/80 shadow-sm sm:min-h-[300px]"
        aria-hidden
      />

      {selected ? (
        <div className="rounded-2xl border border-[#c8e6c9] bg-[#e8f5e9] px-3 py-2 text-sm text-[#1b5e20]">
          {t("location.selected")}: <strong>{value.label}</strong>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#fff3cd] bg-[#fffbeb] px-3 py-2 text-sm text-[#856404]">
          {t("location.pickFromList")}
        </div>
      )}
    </div>
  );
}
