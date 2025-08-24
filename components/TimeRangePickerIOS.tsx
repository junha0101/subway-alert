// components/TimeRangePickerIOS.tsx
import React, { useMemo, useState } from "react";
import { Platform, View, Text, StyleSheet, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import COLORS from "../lib/colors";

type Props = {
  start: string;                 // "HH:MM"
  end: string;                   // "HH:MM"
  onChangeStart: (t: string) => void;
  onChangeEnd: (t: string) => void;
};

function parseHM(s: string) {
  const [h, m] = s.split(":").map((n) => parseInt(n, 10));
  return { h, m };
}
function toHM(h: number, m: number) {
  const hh = String(h).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function TimeRangePickerIOS({ start, end, onChangeStart, onChangeEnd }: Props) {
  if (Platform.OS !== "ios") return null;

  const s = parseHM(start);
  const e = parseHM(end);

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setHours(s.h, s.m, 0, 0);
    return d;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setHours(e.h, e.m, 0, 0);
    return d;
  });

  // AM/PM 표시(토글은 항상 노출)
  const startIsPM = useMemo(() => startDate.getHours() >= 12, [startDate]);
  const endIsPM = useMemo(() => endDate.getHours() >= 12, [endDate]);

  const toggleStartAMPM = () => {
    const h = startDate.getHours();
    const m = startDate.getMinutes();
    const next = new Date(startDate);
    next.setHours((h + 12) % 24, m);
    setStartDate(next);
    onChangeStart(toHM(next.getHours(), next.getMinutes()));
  };

  const toggleEndAMPM = () => {
    const h = endDate.getHours();
    const m = endDate.getMinutes();
    const next = new Date(endDate);
    next.setHours((h + 12) % 24, m);
    setEndDate(next);
    onChangeEnd(toHM(next.getHours(), next.getMinutes()));
  };

  return (
    <View style={{ marginTop: 8 }}>
      {/* 시작 */}
      <Text style={styles.label}>시작</Text>
      <View style={styles.row}>
        <View style={styles.pickerBox}>
          <DateTimePicker
            mode="time"
            display="spinner"         // iOS 휠
            value={startDate}
            onChange={(_, d) => {
              if (!d) return;
              setStartDate(d);
              onChangeStart(toHM(d.getHours(), d.getMinutes()));
            }}
            // 휠 높이를 조금 줄여서 컴팩트하게
            style={{ height: 110 }}
          />
        </View>
        <AMPMToggle isPM={startIsPM} onToggle={toggleStartAMPM} />
      </View>

      {/* 종료 */}
      <Text style={[styles.label, { marginTop: 8 }]}>종료</Text>
      <View style={styles.row}>
        <View style={styles.pickerBox}>
          <DateTimePicker
            mode="time"
            display="spinner"
            value={endDate}
            onChange={(_, d) => {
              if (!d) return;
              setEndDate(d);
              onChangeEnd(toHM(d.getHours(), d.getMinutes()));
            }}
            style={{ height: 110 }}
          />
        </View>
        <AMPMToggle isPM={endIsPM} onToggle={toggleEndAMPM} />
      </View>
    </View>
  );
}

function AMPMToggle({ isPM, onToggle }: { isPM: boolean; onToggle: () => void }) {
  return (
    <View style={styles.segmentWrap}>
      <Pressable
        onPress={() => {
          if (isPM) onToggle(); // PM → AM
        }}
        style={[styles.segment, !isPM && styles.segmentOn]}
      >
        <Text style={[styles.segmentText, !isPM && styles.segmentTextOn]}>AM</Text>
      </Pressable>
      <Pressable
        onPress={() => {
          if (!isPM) onToggle(); // AM → PM
        }}
        style={[styles.segment, isPM && styles.segmentOn]}
      >
        <Text style={[styles.segmentText, isPM && styles.segmentTextOn]}>PM</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: "#6B7280", marginLeft: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  pickerBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
  },
  segmentWrap: {
    width: 90,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
    flexDirection: "row",
    padding: 3,
  },
  segment: {
    flex: 1,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentOn: { backgroundColor: COLORS.primary },
  segmentText: { fontWeight: "700", color: "#6B7280", fontSize: 12 },
  segmentTextOn: { color: "#fff" },
});
