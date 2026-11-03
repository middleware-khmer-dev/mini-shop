import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { cssInterop } from "nativewind";
import React from "react";
import { View } from "react-native";
import { useTheme } from "@/lib/theme";

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
  const { dark: night } = useTheme();
  const solidBg = night ? "rgba(30,31,46,0.96)" : "rgba(255,255,255,0.96)";
  if (solid) {
    // Plain near-opaque surface (no blur): stays readable in webviews without backdrop-filter
    return (
      <View
        className={`overflow-hidden border border-glass-line bg-surface/95 ${className}`}
        style={[{ backgroundColor: solidBg }, style as never]}
      >
        {children}
      </View>
    );
  }
  const fill = dark ? "bg-glass-dark border-white/25" : strong ? "bg-glass-strong border-glass-line" : "bg-glass border-glass-line";
  return (
    <BlurView
      intensity={intensity}
      tint={tint ?? (dark || night ? "dark" : "light")}
      className={`overflow-hidden border ${fill} ${className}`}
      style={style}
      {...rest}
    >
      {children}
    </BlurView>
  );
}

/** Pastel gradient + soft blobs the glass blurs against (deep, muted tones in dark mode). */
export function Backdrop() {
  const { c } = useTheme();
  const [pink, blue, mint, lilac] = c.blobs;
  return (
    <View pointerEvents="none" className="absolute inset-0 overflow-hidden bg-canvas">
      <View className="absolute -left-24 -top-24 h-96 w-96 rounded-full" style={{ backgroundColor: pink }} />
      <View className="absolute -right-28 top-10 h-96 w-96 rounded-full" style={{ backgroundColor: blue }} />
      <View className="absolute -bottom-28 right-0 h-96 w-96 rounded-full" style={{ backgroundColor: mint }} />
      <View className="absolute -bottom-20 -left-24 h-80 w-80 rounded-full" style={{ backgroundColor: lilac }} />
      <BlurView intensity={80} tint={c.blur} className="absolute inset-0" />
    </View>
  );
}
