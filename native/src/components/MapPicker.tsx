import type { Place } from "@/lib/geo";

export type MapPickerProps = {
  value: Place | null;
  onChange: (p: Place, address?: string | null) => void;
};

/** The real map only exists on the web build (Leaflet); on native the address is typed in. */
export function MapPicker(_: MapPickerProps) {
  return null;
}
