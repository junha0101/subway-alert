// /subway-alert/hooks/useAppStateRefresh.ts
import { useEffect, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import { useSystem } from "../store/useSystem";
import { useAlarms } from "../store/useAlarms";
import { refreshGeofencing } from "../background/geofencing";

function canUseBackgroundGeofencing() {
  const s = useSystem.getState();
  if (!s.gpsOn) return false;

  // iOS: Always 필요
  // Android: FG+BG 필요 (배터리 최적화는 권장 조건이지만 필수는 아님)
  if (Platform.OS === "ios") {
    return s.permission.iosLevel === "always";
  } else {
    return !!(s.permission.android.fg && s.permission.android.bg);
  }
}

export function useAppStateRefresh() {
  const { refreshSystemStatus } = useSystem();
  const { alarms } = useAlarms();

  // 활성 알람 수 (Home에서 노출되는 enabled=true)
  const activeCount = alarms.filter(a => a.enabled).length;

  // 짧은 재호출 쏠림 방지 (1.5초)
  const lastRunRef = useRef(0);

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state: AppStateStatus) => {
      if (state !== "active") return;

      const now = Date.now();
      if (now - lastRunRef.current < 1500) return; // throttle
      lastRunRef.current = now;

      try {
        // 1) 권한/시스템 상태 갱신
        await refreshSystemStatus();

        // 2) 필요 조건이면 지오펜싱 재등록
        if (canUseBackgroundGeofencing() && activeCount > 0) {
          await refreshGeofencing();
        }
      } catch {
        // no-op: 상세 로그는 background/store 쪽에서 처리
      }
    });

    return () => {
      sub.remove();
    };
  }, [refreshSystemStatus, activeCount]);
}
