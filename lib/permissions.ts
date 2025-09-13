// lib/permissions.ts
import * as Location from "expo-location";
import { Linking, Platform } from "react-native";
import { PermissionResponse } from "expo-location";

type IOSLevel = "unknown" | "denied" | "whenInUse" | "always";
type AndroidPerm = { fg: boolean; bg: boolean; dontAskAgain: boolean };

export type PermissionSnapshot = {
  iosLevel: IOSLevel;
  precise: boolean;
  android: AndroidPerm;
};

// ── 체크 로직 ──────────────────────────────────────────────
export async function checkLocationStatus(): Promise<PermissionSnapshot> {
  const fg = await Location.getForegroundPermissionsAsync();
  const bg = await Location.getBackgroundPermissionsAsync();

  const precise = Platform.OS === "ios" ? !!(fg as any)?.accuracy === Location.Accuracy.High : true;

  if (Platform.OS === "ios") {
    let iosLevel: IOSLevel = "unknown";
    if (fg.status === "denied") iosLevel = "denied";
    else if (bg.status === "granted") iosLevel = "always";
    else if (fg.status === "granted") iosLevel = "whenInUse";
    return {
      iosLevel,
      precise, // best-effort (iOS는 설정 앱에서 '정확한 위치' 토글)
      android: { fg: false, bg: false, dontAskAgain: false },
    };
  } else {
    const android: AndroidPerm = {
      fg: fg.status === "granted",
      bg: bg.status === "granted",
      dontAskAgain: fg.canAskAgain === false || bg.canAskAgain === false,
    };
    return { iosLevel: "unknown", precise: true, android };
  }
}

// ── 요청 로직 ──────────────────────────────────────────────
export async function requestWhenInUse(): Promise<PermissionResponse> {
  return Location.requestForegroundPermissionsAsync();
}

export async function requestAlwaysIOS(): Promise<PermissionResponse | null> {
  if (Platform.OS !== "ios") return null;
  // iOS는 WhenInUse 부여 이후에 Background 요청해야 Always 수준으로 승격됨
  return Location.requestBackgroundPermissionsAsync();
}

export async function requestBackgroundAndroid(): Promise<PermissionResponse | null> {
  if (Platform.OS !== "android") return null;
  // Android 10+에서 별도로 요청
  return Location.requestBackgroundPermissionsAsync();
}

// ── 설정/배터리 최적화 ────────────────────────────────────
export async function openAppSettings() {
  // iOS/Android 공통
  try {
    await Linking.openSettings();
  } catch {
    // Fallback (거의 필요 없음)
    if (Platform.OS === "android") {
      await Linking.openURL("package:"); // 일부 기기에서 동작하지 않을 수 있음
    }
  }
}

// 배터리 최적화 상태를 OS에서 직접 읽는 표준 API는 없음.
// 대부분은 “예외 설정 페이지 열기”로 유도. (Managed 워크플로우 한계 고려)
export async function openBatteryOptimizationSettings() {
  if (Platform.OS !== "android") return;
  // 가장 호환성이 높은 일반 설정으로 유도
  // 제조사마다 다르므로 ‘전원/배터리 → 배터리 최적화’ 안내 텍스트를 함께 제공하세요.
  try {
    await Linking.openURL("android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS");
  } catch {
    try {
      await Linking.openURL("android.settings.BATTERY_SAVER_SETTINGS");
    } catch {
      await Linking.openSettings();
    }
  }
}

// ── 보조 상태 ────────────────────────────────────────────
export async function isGpsEnabled(): Promise<boolean> {
  const enabled = await Location.hasServicesEnabledAsync();
  return !!enabled;
}

export async function isBatteryOptimized(): Promise<boolean> {
  // 표준 API로는 직접 감지가 어려움 → 보수적으로 false 반환
  // 제조사별 SDK가 필요하지만, 심사/UX 관점에선 '예외 설정 가이드'가 핵심
  return false;
}
