// /subway-alert/components/FavoriteMiniCard.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import COLORS from "../lib/colors";
import { radiusCard, shadowCard } from "../lib/ui";
import { T } from "../lib/typography";

type Props = {
  stationName: string; // "인덕원역"
  line: string;        // "4호선"
  direction: string;   // "정부과천청사 방면"
};

export default function FavoriteMiniCard({ stationName, line, direction }: Props) {
  return (
    <View style={styles.card}>
      {/* 상단: 역명 + 라인 pill */}
      <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap" }}>
        <Text style={[T.cardTitle, { marginRight: 8 }]}>{stationName}</Text>
        <View style={styles.linePill}>
          <Text style={styles.linePillText}>{line}</Text>
        </View>
      </View>

      {/* 하단: 방면 */}
      <Text style={[T.cardSub, { marginTop: 4 }]}>{direction}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: radiusCard,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E8ECF3",
    ...shadowCard,
  },
  linePill: {
    paddingHorizontal: 10,
    height: 22,
    borderRadius: 999,
    backgroundColor: "rgba(90,77,255,0.08)",
    justifyContent: "center",
  },
  linePillText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 12,
  },
});
