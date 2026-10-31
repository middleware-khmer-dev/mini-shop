import React, { useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { MapPicker } from "@/components/MapPicker";
import { Screen } from "@/components/Screen";
import { AddressLabel, SavedAddress, useAddresses } from "@/lib/address";
import type { Place } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";

const LABELS: AddressLabel[] = ["home", "work", "other"];

/** Add or change one address: a label (home / work / other), the text, and optionally a pin on the map. */
function Editor({ initial, onDone }: { initial: SavedAddress | null; onDone: () => void }) {
  const { t } = useI18n();
  const { save } = useAddresses();
  const [label, setLabel] = useState<AddressLabel>(initial?.label ?? "home");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [place, setPlace] = useState<Place | null>(initial?.place ?? null);
  const [mapOpen, setMapOpen] = useState(false);
  const ok = address.trim().length > 0;

  return (
    <Glass strong className="gap-3 rounded-2xl p-3">
      <View className="flex-row gap-2">
        {LABELS.map((l) => (
          <Pressable key={l} onPress={() => setLabel(l)} className={`rounded-full border px-4 py-2 ${label === l ? "border-white/35 bg-[#14141f]/85" : "border-glass-line bg-white/55"}`}>
            <Text className={`text-[12.5px] font-semibold ${label === l ? "text-white" : "text-ink"}`}>{t(`address.label.${l}`)}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        multiline
        value={address}
        onChangeText={setAddress}
        placeholder={t("checkout.addressText")}
        placeholderTextColor="#a9adb8"
        style={{ outlineStyle: "none", outlineWidth: 0 } as never}
        className="min-h-[64px] rounded-xl border border-glass-line bg-white/60 p-3 text-[13px] leading-5 text-ink"
      />
      {Platform.OS === "web" ? (
        <>
          <Pressable onPress={() => setMapOpen(!mapOpen)} className="flex-row items-center justify-center gap-2 rounded-xl border border-glass-line bg-white/70 py-2.5">
            <Icon name="pin" size={15} color="#14141f" />
            <Text className="text-[12.5px] font-bold text-ink">{mapOpen ? t("map.close") : place ? t("map.change") : t("map.pick")}</Text>
          </Pressable>
          {mapOpen ? (
            <MapPicker
              value={place}
              onChange={(p, a) => {
                setPlace(p);
                if (a) setAddress(a);
              }}
            />
          ) : null}
        </>
      ) : null}
      <View className="flex-row gap-2">
        <Pressable onPress={onDone} className="flex-1 items-center rounded-xl border border-glass-line bg-white/70 py-3">
          <Text className="font-bold text-ink">{t("address.cancel")}</Text>
        </Pressable>
        <Pressable
          disabled={!ok}
          onPress={() => {
            save({ id: initial?.id, label, address: address.trim(), place });
            haptic("medium");
            onDone();
          }}
          className={`flex-1 items-center rounded-xl bg-[#14141f] py-3 ${ok ? "" : "opacity-50"}`}
        >
          <Text className="font-bold text-white">{t("address.save")}</Text>
        </Pressable>
      </View>
    </Glass>
  );
}

/** Account → Delivery addresses: add as many as needed (home, work, ...), choose the one to use, edit or delete. */
export default function AddressScreen() {
  const { t } = useI18n();
  const { addresses, selected, select, remove } = useAddresses();
  // null = just the list, "new" = adding, otherwise the id being edited
  const [editing, setEditing] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<string | null>(null);

  return (
    <Screen title={t("address.title")} contentClassName="gap-4 pt-2">
      {addresses.map((a) =>
        editing === a.id ? (
          <Editor key={a.id} initial={a} onDone={() => setEditing(null)} />
        ) : (
          <Glass key={a.id} strong={a.id === selected?.id} className={`gap-3 rounded-2xl p-3 ${a.id === selected?.id ? "border-2 border-[#14141f]" : ""}`}>
            <Pressable onPress={() => { select(a.id); haptic(); }} className="flex-row items-start gap-3">
              <View className={`h-10 w-10 items-center justify-center rounded-xl ${a.id === selected?.id ? "bg-[#14141f]" : "bg-white/70"}`}>
                <Icon name="pin" size={18} color={a.id === selected?.id ? "#fff" : "#111"} />
              </View>
              <View className="flex-1 gap-0.5">
                <View className="flex-row items-center gap-2">
                  <Text className="text-[13.5px] font-bold text-ink">{t(`address.label.${a.label}`)}</Text>
                  {a.id === selected?.id ? (
                    <View className="rounded-full bg-[#14141f] px-2 py-0.5"><Text className="text-[10.5px] font-bold text-white">{t("address.default")}</Text></View>
                  ) : null}
                  {a.place ? <Icon name="check" size={12} color="#16a34a" /> : null}
                </View>
                <Text className="text-[12.5px] leading-5 text-soft">{a.address}</Text>
              </View>
            </Pressable>
            <View className="flex-row gap-2">
              <Pressable onPress={() => { setConfirmDel(null); setEditing(a.id); }} className="flex-1 items-center rounded-xl border border-glass-line bg-white/70 py-2">
                <Text className="text-[12.5px] font-bold text-ink">{t("address.edit")}</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (confirmDel === a.id) {
                    remove(a.id);
                    setConfirmDel(null);
                  } else setConfirmDel(a.id);
                }}
                className="flex-1 items-center rounded-xl border border-glass-line bg-white/70 py-2"
              >
                <Text className="text-[12.5px] font-bold text-red-500">{confirmDel === a.id ? t("address.confirmDelete") : t("address.delete")}</Text>
              </Pressable>
            </View>
          </Glass>
        ),
      )}

      {addresses.length === 0 && editing !== "new" ? (
        <View className="items-center gap-1 py-10">
          <Icon name="pin" size={36} color="#9ca3af" />
          <Text className="font-bold text-ink">{t("address.empty")}</Text>
          <Text className="text-center text-[12.5px] text-soft">{t("address.emptySub")}</Text>
        </View>
      ) : null}

      {editing === "new" ? (
        <Editor initial={null} onDone={() => setEditing(null)} />
      ) : (
        <Pressable onPress={() => { setConfirmDel(null); setEditing("new"); }} className="flex-row items-center justify-center gap-2 rounded-2xl bg-[#14141f] py-3.5">
          <Icon name="plus" size={16} color="#fff" />
          <Text className="font-bold text-white">{t("address.add")}</Text>
        </Pressable>
      )}
      {addresses.length > 1 ? <Text className="px-1 text-[12px] leading-5 text-soft">{t("address.hint")}</Text> : null}
    </Screen>
  );
}
