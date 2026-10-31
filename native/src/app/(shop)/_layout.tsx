import { Redirect, Stack } from "expo-router";
import React from "react";
import { View } from "react-native";
import { NavProvider } from "@/components/nav-context";
import { PillNav } from "@/components/PillNav";
import { useAuth } from "@/lib/auth";

/** Everything inside (shop) needs a signed-in user and keeps the nav on every page. */
export default function ShopLayout() {
  const { session, ready } = useAuth();
  if (!ready) return null;
  if (!session) return <Redirect href="/" />;
  return (
    <NavProvider>
      <View className="flex-1">
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "fade" }} />
        <PillNav />
      </View>
    </NavProvider>
  );
}
