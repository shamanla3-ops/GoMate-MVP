export type MapPointValue = {
  label: string;
  lat: number | null;
  lng: number | null;
};

export function isCompleteMapPoint(value: MapPointValue): boolean {
  return (
    value.lat !== null &&
    value.lng !== null &&
    Number.isFinite(value.lat) &&
    Number.isFinite(value.lng)
  );
}
