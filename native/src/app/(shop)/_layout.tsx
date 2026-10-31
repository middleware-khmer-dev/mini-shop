import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";
import { NavProvider } from "@/components/nav-context";
import { PillNav } from "@/components/PillNav";

/** The shop is open to guests. Sign-in is required only when paying (see cart/checkout). */
export default function ShopLayout() {
  return (
    <NavProvider>
      <View className="flex-1">
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "fade" }} />
        <PillNav />
      </View>
    </NavProvider>
  );
}
