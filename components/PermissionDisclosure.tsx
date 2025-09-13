// /subway-alert/components/PermissionDisclosure.tsx
import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  StyleSheet,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Asset } from "expo-asset"; // ✅ 이미지 사전 로드용
import COLORS from "../lib/colors";
import {
  requestWhenInUse,
  requestAlwaysIOS,
  requestBackgroundAndroid,
} from "../lib/permissions";
import { useSystem } from "../store/useSystem";

type Props = { visible: boolean; onClose: () => void };

const RAW_PAGES = [
  {
    title: "행뚜는 위치권한이 필요해요!",
    body:
      "•설정한 위치에 맞는 알림을 보내기 위해 위치 권한이 필요해요.\n" +
      "•앱은 알림 목적에만 사용하고, 다른 용도로 위치를 사용하지 않아요.",
    image: require("../assets/onboarding/location.png"),
  },
  {
    title: "앱을 실행하지 않아도 알림 받으려면?",
    body:
      "•백그라운드에서도 알림을 받으려면 ‘항상 허용’ 권한이 필요해요.\n" +
      (Platform.OS === "ios"
        ? "•아이폰은 먼저 ‘사용 중에만 허용’을 요청한 뒤, 한 번 더 ‘항상 허용’을 요청해요."
        : "•안드로이드는 포그라운드 권한에 더해 ‘백그라운드 권한’을 별도로 한 번 더 요청해요."),
    image: require("../assets/onboarding/notification.png"),
  },
  {
    title: "개인정보 걱정? 안심하세요!",
    body:
      "•위치 정보는 기기에서 알림을 보내는 데에만 쓰이며 외부로 전송하지 않아요.\n" +
      "•일부 기기에서 배터리 최적화가 켜져 있으면 알림이 지연될 수 있어요.",
    image: require("../assets/onboarding/protection.png"),
  },
];

// 🔧 글머리표 → 행걸이 들여쓰기
function Bulleted({ text }: { text: string }) {
  const lines = text.split("\n").filter(Boolean);
  return (
    <View>
      {lines.map((ln, i) => {
        const hasDot = ln.trim().startsWith("•");
        const content = hasDot ? ln.trim().slice(1) : ln;
        return (
          <View
            key={`${i}-${content.slice(0, 6)}`}
            style={{
              flexDirection: "row",
              alignItems: "flex-start",
              marginTop: i === 0 ? 0 : 8,
            }}
          >
            <Text style={{ width: 16, textAlign: "center", color: "#6B7280", fontSize: 14 }}>
              {hasDot ? "•" : " "}
            </Text>
            <Text style={{ flex: 1, color: "#374151", fontSize: 14, lineHeight: 20 }}>
              {content}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

export default function PermissionDisclosure({ visible, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const { refreshSystemStatus } = useSystem();

  const PAGES = RAW_PAGES;
  const page = useMemo(() => PAGES[idx], [idx]);
  const isFirst = idx === 0;
  const isLast = idx === PAGES.length - 1;

  // ✅ 첫 실행일 때만 온보딩 이미지 사전 로딩
  useEffect(() => {
    const preload = async () => {
      const onboarded = await AsyncStorage.getItem("onboarded_v2");
      if (!onboarded) {
        try {
          await Asset.loadAsync([
            require("../assets/onboarding/location.png"),
            require("../assets/onboarding/notification.png"),
            require("../assets/onboarding/protection.png"),
          ]);
          console.log("✅ Onboarding images preloaded");
        } catch (e) {
          console.warn("⚠️ Failed to preload onboarding images", e);
        }
      }
    };
    preload();
  }, []);

  const onPrev = () => !isFirst && setIdx((v) => v - 1);
  const onNext = () => (isLast ? onContinue() : setIdx((v) => v + 1));

  const onSkip = async () => {
    await AsyncStorage.setItem("onboarded_v2", "true");
    await refreshSystemStatus();
    onClose();
  };

  const onContinue = async () => {
    await requestWhenInUse();
    if (Platform.OS === "ios") await requestAlwaysIOS();
    else await requestBackgroundAndroid();
    await AsyncStorage.setItem("onboarded_v2", "true");
    await refreshSystemStatus();
    onClose();
  };

  const { width: W } = Dimensions.get("window");
  const CARD_W = Math.round(W * 0.86);

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.card, { width: CARD_W }]}>
          {/* 제목 */}
          <Text style={styles.title}>{page.title}</Text>

          {/* 이미지 */}
          <View style={styles.mediaWrap}>
            <View style={styles.mediaBox}>
              <Image
                key={`onb-img-${idx}`} // ✅ 페이지 바뀔 때 강제 리렌더
                source={page.image}
                style={styles.mediaImage}
                resizeMode="contain"
                fadeDuration={0}       // ✅ 안드로이드 페이드 제거
              />
            </View>
          </View>

          {/* 본문 */}
          <View style={styles.body}>
            <Bulleted text={page.body} />
          </View>

          {/* 진행점 */}
          <View style={styles.progressWrap}>
            <View style={styles.progress}>
              {PAGES.map((_, i) => (
                <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
              ))}
            </View>
          </View>

          {/* 버튼 */}
          <View style={styles.row}>
            <Pressable style={[styles.btn, styles.btnGhost]} onPress={isFirst ? onSkip : onPrev}>
              <Text style={[styles.btnText, { color: "#111827" }]}>{isFirst ? "나중에" : "이전"}</Text>
            </Pressable>
            <Pressable style={[styles.btn, styles.btnPrimary]} onPress={onNext}>
              <Text style={[styles.btnText, { color: "#fff" }]}>{isLast ? "계속" : "다음"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 22,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS?.primary ?? "#5A4DFF",
    marginBottom: 18,
  },
  mediaWrap: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  mediaBox: {
    width: "100%",
    aspectRatio: 1.25,
    borderRadius: 16,
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  mediaImage: {
    width: "55%",   // ✅ 이미지 크기를 줄임
    height: "55%",
  },
  body: {
    marginBottom: 20,
  },
  progressWrap: {
    alignItems: "center",
    marginBottom: 16,
  },
  progress: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 8, backgroundColor: "#E5E7EB" },
  dotActive: { backgroundColor: COLORS?.primary ?? "#5A4DFF" },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  btn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhost: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  btnPrimary: { backgroundColor: COLORS?.primary ?? "#5A4DFF" },
  btnText: { fontSize: 16, fontWeight: "700" },
});