// /subway-alert/components/AddAlarmSheet.tsx
import React from "react";
import { View, Text, StyleSheet, TextInput, Pressable, Platform, Alert } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView, // ✅ ScrollView로 교체
} from "@gorhom/bottom-sheet";
import MapView, { Marker, Region } from "react-native-maps";
import * as Location from "expo-location";
import DateTimePicker from "@react-native-community/datetimepicker";

import COLORS from "../lib/colors";
import { radiusCard, shadowCard } from "../lib/ui";
import { useAlarms } from "../store/useAlarms";
// import RadiusPickerSheet from "./RadiusPickerSheet"; // ⛔ 반경 관련 제거
import { geocodeAddress } from "../utils/geocode";

// 역/노선/방면 유틸
import { searchStations, getLinesForStation, getDirectionsForStationLine } from "../utils/stations";
// import { getNextTwoArrivals } from "../utils/api/arrivals"; // ⛔ 미리보기 제거

type Props = {
  open: boolean;
  onClose: () => void;
};

const toHM = (d: Date) => {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

export default function AddAlarmSheet({ open, onClose }: Props) {
  const ref = React.useRef<BottomSheet>(null);
  const mapRef = React.useRef<MapView>(null);

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

  const { addAlarm } = useAlarms() as any;

  // 단계
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  // 1) 위치
  const [address, setAddress] = React.useState("");
  const [region, setRegion] = React.useState<Region>({
    latitude: 37.3949,
    longitude: 127.1112,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [confirmEnabled, setConfirmEnabled] = React.useState(false);
  const [confirmedLocation, setConfirmedLocation] = React.useState<{ latitude: number; longitude: number } | null>(null);

  // 2) 지하철/방면
  const [station, setStation] = React.useState(""); // ✅ 선택 확정된 표시용(탭했을 때만 세팅)
  const [line, setLine] = React.useState(""); // 선택된 라인
  const [direction, setDirection] = React.useState("");// "평촌 방면"
  // 자동완성 보조
  const [stationQuery, setStationQuery] = React.useState(""); // ✅ 사용자가 타이핑한 그대로
  const [stationList, setStationList] = React.useState<
    Array<{ displayName: string; apiName: string; line: string }>
  >([]);
  const [pickedApiName, setPickedApiName] = React.useState<string | null>(null);
  const [lineOptions, setLineOptions] = React.useState<string[]>([]);
  const [dirOptions, setDirOptions] = React.useState<
    Array<{ key: "up" | "down"; label: string; neighborApiName: string }>
  >([]);

  // 3) 조건/요일/시간 (반경 제거)
  const [trigger, setTrigger] = React.useState<"enter" | "exit">("enter");
  const [days, setDays] = React.useState<number[]>([]);
  const [start, setStart] = React.useState("07:00");
  const [end, setEnd] = React.useState("09:30");

  const [startDate, setStartDate] = React.useState(() => {
    const d = new Date();
    const [H, M] = start.split(":").map(Number);
    d.setHours(H, M, 0, 0);
    return d;
  });

  const [endDate, setEndDate] = React.useState(() => {
    const d = new Date();
    const [H, M] = end.split(":").map(Number);
    d.setHours(H, M, 0, 0);
    return d;
  });

  React.useEffect(() => {
    open ? ref.current?.expand() : ref.current?.close();
  }, [open]);

  // 현재 위치로 초기 이동(옵션)
  React.useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const cur = await Location.getCurrentPositionAsync({});
          setRegion(r => ({
            ...r,
            latitude: cur.coords.latitude,
            longitude: cur.coords.longitude
          }));
        }
      } catch { }
    })();
  }, []);

  // 주소 검색
  const searchAddress = async () => {
    if (!address.trim()) return Alert.alert("안내", "주소를 입력해주세요.");
    const p = await geocodeAddress(address.trim());
    if (!p) return Alert.alert("안내", "해당 주소를 찾을 수 없습니다.");

    const next = {
      latitude: p.latitude,
      longitude: p.longitude,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 450);
    setConfirmEnabled(true);
    setConfirmedLocation(null);
  };

  const gotoMyLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;
    const loc = await Location.getCurrentPositionAsync({});
    const next = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      latitudeDelta: region.latitudeDelta,
      longitudeDelta: region.longitudeDelta,
    };
    setRegion(next);
    mapRef.current?.animateToRegion(next, 450);
    setConfirmEnabled(true);
    setConfirmedLocation(null);
  };

  const onRegionChangeComplete = (r: Region) => {
    setRegion(r);
    setConfirmEnabled(true);
    setConfirmedLocation(null);
  };

  const confirmCenter = () => {
    setConfirmedLocation({ latitude: region.latitude, longitude: region.longitude });
    setConfirmEnabled(false);
  };

  const toggleDay = (d: number) => {
    setDays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]);
  };

  // ===== 2단계: 역/노선/방면 (입력은 유지, 후보 리스트만 표시) =====
  const onChangeStation = (v: string) => {
    setStationQuery(v); // ❌ 입력 단계에서 station(확정값)을 덮지 않음
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

    const items = searchStations(t, { limit: 12 });
    setStationList(items);
    // ❌ 단일 매칭 자동 확정 제거 (사용자가 반드시 탭해서 선택)
  };

  const pickStation = (item: { displayName: string; apiName: string; line: string }) => {
    setStationQuery(item.displayName); // ✅ 이제서야 입력칸에 반영
    setStation(item.displayName); // ✅ 확정
    setPickedApiName(item.apiName);

    const lines = getLinesForStation(item.apiName);
    setLineOptions(lines);
    setLine(item.line); // 선택 아이템의 라인 즉시 확정

    const dirs = getDirectionsForStationLine(item.apiName, item.line);
    setDirOptions(dirs);
    setDirection(""); // 방면은 아직 선택 전
    setStationList([]); // 드롭다운 닫기
  };

  const pickLineChip = (v: string) => {
    // 타이핑만 하고 자동완성을 탭하지 않은 경우 보완: query로 apiName 추정
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

  const pickDirection = (d: { key: "up" | "down"; label: string; neighborApiName: string }) => {
    setDirection(d.label);
  };

  // ===================================================
  const handleCreate = () => {
    if (!confirmedLocation) return Alert.alert("안내", "위치를 먼저 확정해주세요.");
    if (!station || !line || !direction) return Alert.alert("안내", "지하철/방면을 입력 또는 선택해주세요.");
    if (days.length === 0) return Alert.alert("안내", "요일을 선택해주세요.");

    const FIXED_RADIUS = 100; // ✅ 반경 고정
    addAlarm({
      id: `${Date.now()}`,
      title: `${station} ${line} (${direction})`,
      radiusM: FIXED_RADIUS,
      days,
      startTime: start,
      endTime: end,
      enabled: true,
      location: { lat: confirmedLocation.latitude, lng: confirmedLocation.longitude },
      line,
      direction,
      targetTransit: { station, line, direction },
      trigger,
      createdAt: Date.now(),
    });

    Alert.alert("완료", "알람을 추가했습니다.");
    onClose();
  };

  return (
    <BottomSheet
      ref={ref}
      // ✅ 키보드 대응 + 스냅포인트 상향
      snapPoints={["90%"]}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBg}
      backdropComponent={renderBackdrop}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      {/* ✅ ScrollView로 교체 + paddingBottom */}
      <BottomSheetScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.wrap, { paddingBottom: 140 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.hTitle}>알림 추가</Text>
          <Pressable onPress={onClose}><Text style={styles.hClose}>닫기</Text></Pressable>
        </View>

        {/* 단계 인디케이터 */}
        <View style={styles.steps}>
          <Dot active={step >= 1} label="위치" />
          <Line />
          <Dot active={step >= 2} label="지하철" />
          <Line />
          <Dot active={step >= 3} label="설정" />
        </View>

        {/* 1단계: 위치 */}
        {step === 1 && (
          <View>
            <Text style={styles.section}>위치 설정</Text>
            <Text style={styles.hint}>주소를 입력한 뒤, search 키로 검색하세요.</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <TextInput
                placeholder="주소를 입력하세요"
                value={address}
                onChangeText={setAddress}
                style={[styles.input, { flex: 1 }]}
                returnKeyType="search"
                onSubmitEditing={searchAddress} // ✅ 버튼 없이 엔터로만 검색
                autoCorrect={false}
                autoCapitalize="none"
              />
              {/* ⛔ 오른쪽 '검색' 버튼 제거 */}
            </View>

            {/* 지도 */}
            <View style={styles.mapBox}>
              <MapView
                ref={mapRef}
                style={{ flex: 1, borderRadius: radiusCard }}
                initialRegion={region}
                region={region}
                onRegionChangeComplete={onRegionChangeComplete}
              >
                <Marker coordinate={{ latitude: region.latitude, longitude: region.longitude }} />
              </MapView>

              <Pressable onPress={gotoMyLocation} style={styles.myLocBtn}>
                <Text style={{ color: "#fff", fontWeight: "700" }}>내 위치</Text>
              </Pressable>
            </View>

            {/* 위치 확정 */}
            <Pressable
              onPress={confirmCenter}
              disabled={!confirmEnabled}
              style={[
                styles.btnConfirm,
                !confirmEnabled ? styles.btnConfirmDisabled : styles.btnConfirmOn,
              ]}
            >
              <Text
                style={[
                  styles.btnConfirmText,
                  !confirmEnabled ? styles.btnConfirmTextDisabled : styles.btnConfirmTextOn,
                ]}
              >
                {confirmedLocation ? "위치 확정됨" : "위치 확정하기"}
              </Text>
            </Pressable>

            <View style={styles.row}>
              <Ghost label="취소" onPress={onClose} />
              <Primary label="다음" onPress={() => setStep(2)} disabled={!confirmedLocation} />
            </View>
          </View>
        )}

        {/* 2단계: 지하철/방면 */}
        {step === 2 && (
          <View>
            <Text style={styles.section}>지하철/방면 설정</Text>

            {/* 역 입력 + 자동완성(입력칸 자동 채움 금지) */}
            <TextInput
              placeholder="역명 (예: 사당역)"
              value={stationQuery}
              onChangeText={onChangeStation}
              style={styles.input}
              autoCorrect={false}
              autoCapitalize="none"
            />

            {/* 자동완성 목록 */}
            {stationList.length > 0 && (
              <View style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#eee", marginTop: 6 }}>
                {stationList.map((it, idx) => (
                  <Pressable
                    key={`${it.apiName}-${it.line}-${idx}`}
                    onPress={() => pickStation(it)}
                    style={{ paddingHorizontal: 12, paddingVertical: 10 }}
                  >
                    <Text style={{ fontWeight: "600" }}>{it.displayName}</Text>
                    <Text style={{ color: "#777", marginTop: 2 }}>{it.line}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* 라인 칩 (다중 라인 역일 때만 표시) */}
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

            <View style={styles.row}>
              <Ghost label="이전" onPress={() => setStep(1)} />
              <Primary label="다음" onPress={() => setStep(3)} disabled={!station || !line || !direction} />
            </View>
          </View>
        )}

        {/* 3단계: 조건 → 요일 → 시간 */}
        {step === 3 && (
          <View>
            <Text style={styles.section}>조건 · 알람 설정</Text>

            {/* 조건(진입/이탈) */}
            <Text style={styles.label}>조건 설정 (설정한 위치 기준 반경 100m 내에 조건 실행)</Text>
            <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
              <Pressable onPress={() => setTrigger("enter")} style={[styles.bigBtn, trigger === "enter" && styles.bigBtnOn]}>
                <Text style={[styles.bigBtnTitle, trigger === "enter" && styles.bigBtnTitleOn]}>진입 알림</Text>
                <Text style={[styles.bigBtnSub, trigger === "enter" && styles.bigBtnSubOn]}>설정한 위치에 진입할 때</Text>
              </Pressable>
              <Pressable onPress={() => setTrigger("exit")} style={[styles.bigBtn, trigger === "exit" && styles.bigBtnOn]}>
                <Text style={[styles.bigBtnTitle, trigger === "exit" && styles.bigBtnTitleOn]}>이탈 알림</Text>
                <Text style={[styles.bigBtnSub, trigger === "exit" && styles.bigBtnSubOn]}>설정한 위치에서 벗어날 때</Text>
              </Pressable>
            </View>

            {/* 요일 */}
            <Text style={styles.label}>요일 설정</Text>
            <View style={styles.days}>
              {["일","월","화","수","목","금","토"].map((d, i) => {
                const on = days.includes(i);
                return (
                  <Pressable key={i} onPress={() => toggleDay(i)} style={[styles.chip, on && styles.chipOn]}>
                    <Text style={{ color: on ? "#fff" : "#666" }}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* 시간 */}
            <Text style={styles.label}>시간 설정</Text>
            {Platform.OS === "ios" ? (
              <View style={styles.timeRowInline}>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>시작</Text>
                  <DateTimePicker
                    mode="time"
                    display="compact"
                    value={startDate}
                    onChange={(_, d) => {
                      if (!d) return;
                      setStartDate(d);
                      setStart(toHM(d));
                    }}
                    style={styles.compactPicker}
                  />
                </View>
                <View style={styles.timeCol}>
                  <Text style={styles.timeLabel}>종료</Text>
                  <DateTimePicker
                    mode="time"
                    display="compact"
                    value={endDate}
                    onChange={(_, d) => {
                      if (!d) return;
                      setEndDate(d);
                      setEnd(toHM(d));
                    }}
                    style={styles.compactPicker}
                  />
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeLabel}>시작</Text>
                  <TextInput value={start} onChangeText={setStart} style={styles.input} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeLabel}>종료</Text>
                  <TextInput value={end} onChangeText={setEnd} style={styles.input} />
                </View>
              </View>
            )}

            <View style={styles.row}>
              <Ghost label="이전" onPress={() => setStep(2)} />
              <Primary label="알람 추가하기" onPress={handleCreate} />
            </View>
          </View>
        )}
      </BottomSheetScrollView>
      {/* ⛔ 반경/미리보기 관련 바텀시트 없음 */}
    </BottomSheet>
  );
}

function Dot({ active, label }: { active: boolean; label: string }) {
  return (
    <View style={{ alignItems: "center" }}>
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: active ? COLORS.primary : "#D1D5DB",
        }}
      />
      <Text style={{ fontSize: 12, color: active ? COLORS.primary : "#999", marginTop: 6 }}>{label}</Text>
    </View>
  );
}

function Line() {
  return <View style={{ height: 1, backgroundColor: "#E5E7EB", flex: 1, marginHorizontal: 8 }} />;
}

function Ghost({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.btnGhost}>
      <Text style={styles.btnGhostText}>{label}</Text>
    </Pressable>
  );
}

function Primary({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[styles.btnPrimary, disabled && { opacity: 0.4 }]}>
      <Text style={styles.btnPrimaryText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheetBg: { borderTopLeftRadius: 22, borderTopRightRadius: 22 },
  wrap: { padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  hTitle: { fontSize: 18, fontWeight: "700" },
  hClose: { color: "#9CA3AF" },
  steps: { flexDirection: "row", alignItems: "center", marginBottom: 12, paddingHorizontal: 8 },
  section: { fontSize: 14, fontWeight: "600", marginTop: 6 },
  hint: { color: "rgba(0,0,0,0.55)", marginTop: 2 },
  label: { marginTop: 16, color: "rgba(0,0,0,0.6)" },
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
  mapBox: {
    height: 180,
    backgroundColor: "#FFF",
    borderRadius: radiusCard,
    overflow: "hidden",
    marginTop: 12,
    ...shadowCard,
  },
  myLocBtn: {
    position: "absolute",
    right: 12,
    bottom: 12,
    backgroundColor: COLORS.primary,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    ...shadowCard,
  },
  row: { flexDirection: "row", gap: 12, marginTop: 16 },
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
    justifyContent: "center"
  },
  btnPrimaryText: { fontSize: 15, fontWeight: "600", color: "#FFF" },
  btnConfirm: { marginTop: 12, height: 42, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  // ✅ 더 진한 보라 틴트로 변경 (가독성 상승)
  btnConfirmOn: { borderColor: COLORS.primary, backgroundColor: "rgba(90,77,255,0.16)" },
  btnConfirmDisabled: { borderColor: "#E5E7EB", backgroundColor: "#FFF" },
  btnConfirmText: { fontWeight: "700" },
  btnConfirmTextOn: { color: COLORS.primary },
  btnConfirmTextDisabled: { color: "#444" },
  days: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
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
  timeRowInline: { flexDirection: "row", alignItems: "center", gap: 18, marginTop: 8 },
  timeCol: { flex: 1 },
  timeLabel: { color: "#6B7280", marginBottom: 6 },
  compactPicker: { alignSelf: "flex-start" },
});
