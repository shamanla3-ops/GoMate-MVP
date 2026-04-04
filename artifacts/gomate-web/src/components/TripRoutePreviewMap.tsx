import { useEffect, useRef } from "react";
import L from "leaflet";
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
    html: `<div style="width:12px;height:12px;background:${color};border-radius:50%;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.35)"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
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

  useEffect(() => {
    if (!ref.current || mapRef.current) return;

    const map = L.map(ref.current, {
      zoomControl: true,
      attributionControl: true,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

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
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.eachLayer((layer: L.Layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const o: L.LatLngExpression = [originLat, originLng];
    const d: L.LatLngExpression = [destinationLat, destinationLng];

    L.marker(o, { icon: makeDivIcon("#1296e8") })
      .addTo(map)
      .bindPopup(`${t("tripDetails.mapOrigin")}: ${originLabel}`);
    L.marker(d, { icon: makeDivIcon("#8ada33") })
      .addTo(map)
      .bindPopup(`${t("tripDetails.mapDestination")}: ${destinationLabel}`);

    const bounds = L.latLngBounds([o, d]);
    map.fitBounds(bounds.pad(0.2));
    setTimeout(() => map.invalidateSize(), 100);
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
    <div
      ref={ref}
      className="h-56 w-full overflow-hidden rounded-2xl border border-white/80 shadow-sm sm:h-64"
    />
  );
}
