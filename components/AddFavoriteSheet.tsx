import React from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import COLORS from "../lib/colors";
import { radiusCard, shadowCard, paddingH } from "../lib/ui";
import { T } from "../lib/typography";
import { useAlarms } from "../store/useAlarms";

// ✅ AddAlarmSheet 2단계에서 쓰는 동일 유틸
import {
  searchStations,
  getLinesForStation,
  getDirectionsForStationLine,
} from "../utils/stations";

type Props = { open: boolean; onClose: () => void };

export default function AddFavoriteSheet({ open, onClose }: Props) {
  const ref = React.useRef<BottomSheet>(null);

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.22}
        pressBehavior="close"
      />
    ),
    []
  );

  const { addFavorite, existsFavorite } = useAlarms() as any;

  // ===== 2단계: 지하철/방면과 동일한 상태 구성 =====
  const [station, setStation] = React.useState(""); // 최종 표시용(확정된 역명)
  const [line, setLine] = React.useState(""); // 확정된 라인 문자열(예: "4호선")
  const [direction, setDirection] = React.useState(""); // 확정된 방면 라벨(예: "평촌 방면")

  const [stationQuery, setStationQuery] = React.useState(""); // 입력값
  const [stationList, setStationList] = React.useState<
    Array<{ displayName: string; apiName: string; line: string }>
  >([]);
  const [pickedApiName, setPickedApiName] = React.useState<string | null>(null);

  const [lineOptions, setLineOptions] = React.useState<string[]>([]);
  const [dirOptions, setDirOptions] = React.useState<
    Array<{ key: "up" | "down"; label: string; neighborApiName: string }>
  >([]);

  // ▶ 처음 열릴 때 70% 지점에서 시작 (expand → snapToIndex)
  React.useEffect(() => {
    if (open) {
      ref.current?.snapToIndex(0); // snapPoints[0] == "70%"
    } else {
      ref.current?.close();
    }
  }, [open]);

  // ===== 입력 변화 → 자동완성 목록 갱신(확정값은 건드리지 않음) =====
  const onChangeStation = (v: string) => {
    setStationQuery(v);
    setPickedApiName(null);
    setLine("");
    setDirection("");
    setDirOptions([]);

    const t = v.trim();
    if (t.length === 0) {
      setStationList([]);
      setLineOptions([]);
      return;
    }
    // ✅ AddAlarmSheet와 동일: 결과 shape = { displayName, apiName, line }
    const items = searchStations(t, { limit: 12 });
    setStationList(items);
  };

  // ===== 자동완성 항목 탭 → 역 확정 + 라인 프리필 + 방면 목록 로드 =====
  const pickStation = (item: {
    displayName: string;
    apiName: string;
    line: string;
  }) => {
    setStationQuery(item.displayName); // 입력칸에도 반영
    setStation(item.displayName); // 확정된 표시값
    setPickedApiName(item.apiName); // 유틸 호출용 id

    const lines = getLinesForStation(item.apiName); // ["2호선","4호선"] 같은 배열
    setLineOptions(lines);
    setLine(item.line); // 선택 항목의 라인으로 프리필

    const dirs = getDirectionsForStationLine(item.apiName, item.line);
    setDirOptions(dirs); // [{key:"up"|"down", label:"낙성대 방면", ...}, ...]
    setDirection(""); // 방면은 아직 미선택
    setStationList([]); // 드롭다운 닫기
  };

  // ===== 라인 칩 탭 → 라인 확정 + 방면 목록 로드 =====
  const pickLineChip = (v: string) => {
    // 자동완성 탭 없이 라인부터 누른 경우 대비: query로 apiName 추정
    let apiName = pickedApiName;
    if (!apiName) {
      const fallback = searchStations(stationQuery.trim(), { limit: 1 });
      if (fallback.length > 0) {
        apiName = fallback[0].apiName;
        setPickedApiName(apiName);
        const lines = getLinesForStation(apiName);
        setLineOptions(lines);
      }
    }
    setLine(v);
    setDirection("");
    if (apiName) {
      const dirs = getDirectionsForStationLine(apiName, v);
      setDirOptions(dirs);
    } else {
      setDirOptions([]);
    }
  };

  // ===== 방면 카드 탭 → 방면 확정 =====
  const pickDirection = (d: {
    key: "up" | "down";
    label: string;
    neighborApiName: string;
  }) => {
    setDirection(d.label); // ✅ 사람이 읽는 라벨 그대로
  };

  // ===== 즐겨찾기 추가 =====
  const handleSubmit = () => {
    if (!station || !line || !direction) {
      return Alert.alert("안내", "지하철/방면을 입력 또는 선택해주세요.");
    }
    // key = apiName|line|direction (apiName이 없을 수 있어 displayName 사용 보완)
    const sid = pickedApiName || station;
    const favKey = `${sid}|${line}|${direction}`;
    if (existsFavorite?.(favKey)) {
      onClose();
      return;
    }
    addFavorite({
      key: favKey,
      stationId: sid,
      stationName: station,
      line, // "2호선" 같은 라벨
      direction, // "평촌 방면" 같은 라벨
    });
    onClose();
  };

  return open ? (
    <BottomSheet
      ref={ref}
      // 처음 70%에서 열리고, 필요 시 90%까지 끌어올릴 수 있게 구성
      snapPoints={["70%", "90%"]}
      index={0}
      android_keyboardInputMode="adjustPan"
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={{ backgroundColor: "#fff", borderTopLeftRadius: 22, borderTopRightRadius: 22 }}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: paddingH, paddingBottom: 220 }}
        keyboardShouldPersistTaps="always"
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.hTitle}>즐겨찾기 추가</Text>
          <Pressable onPress={onClose}>
            <Text style={styles.hClose}>닫기</Text>
          </Pressable>
        </View>

        {/* ===== AddAlarmSheet 2단계와 동일 UI ===== */}
        <Text style={styles.section}>지하철/방면 설정</Text>

        {/* 역 입력 + 자동완성(입력칸 자동 채움 금지) */}
        <BottomSheetTextInput
          placeholder="역명 (예: 사당역)"
          value={stationQuery}
          onChangeText={onChangeStation}
          style={styles.input}
          autoCorrect={false}
          autoCapitalize="none"
        />

        {/* 자동완성 목록 */}
        {stationList.length > 0 && (
          <View style={styles.autoBox}>
            {stationList.map((it, idx) => (
              <Pressable
                key={`${it.apiName}-${it.line}-${idx}`}
                onPress={() => pickStation(it)}
                style={styles.autoItem}
              >
                <Text style={{ fontWeight: "600" }}>{it.displayName}</Text>
                <Text style={{ color: "#777", marginTop: 2 }}>{it.line}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* 라인 칩 */}
        {(pickedApiName || lineOptions.length > 0) && (
          <View style={{ marginTop: 10, flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {lineOptions.map((ln) => {
              const on = ln === line;
              return (
                <Pressable
                  key={ln}
                  onPress={() => pickLineChip(ln)}
                  style={[styles.chip, on && styles.chipOn, { height: 34, paddingHorizontal: 10, borderRadius: 8 }]}
                >
                  <Text style={{ color: on ? "#fff" : "#666", fontWeight: "600" }}>{ln}</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* 방면 후보 버튼 */}
        {dirOptions.length > 0 && (
          <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
            {dirOptions.map((d) => {
              const on = direction === d.label;
              return (
                <Pressable
                  key={`${d.key}-${d.label}`}
                  onPress={() => pickDirection(d)}
                  style={[styles.bigBtn, on && styles.bigBtnOn, { flex: 1 }]}
                >
                  <Text style={[styles.bigBtnTitle, on && styles.bigBtnTitleOn]}>{d.label}</Text>
                  <Text style={[styles.bigBtnSub, on && styles.bigBtnSubOn]}>선택</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        {/* 하단 액션 */}
        <View style={{ height: 16 }} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable onPress={onClose} style={styles.btnGhost}>
            <Text style={styles.btnGhostText}>취소</Text>
          </Pressable>
          <Pressable
            onPress={handleSubmit}
            disabled={!station || !line || !direction}
            style={[styles.btnPrimary, (!station || !line || !direction) && { opacity: 0.4 }]}
          >
            <Text style={styles.btnPrimaryText}>즐겨찾기 추가</Text>
          </Pressable>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  ) : null;
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  hTitle: { fontSize: 18, fontWeight: "700" },
  hClose: { color: "#9CA3AF" },
  section: { fontSize: 14, fontWeight: "600", marginTop: 6 },

  input: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#FFF",
    paddingHorizontal: 12,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
    marginTop: 8,
  },

  autoBox: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee", marginTop: 6, ...shadowCard },
  autoItem: { paddingHorizontal: 12, paddingVertical: 10 },

  chip: {
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },
  chipOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  bigBtn: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    ...shadowCard,
  },
  bigBtnOn: { borderColor: COLORS.primary, backgroundColor: "rgba(90,77,255,0.10)" },
  bigBtnTitle: { fontWeight: "700", color: "#111" },
  bigBtnTitleOn: { color: COLORS.primary },
  bigBtnSub: { marginTop: 2, color: "#6B7280", fontSize: 12 },
  bigBtnSubOn: { color: COLORS.primary },

  btnGhost: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostText: { fontSize: 15, fontWeight: "600", color: "rgba(0,0,0,0.8)" },

  btnPrimary: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
});
