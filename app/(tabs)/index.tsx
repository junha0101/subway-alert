// /subway-alert/app/(tabs)/index.tsx
import React from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler"; // ✅ 추가
import COLORS from "../../lib/colors";
import { T } from "../../lib/typography";
import { paddingH, radiusCard, shadowCard } from "../../lib/ui";
import { useAlarms } from "../../store/useAlarms";
import ToggleBadge from "../../components/ToggleBadge";
import FabPlus from "../../components/FabPlus";
import AddAlarmSheet from "../../components/AddAlarmSheet";
import { sendArrivalNotification } from "../../utils/notify";
import { getMockArrivals } from "../../utils/arrivals.mock";
import { fetchRealtimeArrivals } from "../../utils/api/seoul"; // ✅ API 테스트용 임포트

// ✅ 우측 Delete 액션 (홈 전용, 스타일 최소 추가)
function RightActions({ onDelete }: { onDelete: () => void }) {
  return (
    <Pressable
      onPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel="알람 삭제"
      style={{
        backgroundColor: "#EF4444",
        justifyContent: "center",
        alignItems: "center",
        width: 88,
        borderRadius: radiusCard,
        marginBottom: 12,
        marginLeft: 8,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>삭제</Text>
    </Pressable>
  );
}

export default function Home() {
  const { alarms, toggleAlarm, customPhrases, removeAlarm } = useAlarms() as any; // ✅ removeAlarm 추가
  const enabled = alarms.filter((a: any) => a.enabled);
  const [open, setOpen] = React.useState(false);
  const [apiLoading, setApiLoading] = React.useState(false);

  // 삭제 확인 다이얼로그
  const confirmDelete = (id: string, title: string) => {
    Alert.alert(
      "알람 삭제",
      `“${title}” 알람을 삭제할까요?`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            try {
              removeAlarm(id); // UNDO 없음, 즉시 확정
            } catch (e) {
              Alert.alert("삭제에 실패했어요. 다시 시도해주세요.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // 실제 알림 테스트 (모킹 데이터 기반)
  async function testNotify() {
    if (alarms.length === 0) return;
    const title: string = alarms[0].title;
    const m = title.match(/^(.*)\s(.*)\s\((.*)\)$/);
    const station = m?.[1] ?? "인덕원역";
    const line = m?.[2] ?? "4호선";
    const direction = m?.[3] ?? "사당 방면";

    const { first, second } = await getMockArrivals({ station, line, direction });

    await sendArrivalNotification({
      station,
      line,
      direction,
      firstStopsAway: first,
      secondStopsAway: second,
      phrases: customPhrases,
    });
  }

  // ✅ API 실 호출 테스트 버튼 핸들러
  async function testApi() {
    if (apiLoading) return;
    setApiLoading(true);
    try {
      // 역 이름은 임시 고정값. 나중에 선택값으로 바꿔도 됨.
      const data = await fetchRealtimeArrivals("인덕원");
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0];
        Alert.alert(
          "API 성공",
          `총 ${data.length}건 수신\n예: ${first.updnLine ?? ""}/${first.trainLineNm ?? ""} · ${first.arvlMsg2 ?? ""}`
        );
        console.log("[API 성공] 수신 건수:", data.length, "\n샘플:", data.slice(0, 2));
      } else {
        Alert.alert("API 결과", "0건 수신(역명/응답 확인 필요)");
        console.log("[API 결과] 0건 수신:", data);
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      Alert.alert("API 실패", msg);
      console.log("[API 실패]", e);
    } finally {
      setApiLoading(false);
    }
  }

  // 시각적 테스트 (실제 알림 대신 화면에서만 확인)
  function testVisual() {
    Alert.alert("✅ 알림 시각적 테스트", "이 자리에 실제 알림 UI가 표시됩니다.");
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <ScrollView contentContainerStyle={{ padding: paddingH, paddingBottom: 120 }}>
        <Text style={[T.helloName, { color: COLORS.primary, marginTop: 8 }]}>준하님,</Text>
        <Text style={[T.helloSub]}>오늘도 안전하고 가벼운 이동 되세요~!</Text>

        {/* 자주 타는 것 */}
        <View style={[styles.card, { marginTop: 14 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
            <Text style={[T.cardTitle]}>자주 타는 것</Text>
            <Pressable><Text style={{ color: COLORS.primary, fontWeight: "600" }}>+ 추가하기</Text></Pressable>
          </View>
          <View style={{ height: 80, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1, borderColor: "#F1F5F9" }} />
        </View>

        {/* 활성화된 알람 */}
        <Text style={{ marginTop: 18, marginBottom: 8, color: COLORS.textSub }}>활성화된 알람</Text>
        {enabled.map((a: any) => (
          <Swipeable
            key={a.id}
            renderRightActions={() => (
              <RightActions onDelete={() => confirmDelete(a.id, a.title)} />
            )}
            overshootRight={false}
          >
            <View style={[styles.alarmCard]}>
              <View style={{ flex: 1 }}>
                <Text style={T.cardTitle}>{a.title}</Text>
                <Text style={T.cardSub}>{fmtDays(a.days)}  /  {a.startTime}~{a.endTime}</Text>
              </View>
              <ToggleBadge value={a.enabled} onChange={() => toggleAlarm(a.id)} />
            </View>
          </Swipeable>
        ))}

        {/* 버튼 2개 (가로 정렬) */}
        <View style={{ flexDirection: "row", justifyContent: "center", marginTop: 12 }}>
          <Pressable onPress={testNotify} style={{ marginHorizontal: 8 }}>
            <Text style={{ color: COLORS.primary, fontWeight: "600" }}>알림 테스트</Text>
          </Pressable>
          <Pressable onPress={testApi} style={{ marginHorizontal: 8 }} disabled={apiLoading}>
            <Text style={{ color: apiLoading ? "#A0A0A0" : COLORS.primary, fontWeight: "600" }}>
              {apiLoading ? "API 테스트 중…" : "API 테스트"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <FabPlus onPress={() => setOpen(true)} />
      {open && <AddAlarmSheet open={open} onClose={() => setOpen(false)} />}
    </SafeAreaView>
  );
}

function fmtDays(days: number[]) {
  const n = ["월", " 화", " 수", " 목", " 금", " 토"," 일"];
  return days.length ? days.sort((a, b) => a - b).map(d => n[d]).join("") : "요일 미설정";
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.cardBg, borderRadius: radiusCard, padding: 14, ...shadowCard },
  alarmCard: { backgroundColor: "#fff", borderRadius: radiusCard, padding: 14, marginBottom: 12, flexDirection: "row", alignItems: "center", ...shadowCard },
});
