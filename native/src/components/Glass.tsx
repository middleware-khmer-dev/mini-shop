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
};

/** Frosted-glass surface: blur + translucent fill + light border. */
export function Glass({ className = "", dark, strong, intensity = 40, tint, children, style, ...rest }: GlassProps) {
  const fill = dark ? "bg-glass-dark border-white/25" : strong ? "bg-glass-strong border-glass-line" : "bg-glass border-glass-line";
  return (
    <BlurView
      intensity={intensity}
      tint={tint ?? (dark ? "dark" : "light")}
      className={`overflow-hidden border ${fill} ${className}`}
      style={style}
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
