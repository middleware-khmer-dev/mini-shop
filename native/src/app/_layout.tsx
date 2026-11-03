import "../../global.css";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Backdrop } from "@/components/Glass";
import { AddressProvider } from "@/lib/address";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import { FavoritesProvider } from "@/lib/favorites";
import { I18nProvider } from "@/lib/i18n";
import { OrdersProvider } from "@/lib/orders";
import { ReviewsProvider } from "@/lib/reviews";
import { ProductsProvider } from "@/lib/products";
import { TelegramBackButton, TelegramProvider, TelegramTheme } from "@/lib/telegram";
import { ThemeProvider as AppThemeProvider, useTheme } from "@/lib/theme";

const transparentTheme = { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: "transparent", card: "transparent" } };
const transparentDark = { ...DarkTheme, colors: { ...DarkTheme.colors, background: "transparent", card: "transparent" } };

/** Root surface: applies the light/dark design tokens to everything below it. */
function Shell({ children }: { children: React.ReactNode }) {
  const { vars, dark, c } = useTheme();
  return (
    <View style={vars} className="flex-1 bg-canvas">
      <Backdrop />
      <StatusBar style={c.barStyle} />
      <TelegramTheme />
      <TelegramBackButton />
      <ThemeProvider value={dark ? transparentDark : transparentTheme}>{children}</ThemeProvider>
    </View>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppThemeProvider>
      <TelegramProvider>
      <I18nProvider>
      <AuthProvider>
        <ProductsProvider>
        <OrdersProvider>
        <AddressProvider>
        <CartProvider>
        <ReviewsProvider>
        <FavoritesProvider>
          <Shell>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" }, animation: "fade" }} />
          </Shell>
        </FavoritesProvider>
        </ReviewsProvider>
        </CartProvider>
        </AddressProvider>
        </OrdersProvider>
        </ProductsProvider>
      </AuthProvider>
      </I18nProvider>
      </TelegramProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
