import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import React from "react";
import { View } from "react-native";

cssInterop(BlurView, { className: "style" });
cssInterop(LinearGradient, { className: "style" });

type GlassProps = React.ComponentProps<typeof BlurView> & {
  className?: string;
  dark?: boolean;
  strong?: boolean;
  /** near-opaque white (use where content scrolls underneath, e.g. the nav) */
  solid?: boolean;
};

/** Frosted-glass surface: blur + translucent fill + light border. */
export function Glass({ className = "", dark, strong, solid, intensity = 40, tint, children, style, ...rest }: GlassProps) {
  if (solid) {
    // Plain near-opaque surface (no blur): stays readable in webviews without backdrop-filter
    return (
      <View
        className={`overflow-hidden border border-glass-line bg-white/95 ${className}`}
        style={[{ backgroundColor: "rgba(255,255,255,0.96)" }, style as never]}
      >
        {children}
      </View>
    );
  }
  const fill = dark ? "bg-glass-dark border-white/25" : strong ? "bg-glass-strong border-glass-line" : "bg-glass border-glass-line";
  return (
    <BlurView
      intensity={intensity}
      tint={tint ?? (dark ? "dark" : "light")}
      className={`overflow-hidden border ${fill} ${className}`}
      style={solid ? [{ backgroundColor: "rgba(255,255,255,0.96)" }, style] : style}
      {...rest}
    >
      {children}
    </BlurView>
  );
}

/** Pastel gradient + soft blobs the glass blurs against. */
export function Backdrop() {
  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden bg-[#ece8ff]">
      <View className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#ffb4d6]" />
      <View className="absolute -right-28 top-10 h-96 w-96 rounded-full bg-[#a9c8ff]" />
      <View className="absolute -bottom-28 right-0 h-96 w-96 rounded-full bg-[#b9f0d8]" />
      <View className="absolute -bottom-20 -left-24 h-80 w-80 rounded-full bg-[#d6bcff]" />
      <BlurView intensity={80} tint="light" className="absolute inset-0" />
    </View>
  );
}
