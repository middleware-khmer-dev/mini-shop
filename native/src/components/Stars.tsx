import React from "react";
import { Pressable, View } from "react-native";
import { Icon } from "./Icon";

/** Five stars. Pass onChange to make them tappable (rating input); otherwise they only display a value. */
export function Stars({ value, onChange, size = 14 }: { value: number; onChange?: (n: number) => void; size?: number }) {
  return (
    <View className="flex-row gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const on = n <= Math.round(value);
        const star = <Icon name="star" size={size} color={on ? "#f59e0b" : "#d1d5db"} fill={on ? "#f59e0b" : "none"} />;
        return onChange ? (
          <Pressable key={n} accessibilityRole="button" accessibilityLabel={`${n}`} hitSlop={4} onPress={() => onChange(n)}>
            {star}
          </Pressable>
        ) : (
          <View key={n}>{star}</View>
        );
      })}
    </View>
  );
}
