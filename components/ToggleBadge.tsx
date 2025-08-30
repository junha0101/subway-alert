// /subway-alert/components/ToggleBadge.tsx
import React from "react";
import { Platform, View, Switch, StyleSheet } from "react-native";
import COLORS from "../lib/colors";

export default function ToggleBadge({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.wrap}>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: COLORS.toggleTrackOff, true: COLORS.green }}
        thumbColor={COLORS.toggleThumb}
        ios_backgroundColor={COLORS.toggleTrackOff}
        // ✅ iOS에서만 살짝 축소
        style={Platform.OS === "ios" ? styles.iosSwitch : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  // 레이아웃 안정용 래퍼 (가로정렬 깨짐 방지)
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
    minHeight: 33,
  },
  iosSwitch: {
    transform: [{ scaleX: 0.86 }, { scaleY: 0.86 }], // 0.86~0.9 사이에서 조절
  },
});
