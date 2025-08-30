// /subway-alert/app/(tabs)/index.tsx
import React from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import COLORS from "../../lib/colors";
import { T } from "../../lib/typography";
import { paddingH, radiusCard, shadowCard } from "../../lib/ui";
import { useAlarms } from "../../store/useAlarms";
import ToggleBadge from "../../components/ToggleBadge";
import FabPlus from "../../components/FabPlus";
import AddAlarmSheet from "../../components/AddAlarmSheet";
import AddFavoriteSheet from "../../components/AddFavoriteSheet";
import FavoriteMiniCard from "../../components/FavoriteMiniCard";

import { sendArrivalNotificationWithFields } from "../../utils/notify";
import { getMockArrivals } from "../../utils/arrivals.mock";
import { fetchRealtimeArrivals } from "../../utils/api/seoul";

const MINI_R = 14; // 미니카드/삭제 버튼 라운드 통일

function RightActions({ onDelete }: { onDelete: () => void }) {
  return (
    <Pressable
      onPress={onDelete}
      accessibilityRole="button"
      accessibilityLabel="삭제"
      style={{
        backgroundColor: "#EF4444",
        justifyContent: "center",
        alignItems: "center",
        width: 88,
        height: "100%",
        borderRadius: MINI_R,
        marginLeft: 8,
      }}
    >
      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>삭제</Text>
    </Pressable>
  );
}

// a.title 예: "강남역 2호선 (역삼 방면)"
function parseTitle(title: string) {
  const m = title?.match(/^(.*)\s(.*)\s\((.*)\)$/);
  return {
    station: m?.[1] ?? title ?? "",
    line: m?.[2] ?? "",
    direction: m?.[3] ?? "",
  };
}

