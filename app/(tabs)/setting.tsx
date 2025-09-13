// /subway-alert/app/(tabs)/setting.tsx
import React, { useMemo, useState } from "react";
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import COLORS from "../../lib/colors";
import { radiusCard, paddingH, shadowCard } from "../../lib/ui";
import { useSystem } from "../../store/useSystem";
import { useAlarms } from "../../store/useAlarms";
import { useUser } from "../../store/useUser";
import {
  requestWhenInUse,
  requestAlwaysIOS,
  requestBackgroundAndroid,
  openAppSettings,
  openBatteryOptimizationSettings,
} from "../../lib/permissions";
import { refreshGeofencing } from "../../background/geofencing";

export default function Settings() {
  const { permission, gpsOn, geofence, batteryOptimized, refreshSystemStatus } = useSystem();
  const { alarms } = useAlarms();
  const { nickname, setNickname } = useUser();
  const [tempName, setTempName] = useState(nickname);

  const [openSection, setOpenSection] = useState<null | string>("nickname"); // 기본으로 닉네임 열림

  const activeCount = useMemo(() => alarms.filter(a => a.enabled).length, [alarms]);

  const statusBadge = useMemo(() => {
    if (Platform.OS === "ios") {
      if (permission.iosLevel === "always" && permission.precise && gpsOn)
        return { color: "#10B981", label: "정상" };
      if (permission.iosLevel === "denied" || !gpsOn) return { color: "#EF4444", label: "문제" };
      return { color: "#F59E0B", label: "부분 허용" };
    } else {
      if (permission.android.bg && permission.android.fg && gpsOn && !batteryOptimized)
        return { color: "#10B981", label: "정상" };
      if (!permission.android.fg || !gpsOn) return { color: "#EF4444", label: "문제" };
      return { color: "#F59E0B", label: "부분 허용" };
    }
  }, [permission, gpsOn, batteryOptimized]);

  const lastSyncText = useMemo(() => {
    if (!geofence.lastSyncAt) return "—";
    const d = new Date(geofence.lastSyncAt);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const ss = String(d.getSeconds()).padStart(2, "0");
    return `${mm}/${dd} ${hh}:${mi}:${ss}`;
  }, [geofence.lastSyncAt]);

  // 핸들러들
  const onPressPermission = async () => {
    if (Platform.OS === "ios") {
      if (permission.iosLevel === "denied") {
        Alert.alert("권한 필요", "설정에서 위치 접근 권한을 허용해 주세요.", [
          { text: "취소", style: "cancel" },
          { text: "설정 열기", onPress: openAppSettings },
        ]);
        return;
      }
      if (permission.iosLevel !== "always") {
        await requestWhenInUse();
        await requestAlwaysIOS();
        await refreshSystemStatus();
        return;
      }
      if (!permission.precise) {
        Alert.alert(
          "정확한 위치 권장",
          "정확한 위치가 꺼져 있어 알림 감지가 지연될 수 있어요. 설정에서 '정확한 위치'를 켜주세요.",
          [
            { text: "나중에", style: "cancel" },
            { text: "설정 열기", onPress: openAppSettings },
          ]
        );
      } else {
        Alert.alert("권한 상태", "이미 백그라운드 위치 권한이 정상입니다.");
      }
    } else {
      if (!permission.android.fg) {
        await requestWhenInUse();
        await refreshSystemStatus();
      }
      if (!permission.android.bg) {
        Alert.alert(
          "백그라운드 권한 필요",
          "앱을 열지 않아도 알림을 받으려면 '항상 허용' 권한이 필요합니다.",
          [
            { text: "취소", style: "cancel" },
            {
              text: "요청하기",
              onPress: async () => {
                await requestBackgroundAndroid();
                await refreshSystemStatus();
              },
            },
          ]
        );
      } else {
        Alert.alert("권한 상태", "이미 백그라운드 위치 권한이 정상입니다.");
      }
    }
  };

  const onPressBattery = () => {
    if (Platform.OS === "android") {
      openBatteryOptimizationSettings();
    } else {
      Alert.alert("안내", "배터리 최적화 설정은 Android에서만 제공됩니다.");
    }
  };

  const onPressPreciseGuide = () => {
    if (Platform.OS === "ios") {
      Alert.alert("정확한 위치 켜는 방법", "설정 > 앱 > 위치 > '정확한 위치'를 켜주세요.", [
        { text: "닫기", style: "cancel" },
        { text: "설정 열기", onPress: openAppSettings },
      ]);
    } else {
      Alert.alert("정확한 위치 안내", "설정 > 위치 > 위치 정확도 개선(또는 고정밀)을 켜주세요.", [
        { text: "닫기" },
      ]);
    }
  };

  const [busy, setBusy] = useState(false);
  const onPressReRegister = async () => {
    try {
      setBusy(true);
      await refreshGeofencing();
      await refreshSystemStatus();
    } finally {
      setBusy(false);
    }
  };

  const onPressRescan = async () => {
    await refreshSystemStatus();
  };

  // 아코디언 헤더 공통 UI
  const AccordionHeader = ({ title, section }: { title: string; section: string }) => (
    <Pressable
      style={styles.accordionHeader}
      onPress={() => setOpenSection(openSection === section ? null : section)}
    >
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={{ fontSize: 14 }}>{openSection === section ? "▲" : "▼"}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <ScrollView contentContainerStyle={{ padding: paddingH, paddingBottom: 28 }}>
        <Text style={styles.header}>설정</Text>

        {/* 닉네임 설정 */}
        <View style={styles.card}>
          <AccordionHeader title="닉네임 변경" section="nickname" />
          {openSection === "nickname" && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                style={styles.input}
                value={tempName}
                onChangeText={setTempName}
                placeholder="닉네임을 입력하세요"
              />
              <Pressable
                style={[styles.btn, styles.btnPrimary, { marginTop: 12 }]}
                onPress={() => setNickname(tempName)}
              >
                <Text style={styles.btnPrimaryText}>저장</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 상태 요약 */}
        <View style={styles.card}>
          <AccordionHeader title="상태 요약" section="status" />
          {openSection === "status" && (
            <View style={{ marginTop: 12 }}>
              <View style={styles.rowBetween}>
                <Text style={styles.kvKey}>GPS</Text>
                <Text style={styles.kvVal}>{gpsOn ? "ON" : "OFF"}</Text>
              </View>
              <Text style={styles.kvVal}>활성 알람 수: {activeCount}개</Text>
              <Text style={styles.kvVal}>마지막 동기화: {lastSyncText}</Text>
            </View>
          )}
        </View>

        {/* 권한 관리 */}
        <View style={styles.card}>
          <AccordionHeader title="권한 관리" section="permission" />
          {openSection === "permission" && (
            <View style={{ marginTop: 12 }}>
              <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onPressPermission}>
                <Text style={styles.btnPrimaryText}>권한 요청/상태 확인</Text>
              </Pressable>
              <View style={{ height: 8 }} />
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={openAppSettings}>
                <Text style={styles.btnGhostText}>앱 설정 열기</Text>
              </Pressable>
              {Platform.OS === "android" && (
                <>
                  <View style={{ height: 8 }} />
                  <Pressable style={[styles.btn, styles.btnGhost]} onPress={onPressBattery}>
                    <Text style={styles.btnGhostText}>배터리 최적화 설정</Text>
                  </Pressable>
                </>
              )}
              <View style={{ height: 8 }} />
              <Pressable style={[styles.btn, styles.btnGhost]} onPress={onPressPreciseGuide}>
                <Text style={styles.btnGhostText}>정확한 위치 안내</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 시스템 상태 */}
        <View style={styles.card}>
          <AccordionHeader title="시스템 상태" section="system" />
          {openSection === "system" && (
            <View style={{ marginTop: 12 }}>
              {geofence.logs?.slice(0, 5).map((l, i) => (
                <Text key={i} style={styles.logLine}>• {l}</Text>
              ))}
              {(!geofence.logs || geofence.logs.length === 0) && (
                <Text style={[styles.logLine, { color: "#9CA3AF" }]}>최근 로그가 없습니다</Text>
              )}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                <Pressable style={[styles.btnSmall, styles.btnOutline]} onPress={onPressRescan}>
                  <Text style={styles.btnOutlineText}>권한/상태 재검사</Text>
                </Pressable>
                <Pressable
                  style={[styles.btnSmall, styles.btnPrimary, busy && { opacity: 0.6 }]}
                  onPress={onPressReRegister}
                  disabled={busy}
                >
                  <Text style={styles.btnPrimaryText}>
                    {busy ? "재등록 중..." : "지오펜스 재등록"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { marginVertical: 12, fontWeight: "600", fontSize: 24, color: COLORS.primary },
  card: {
    backgroundColor: "#fff",
    borderRadius: radiusCard,
    padding: 16,
    ...shadowCard,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  accordionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kvKey: { color: "#6B7280", fontSize: 13 },
  kvVal: { color: "#111827", fontSize: 13, fontWeight: "600" },
  btn: { height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnPrimary: { backgroundColor: COLORS.primary ?? "#5A4DFF" },
  btnPrimaryText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnGhost: { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff" },
  btnGhostText: { color: "#374151", fontSize: 15, fontWeight: "700" },
  logLine: { fontSize: 12, color: "#374151", marginTop: 4 },
  btnSmall: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnOutline: { borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: "#fff" },
  btnOutlineText: { color: "#374151", fontSize: 14, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: "#111827",
  },
});