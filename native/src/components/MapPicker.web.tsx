import "leaflet/dist/leaflet.css";
import L from "leaflet";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { Icon } from "@/components/Icon";
import { DEFAULT_CENTER, Place, reverseGeocode, searchPlace, SearchHit } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";
import type { MapPickerProps } from "./MapPicker";

/**
 * OpenStreetMap map with a fixed pin in the middle: drag the map to move the pin, or search a place,
 * or use the phone's location. Every move looks up the street address and reports it.
 */
export function MapPicker({ value, onChange }: MapPickerProps) {
  const { t, lang } = useI18n();
  const el = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const langRef = useRef(lang);
  langRef.current = lang;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);

  const report = (p: Place) => {
    // wait until the map stops moving, then look up the address (one request, not one per frame)
    if (timer.current) clearTimeout(timer.current);
    const mine = ++seq.current;
    setBusy(true);
    timer.current = setTimeout(async () => {
      const address = await reverseGeocode(p, langRef.current);
      if (mine !== seq.current) return;
      setBusy(false);
      onChangeRef.current(p, address);
    }, 600);
  };

  useEffect(() => {
    if (!el.current || map.current) return;
    const start = value ?? DEFAULT_CENTER;
    const m = L.map(el.current, { zoomControl: false, attributionControl: true }).setView([start.lat, start.lng], value ? 17 : 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap" }).addTo(m);
    L.control.zoom({ position: "bottomright" }).addTo(m);
    m.on("moveend", () => {
      const c = m.getCenter();
      report({ lat: c.lat, lng: c.lng });
    });
    map.current = m;
    // the box may still be laying out when the map is created
    setTimeout(() => m.invalidateSize(), 50);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      m.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = (p: Place, zoom = 17) => map.current?.setView([p.lat, p.lng], zoom);

  const locate = () => {
    haptic();
    setMsg("");
    if (!("geolocation" in navigator)) return setMsg(t("map.noLocation"));
    navigator.geolocation.getCurrentPosition(
      (pos) => goTo({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setMsg(t("map.noLocation")),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const search = async () => {
    const q = query.trim();
    if (!q) return;
    setMsg("");
    setBusy(true);
    const found = await searchPlace(q, langRef.current);
    setBusy(false);
    setHits(found);
    if (found.length === 0) setMsg(t("map.noResult"));
  };

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2 rounded-full border border-glass-line bg-white/70 px-3">
        <Icon name="search" size={15} color="#6b7280" />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder={t("map.search")}
          placeholderTextColor="#a9adb8"
          returnKeyType="search"
          style={{ outlineStyle: "none", outlineWidth: 0, minWidth: 0 } as never}
          className="min-w-0 flex-1 py-2.5 text-[13px] text-ink"
        />
        {busy ? <ActivityIndicator size="small" color="#6b7280" /> : null}
      </View>
      {hits.length > 0 ? (
        <View className="overflow-hidden rounded-2xl border border-glass-line bg-white/85">
          {hits.map((h, i) => (
            <Pressable
              key={`${h.lat},${h.lng},${i}`}
              onPress={() => {
                goTo(h);
                setHits([]);
                setQuery("");
              }}
              className="border-b border-black/5 px-3 py-2.5"
            >
              <Text numberOfLines={2} className="text-[12.5px] text-ink">{h.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="overflow-hidden rounded-2xl border border-glass-line" style={{ height: 260 }}>
        <div ref={el} style={{ width: "100%", height: "100%", zIndex: 0 }} />
        {/* fixed pin: its tip sits on the map centre */}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center" style={{ zIndex: 1000 }}>
          <View style={{ marginBottom: 34 }}>
            <Icon name="pin" size={34} color="#e11d48" fill="#e11d48" />
          </View>
        </View>
        <Pressable
          accessibilityLabel={t("map.locate")}
          onPress={locate}
          className="absolute left-2.5 top-2.5 h-10 w-10 items-center justify-center rounded-full bg-white shadow-md shadow-black/25"
          style={{ zIndex: 1001 }}
        >
          <Icon name="pin" size={18} color="#14141f" />
        </Pressable>
      </View>
      <Text className="px-1 text-[12px] text-soft">{msg || t("map.hint")}</Text>
    </View>
  );
}
