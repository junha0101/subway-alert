// /subway-alert/app/(tabs)/my.tsx
import React from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import COLORS from "../../lib/colors";
import { T } from "../../lib/typography";
import { paddingH, radiusCard, shadowCard } from "../../lib/ui";
import ToggleBadge from "../../components/ToggleBadge";
import { useAlarms } from "../../store/useAlarms";

// ✅ (추가) Home과 동일한 FAB & 바텀시트
import FabPlus from "../../components/FabPlus";
import AddAlarmSheet from "../../components/AddAlarmSheet";

// 빨간 Delete 액션(우측)
function RightActions({ onDelete }: { onDelete: () => void }) {
  return (
    <Pressable
      onPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel="알람 삭제"
      style={styles.deleteAction}
    >
      <Text style={styles.deleteText}>삭제</Text>
    </Pressable>
  );
}

export default function MyTab() {
  const { alarms, toggleAlarm, removeAlarm } = useAlarms() as any;

  // ✅ (추가) Home과 동일한 open state
  const [open, setOpen] = React.useState(false);

  // --- Swipeable refs & helpers (한 번에 하나만 열림 + 탭 이동 시 자동 닫힘) ---
  const swipeRefs = React.useRef<Record<string, any>>({});
  const openId = React.useRef<string | null>(null);

  const closeAllSwipes = React.useCallback(() => {
    Object.values(swipeRefs.current).forEach(r => r?.close?.());
    openId.current = null;
  }, []);

  // 화면을 떠날 때(blur)와 돌아올 때(focus 다음 프레임) 모두 닫기
  useFocusEffect(
    React.useCallback(() => {
      // focus 직후 다음 프레임에 한 번 더 닫기(타이밍 보정)
      requestAnimationFrame(() => closeAllSwipes());
      // blur 시 정리
      return () => {
        closeAllSwipes();
        setOpen(false);
      };
    }, [closeAllSwipes])
  );

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
              removeAlarm(id);  // ✅ 즉시 삭제 (UNDO 없음)
            } catch (e) {
              Alert.alert("삭제에 실패했어요. 다시 시도해주세요.");
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <ScrollView contentContainerStyle={{ padding: paddingH, paddingBottom: 120 }}>
        <Text style={[T.helloName, { color: COLORS.primary, marginTop: 8 }]}>나의 모든 알람</Text>
        <Text style={[T.helloSub]}>ON/OFF 모두 표시됩니다.</Text>

        <View style={{ height: 8 }} />

        {alarms.map((a: any) => (
          <Swipeable
            key={a.id}
            ref={(r) => {
              if (r) swipeRefs.current[a.id] = r;
              else delete swipeRefs.current[a.id];
            }}
            onSwipeableOpen={() => {
              if (openId.current && openId.current !== a.id) {
                swipeRefs.current[openId.current]?.close?.();
              }
              openId.current = a.id;
            }}
            onSwipeableClose={() => {
              if (openId.current === a.id) openId.current = null;
            }}
            renderRightActions={() => (
              <RightActions onDelete={() => confirmDelete(a.id, a.title)} />
            )}
            overshootRight={false}
          >
            <View
              style={[
                styles.alarmCard,
                !a.enabled && { backgroundColor: "#F3F4F6" }, // OFF일 때 회색 카드
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={T.cardTitle}>{a.title}</Text>
                {/* My 탭의 보조문구: 반경 노출 없음 */}
                <Text style={T.cardSub}>
                  {fmtDays(a.days)} {a.startTime}~{a.endTime}
                </Text>
              </View>
              <ToggleBadge value={a.enabled} onChange={() => toggleAlarm(a.id)} />
            </View>
          </Swipeable>
        ))}
      </ScrollView>

      {/* ✅ (추가) Home과 동일한 FAB & 바텀시트 트리거 */}
      <FabPlus onPress={() => setOpen(true)} />
      {open && <AddAlarmSheet open={open} onClose={() => setOpen(false)} />}
    </SafeAreaView>
  );
}

function fmtDays(days: number[]) {
  const n = ["일", "월", "화", "수", "목", "금", "토"];
  return days.length ? days.sort((a, b) => a - b).map(d => n[d]).join("") : "요일 미설정";
}

const styles = StyleSheet.create({
  alarmCard: {
    backgroundColor: "#fff",
    borderRadius: radiusCard,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    ...shadowCard,
  },
  deleteAction: {
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    width: 88,              // 스와이프 노출 폭 72~88 권장
    borderRadius: radiusCard,
    marginBottom: 12,
    marginLeft: 8,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,          // 13~14 권장
  },
});