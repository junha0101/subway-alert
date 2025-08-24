// components/RadiusPickerSheet.tsx
import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import COLORS from "../lib/colors";

type Props = {
  open: boolean;
  current: number;                 // 현재 선택된 반경(m)
  onPick: (n: number) => void;     // 선택 콜백
  onClose: () => void;
};

const OPTIONS = [100, 120, 140, 160, 180, 200];

export default function RadiusPickerSheet({ open, current, onPick, onClose }: Props) {
  const ref = useRef<BottomSheet>(null);
  const snap = useMemo(() => ["45%"], []);

  useEffect(() => {
    if (open) ref.current?.expand();
    else ref.current?.close();
  }, [open]);

  return (
    <BottomSheet
      ref={ref}
      snapPoints={snap}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.bg}
    >
      <BottomSheetView style={styles.wrap}>
        <Text style={styles.title}>반경 선택</Text>
        <View style={styles.grid}>
          {OPTIONS.map((m) => {
            const selected = m === current;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  onPick(m);
                  onClose();
                }}
                style={[styles.item, selected && styles.itemOn]}
              >
                <Text style={[styles.itemText, selected && styles.itemTextOn]}>{m}m</Text>
              </Pressable>
            );
          })}
        </View>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bg: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  wrap: { padding: 16 },
  title: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  item: {
    width: "30%",
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  itemOn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + "0D",
  },
  itemText: { color: "#444", fontWeight: "600" },
  itemTextOn: { color: COLORS.primary },
});
