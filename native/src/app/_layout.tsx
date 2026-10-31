import "../../global.css";
import { DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Backdrop } from "@/components/Glass";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { I18nProvider } from "@/lib/i18n";
import { ProductsProvider } from "@/lib/products";
import { TelegramBackButton, TelegramProvider } from "@/lib/telegram";

const transparentTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: "transparent", card: "transparent" } };

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TelegramProvider>
      <I18nProvider>
      <AuthProvider>
        <ProductsProvider>
        <CartProvider>
          <View className="flex-1 bg-[#ece8ff]">
            <Backdrop />
            <StatusBar style="dark" />
            <TelegramBackButton />
            <ThemeProvider value={transparentTheme}>
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "fade" }} />
            </ThemeProvider>
          </View>
        </CartProvider>
        </ProductsProvider>
      </AuthProvider>
      </I18nProvider>
      </TelegramProvider>
    </SafeAreaProvider>
  );
}
