import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import { Glass } from "@/components/Glass";
import { Icon } from "@/components/Icon";
import { MapPicker } from "@/components/MapPicker";
import { Screen } from "@/components/Screen";
import { loadAddress, saveAddress } from "@/lib/address";
import type { Place } from "@/lib/geo";
import { useI18n } from "@/lib/i18n";
import { haptic } from "@/lib/telegram";

/** Account → Delivery address: edit the saved address (typed or picked on the map) used at checkout. */
export default function AddressScreen() {
  const { t } = useI18n();
  const [address, setAddress] = useState("");
  const [place, setPlace] = useState<Place | null>(null);
  const [ready, setReady] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadAddress().then((s) => {
      setAddress(s.address);
      setPlace(s.place);
      setReady(true);
    });
  }, []);

  const save = async () => {
    await saveAddress({ address: address.trim(), place });
    haptic("medium");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Screen title={t("address.title")} contentClassName="gap-4 pt-2">
      <Glass strong className="gap-3 rounded-2xl p-3">
        <View className="flex-row items-start gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#14141f]"><Icon name="pin" size={18} color="#fff" /></View>
          <TextInput
            multiline
            value={address}
            onChangeText={(v) => { setAddress(v); setSaved(false); }}
            editable={ready}
            placeholder={t("checkout.addressText")}
            placeholderTextColor="#a9adb8"
            style={{ outlineStyle: "none", outlineWidth: 0 } as never}
            className="min-h-[64px] flex-1 text-[13px] leading-5 text-ink"
          />
        </View>
        {Platform.OS === "web" ? (
          <>
            <Pressable onPress={() => setMapOpen(!mapOpen)} className="flex-row items-center justify-center gap-2 rounded-xl border border-glass-line bg-white/70 py-2.5">
              <Icon name="pin" size={15} color="#14141f" />
              <Text className="text-[12.5px] font-bold text-ink">{mapOpen ? t("map.close") : place ? t("map.change") : t("map.pick")}</Text>
            </Pressable>
            {mapOpen && ready ? (
              <MapPicker
                value={place}
                onChange={(p, a) => {
                  setPlace(p);
                  setSaved(false);
                  if (a) setAddress(a);
                }}
              />
            ) : null}
          </>
        ) : null}
      </Glass>
      <Pressable onPress={save} className="items-center rounded-2xl bg-[#14141f] py-3.5">
        <Text className="font-bold text-white">{saved ? t("address.saved") : t("address.save")}</Text>
      </Pressable>
      <Text className="px-1 text-[12px] leading-5 text-soft">{t("address.hint")}</Text>
    </Screen>
  );
}