export default function Home() {
  const {
    alarms, toggleAlarm, customPhrases, removeAlarm,
    favorites, removeFavorite,
  } = useAlarms() as any;

  const enabled = alarms.filter((a: any) => a.enabled);
  const [open, setOpen] = React.useState(false);
  const [favOpen, setFavOpen] = React.useState(false);
  const [apiLoading, setApiLoading] = React.useState(false);

  const confirmDeleteFavorite = (key: string, label: string) => {
    Alert.alert(
      "즐겨찾기 삭제",
      `“${label}”을 삭제할까요?`,
      [{ text: "취소", style: "cancel" }, { text: "삭제", style: "destructive", onPress: () => removeFavorite(key) }],
      { cancelable: true }
    );
  };

  async function testNotify() {
    if (alarms.length === 0) return;
    const title: string = alarms[0].title || "";
    const { station, line, direction } = parseTitle(title);

    const { first, second } = await getMockArrivals({ station, line, direction });
    await sendArrivalNotificationWithFields({
      station,
      line,
      direction,
      firstStopsAway: first,
      secondStopsAway: second,
      phrases: customPhrases,
    });
  }

  async function testApi() {
    if (apiLoading) return;
    setApiLoading(true);
    try {
      const data = await fetchRealtimeArrivals("인덕원");
      if (Array.isArray(data) && data.length > 0) {
        const first = data[0] || {};
        const msg =
          "총 " + data.length + "건 수신\n예: " +
          (first.updnLine || "") + "/" +
          (first.trainLineNm || "") + " · " +
          (first.arvlMsg2 || "");
        Alert.alert("API 성공", msg);
        console.log("[API 성공] 수신 건수:", data.length, "\n샘플:", data.slice(0, 2));
      } else {
        Alert.alert("API 결과", "0건 수신(역명/응답 확인 필요)");
        console.log("[API 결과] 0건 수신:", data);
      }
    } catch (e: any) {
      const msg = e?.message ? e.message : String(e);
      Alert.alert("API 실패", msg);
      console.log("[API 실패]", e);
    } finally {
      setApiLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
      <ScrollView contentContainerStyle={{ padding: paddingH, paddingBottom: 120 }}>
        <Text style={[T.helloName, { color: COLORS.primary, marginTop: 10, fontSize: 24 }]}>준하님,</Text>
        <Text style={[T.helloSub, { fontSize: 14 }]}>오도 안전하고 가벼운 이동 되세요~!</Text>

        {/* 자주 타는 것 */}
        <View style={styles.outerCard}>
          <View style={styles.favHeaderRow}>
            <Text style={[T.cardTitle]}>자주 타는 것</Text>
            <Pressable
              onPress={() => setFavOpen(true)}
              hitSlop={8}
              style={({ pressed }) => [styles.favPlusBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.favPlusTxt}>＋</Text>
            </Pressable>
          </View>

          {/* 목록/placeholder */}
          {!favorites || favorites.length === 0 ? (
            <Text style={[T.cardSub, { marginTop: 2 }]}>등록된 즐겨찾기가 없어요.</Text>
          ) : (
            <View style={{ gap: 10 }}>
              {favorites.map((f: any) => (
                <Swipeable
                  key={f.key}
                  renderRightActions={() => (
                    <RightActions
                      onDelete={() =>
                        confirmDeleteFavorite(f.key, `${f.stationName} ${f.line} (${f.direction})`)
                      }
                    />
                  )}
                  overshootRight={false}
                >
                  <FavoriteMiniCard stationName={f.stationName} line={f.line} direction={f.direction} />
                </Swipeable>
              ))}
            </View>
          )}
        </View>

        {/* 활성화된 알람 */}
        <Text style={{ marginTop: 18, marginBottom: 8, color: COLORS.textSub }}>활성화된 알람</Text>
        {enabled.map((a: any) => {
          const { station, line, direction } = parseTitle(a.title);
          return (
            <Swipeable
              key={a.id}
              renderRightActions={() => (
                <RightActions
                  onDelete={() =>
                    Alert.alert(
                      "알람 삭제",
                      `“${a.title}” 알람을 삭제할까요?`,
                      [{ text: "취소", style: "cancel" }, { text: "삭제", style: "destructive", onPress: () => removeAlarm(a.id) }],
                      { cancelable: true }
                    )
                  }
                />
              )}
              overshootRight={false}
            >
              <View style={styles.alarmCard}>
                <View style={{ flex: 1 }}>
                  {/* 1줄: 역명 + 호선 배지 + 방면(인라인) */}
                  <View style={styles.titleRow}>
                    <Text style={T.cardTitle}>{station}</Text>

                    {!!line && (
                      <View style={styles.lineBadge}>
                        <Text style={styles.lineBadgeText}>{line}</Text>
                      </View>
                    )}

                    {!!direction && (
                      <Text style={styles.dirInline} numberOfLines={1} ellipsizeMode="tail">
                        {direction}
                      </Text>
                    )}
                  </View>

                  {/* 2줄: 요일 / 시간 */}
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { fontWeight: 900, fontSize: 14, lineHeight: 20 }]}>{fmtDays(a.days)}</Text>
                    <Text style={[styles.metaDivider, { fontWeight: 900, fontSize: 14, lineHeight: 20 }]}> / </Text>
                    <Text style={[styles.metaText, { fontWeight: 700, fontSize: 14, lineHeight: 20 }]}>
                      {a.startTime}~{a.endTime}
                    </Text>
                  </View>
                </View>

                {/* 토글 */}
                <ToggleBadge value={a.enabled} onChange={() => toggleAlarm(a.id)} />
              </View>
            </Swipeable>
          );
        })}

        {/* 테스트 버튼 */}
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
      {favOpen && <AddFavoriteSheet open={favOpen} onClose={() => setFavOpen(false)} />}
    </SafeAreaView>
  );
}

function fmtDays(days: number[]) {
  const n = ["월", " 화", " 수", " 목", " 금", " 토", " 일"];
  return days.length ? days.sort((a, b) => a - b).map(d => n[d]).join("") : "요일 미설정";
}

const styles = StyleSheet.create({
  // 부모 카드
  outerCard: {
    backgroundColor: "#fff",
    borderRadius: radiusCard,
    padding: 14,
    overflow: "visible",
    marginTop: 8,
    ...shadowCard,
  },

  // 즐겨찾기 헤더 한 줄 정렬
  favHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center", // + 버튼 수직 중앙
    marginBottom: 9,
  },
  favPlusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  favPlusTxt: {
    color: COLORS.primary,
    fontWeight: "900",
    fontSize: 20,
  },

  // 알람 카드
  alarmCard: {
    backgroundColor: "#fff",
    borderRadius: radiusCard,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    ...shadowCard,
  },

  // 제목줄(역명 + 배지 + 방면)
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },

  // 호선 배지 (연보라 타원)
  lineBadge: {
    backgroundColor: "rgba(90,77,255,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    marginLeft: 8,
    alignSelf: "center",
  },
  lineBadgeText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 12,
  },

  // ✅ 방면 인라인(배지 오른쪽)
  dirInline: {
    fontSize: 13,
    color: "rgba(0,0,0,0.6)",
    marginLeft: 8,   // 배지와 동일 간격
    flexShrink: 1,   // 길면 말줄임
  },

  // 요일/시간
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 12.5, color: "rgba(0,0,0,0.6)" },
  metaDivider: { fontSize: 12.5, color: "rgba(0,0,0,0.35)", marginHorizontal: 6 },
});
