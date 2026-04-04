import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import {
  fetchDrivingRouteLatLngs,
  straightLineFallback,
} from "../lib/osrmRoute";

type Props = {
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  originLabel: string;
  destinationLabel: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
};

function makeDivIcon(color: string) {
  return L.divIcon({
    className: "gomate-marker-preview",
    html: `<div style="width:14px;height:14px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function TripRoutePreviewMap({
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  originLabel,
  destinationLabel,
  t,
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const [routeStatus, setRouteStatus] = useState<"idle" | "loading" | "ok" | "fallback">(
    "idle"
  );

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const map = L.map(ref.current, {
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const overlay = L.layerGroup().addTo(map);
    overlayRef.current = overlay;

    mapRef.current = map;

    const resize = () => map.invalidateSize();
    window.addEventListener("resize", resize);

    const el = ref.current;
    let ro: ResizeObserver | undefined;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        requestAnimationFrame(() => map.invalidateSize());
      });
      ro.observe(el);
    }

    setTimeout(resize, 0);
    setTimeout(resize, 200);
    setTimeout(resize, 600);

    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", resize);
      overlayRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const overlay = overlayRef.current;
    if (!map || !overlay) return;

    overlay.clearLayers();

    const o: L.LatLngExpression = [originLat, originLng];
    const d: L.LatLngExpression = [destinationLat, destinationLng];

    const m1 = L.marker(o, { icon: makeDivIcon("#1296e8") })
      .addTo(overlay)
      .bindPopup(`${t("tripDetails.mapOrigin")}: ${originLabel}`);
    const m2 = L.marker(d, { icon: makeDivIcon("#8ada33") })
      .addTo(overlay)
      .bindPopup(`${t("tripDetails.mapDestination")}: ${destinationLabel}`);

    map.fitBounds(L.latLngBounds([o, d]).pad(0.15), { animate: false });

    let cancelled = false;
    setRouteStatus("loading");

    (async () => {
      let path: [number, number][];
      try {
        path = await fetchDrivingRouteLatLngs(
          originLat,
          originLng,
          destinationLat,
          destinationLng
        );
        if (cancelled) return;
        setRouteStatus("ok");
      } catch {
        path = straightLineFallback(
          originLat,
          originLng,
          destinationLat,
          destinationLng
        );
        if (cancelled) return;
        setRouteStatus("fallback");
      }

      if (cancelled) return;

      const line = L.polyline(path as L.LatLngExpression[], {
        color: "#163c59",
        weight: 5,
        opacity: 0.88,
        lineJoin: "round",
      }).addTo(overlay);

      const fg = L.featureGroup([m1, m2, line]);
      map.fitBounds(fg.getBounds().pad(0.12), { animate: false });
      requestAnimationFrame(() => {
        map.invalidateSize();
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [
    originLat,
    originLng,
    destinationLat,
    destinationLng,
    originLabel,
    destinationLabel,
    t,
  ]);

  return (
    <div className="space-y-2">
      <div
        ref={ref}
        className="gomate-leaflet-map z-10 min-h-[300px] h-[min(55vh,420px)] w-full overflow-hidden rounded-2xl border border-white/80 shadow-sm sm:min-h-[340px]"
        aria-hidden
      />
      {routeStatus === "loading" ? (
        <p className="text-xs text-[#5d7485]">{t("tripDetails.routeLoading")}</p>
      ) : routeStatus === "fallback" ? (
        <p className="text-xs text-[#5d7485]">{t("tripDetails.routeFallback")}</p>
      ) : null}
    </div>
  );
}
