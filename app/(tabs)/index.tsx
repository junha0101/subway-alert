import React, { useEffect } from "react";
import { SafeAreaView, ScrollView, View, Text, StyleSheet, Pressable, Alert, AppState } from "react-native";
import { GestureHandlerRootView, Swipeable } from "react-native-gesture-handler";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import COLORS from "../../lib/colors";
import { T } from "../../lib/typography";
import { paddingH, radiusCard, shadowCard } from "../../lib/ui";
import { useAlarms } from "../../store/useAlarms";
import ToggleBadge from "../../components/ToggleBadge";
import FabPlus from "../../components/FabPlus";
import AddAlarmSheet from "../../components/AddAlarmSheet";
import AddFavoriteSheet from "../../components/AddFavoriteSheet";
import FavoriteMiniCard from "../../components/FavoriteMiniCard";
import { useUser } from "../../store/useUser";
import NicknameOnboarding from "../../components/NicknameOnboarding";

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
        borderRadius: MINI_R,
        marginLeft: 8,
        marginBottom: 12,
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

  const { nickname, hasOnboarded, setHasOnboarded } = useUser();
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  // ✅ 온보딩 끝났는지 확인 후 닉네임 모달 띄우기
  useEffect(() => {
    const checkOnboarding = async () => {
      const done = await AsyncStorage.getItem("onboarding:permissionsDone");
      if (done === "true" && !hasOnboarded) {
        setShowOnboarding(true);
      }
    };
    checkOnboarding();
  }, [hasOnboarded]);

  // ✅ 폴백: 포커스 변경이 없을 때도 키 변화를 감지하도록 짧게 폴링
  useEffect(() => {
    let cancelled = false;
    if (hasOnboarded) return;
    let tries = 0;
    const tick = async () => {
      try {
        const done = await AsyncStorage.getItem("onboarding:permissionsDone");
        if ((done === "true" || done === "1") && !hasOnboarded) {
          if (!cancelled) setShowOnboarding(true);
          return;
        }
        if (tries < 40 && !cancelled) { // 약 10초 이내(250ms * 40)
          tries += 1;
          setTimeout(tick, 250);
        }
      } catch {}
    };
    tick();
    return () => { cancelled = true; };
  }, [hasOnboarded]);

  // ✅ 앱이 백그라운드→포그라운드로 돌아올 때 재확인
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state === "active" && !hasOnboarded) {
        const done = await AsyncStorage.getItem("onboarding:permissionsDone");
        if ((done === "true" || done === "1") && !hasOnboarded) {
          setShowOnboarding(true);
        }
      }
    });
    return () => sub.remove();
  }, [hasOnboarded]);

  useFocusEffect(
    React.useCallback(() => {
      (async () => {
        const done = await AsyncStorage.getItem("onboarding:permissionsDone");
        if ((done === "true" || done === "1") && !hasOnboarded) {
          setShowOnboarding(true);
        }
      })();
    }, [hasOnboarded])
  );

  const handleNicknameDone = () => {
    setHasOnboarded(true);
    setShowOnboarding(false);
  };

  // --- Swipeable refs & helpers (favorites + alarms) ---
  const favSwipeRefs = React.useRef<Record<string, any>>({});
  const alarmSwipeRefs = React.useRef<Record<string, any>>({});
  const openFavId = React.useRef<string | null>(null);
  const openAlarmId = React.useRef<string | null>(null);

  const closeAllSwipes = React.useCallback(() => {
    Object.values(favSwipeRefs.current).forEach(r => r?.close?.());
    Object.values(alarmSwipeRefs.current).forEach(r => r?.close?.());
    openFavId.current = null;
    openAlarmId.current = null;
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      requestAnimationFrame(() => closeAllSwipes());
      return () => {
        closeAllSwipes();
        setOpen(false);
        setFavOpen(false);
      };
    }, [closeAllSwipes])
  );

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.screenBg }}>
        <ScrollView contentContainerStyle={{ padding: paddingH, paddingBottom: 120 }}>
          <Text style={[T.helloName, { color: COLORS.primary, marginTop: 10, fontSize: 24 }]}>
            {nickname ? `${nickname}님,` : "사용자님,"}
          </Text>
          <Text style={[T.helloSub, { fontSize: 14 }]}>오늘도 안전하고 가벼운 이동 되세요~!</Text>

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

            {!favorites || favorites.length === 0 ? (
              <Text style={[T.cardSub, { marginTop: 2 }]}>등록된 즐겨찾기가 없어요.</Text>
            ) : (
              <View style={{ gap: 10 }}>
                {favorites.map((f: any) => (
                  <Swipeable
                    key={f.key}
                    ref={(r) => {
                      if (r) favSwipeRefs.current[f.key] = r;
                      else delete favSwipeRefs.current[f.key];
                    }}
                    onSwipeableOpen={() => {
                      if (openFavId.current && openFavId.current !== f.key) {
                        favSwipeRefs.current[openFavId.current]?.close?.();
                      }
                      openFavId.current = f.key;
                    }}
                    onSwipeableClose={() => {
                      if (openFavId.current === f.key) openFavId.current = null;
                    }}
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
                ref={(r) => {
                  if (r) alarmSwipeRefs.current[a.id] = r;
                  else delete alarmSwipeRefs.current[a.id];
                }}
                onSwipeableOpen={() => {
                  if (openAlarmId.current && openAlarmId.current !== a.id) {
                    alarmSwipeRefs.current[openAlarmId.current]?.close?.();
                  }
                  openAlarmId.current = a.id;
                }}
                onSwipeableClose={() => {
                  if (openAlarmId.current === a.id) openAlarmId.current = null;
                }}
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

                    <View style={styles.metaRow}>
                      <Text style={[styles.metaText, { fontWeight: '900', fontSize: 14, lineHeight: 20 }]}>{fmtDays(a.days)}</Text>
                      <Text style={[styles.metaDivider, { fontWeight: '900', fontSize: 14, lineHeight: 20 }]}> / </Text>
                      <Text style={[styles.metaText, { fontWeight: '700', fontSize: 14, lineHeight: 20 }]}>
                        {a.startTime}~{a.endTime}
                      </Text>
                    </View>
                  </View>
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

        {/* ✅ 닉네임 온보딩 모달 */}
        {showOnboarding && (
          <NicknameOnboarding visible={showOnboarding} onClose={handleNicknameDone} />
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

function fmtDays(days: number[]) {
  const n = ["월", " 화", " 수", " 목", " 금", " 토", " 일"];
  return days.length ? days.sort((a, b) => a - b).map(d => n[d]).join("") : "요일 미설정";
}

const styles = StyleSheet.create({
  outerCard: {
    backgroundColor: "#fff",
    borderRadius: radiusCard,
    padding: 14,
    overflow: "visible",
    marginTop: 8,
    ...shadowCard,
  },
  favHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  alarmCard: {
    backgroundColor: "#fff",
    borderRadius: radiusCard,
    padding: 14,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    ...shadowCard,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
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
  dirInline: {
    fontSize: 13,
    color: "rgba(0,0,0,0.6)",
    marginLeft: 8,
    flexShrink: 1,
  },
  metaRow: { flexDirection: "row", alignItems: "center" },
  metaText: { fontSize: 12.5, color: "rgba(0,0,0,0.6)" },
  metaDivider: { fontSize: 12.5, color: "rgba(0,0,0,0.35)", marginHorizontal: 6 },
});