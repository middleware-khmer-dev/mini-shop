import "../../global.css";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Backdrop } from "@/components/Glass";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";

const transparentTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: "transparent", card: "transparent" } };

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>
          <View className="flex-1 bg-[#ece8ff]">
            <Backdrop />
            <StatusBar style="dark" />
            <ThemeProvider value={transparentTheme}>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "fade" }} />
            </ThemeProvider>
          </View>
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
