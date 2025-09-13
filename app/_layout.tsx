// app/_layout.tsx
import "../background/geofencing";
import "react-native-gesture-handler";
import "react-native-reanimated";
import React, { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { initNotifications } from "../utils/notify";
import { useAppStateRefresh } from "../hooks/useAppStateRefresh";
import PermissionDisclosure from "../components/PermissionDisclosure";
import { useSystem } from "../store/useSystem";

export default function RootLayout() {
  // ✅ 앱 상태 복귀 시 권한/지오펜스 재검사
  useAppStateRefresh();

  const { onboarded, refreshSystemStatus } = useSystem();
  const [showDisclosure, setShowDisclosure] = useState(false);

  useEffect(() => {
    initNotifications(); // 앱 시작 시 1회
    // 첫 진입 시 시스템 상태(온보딩 여부 포함) 동기화
    refreshSystemStatus();
  }, []);

  // 온보딩 여부에 따라 Disclosure 표시
  useEffect(() => {
    setShowDisclosure(!onboarded);
  }, [onboarded]);

  const handleCloseDisclosure = async () => {
    setShowDisclosure(false);
    // PermissionDisclosure 내부에서도 refresh를 호출하지만,
    // 안전하게 한 번 더 동기화해 상태 카드/버튼을 즉시 반영
    await refreshSystemStatus();
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }} />
      {/* ✅ 첫 실행 온보딩(사전 고지 + 권한 요청 플로우) */}
      <PermissionDisclosure visible={showDisclosure} onClose={handleCloseDisclosure} />
    </GestureHandlerRootView>
  );
}
