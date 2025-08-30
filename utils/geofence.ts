// /subway-alert/utils/geofence.ts
import * as Location from "expo-location";
import type { Alarm } from "../store/useAlarms";

const TASK = "GEOFENCE_TASK";

/**
 * 알람 배열 → 지오펜스 Region 배열 변환
 * - enabled = true
 * - 필수 필드(location, stationApiName, neighborApiName, dirKey, trigger) 존재
 */
export function regionsFromAlarms(alarms: Alarm[]): Location.LocationRegion[] {
  return alarms
    .filter((a) =>
      a &&
      a.enabled &&
      !!a.location &&
      !!a.stationApiName &&
      !!a.neighborApiName &&
      !!a.dirKey &&
      !!a.trigger
    )
    .map((a) => ({
      identifier: `alarm:${a.id}`,
      latitude: a.location!.lat,
      longitude: a.location!.lng,
      radius: a.radiusM ?? 100, // 기본 반경 100m
      notifyOnEnter: a.trigger === "enter",
      notifyOnExit: a.trigger === "exit",
    }));
}

/**
 * 지오펜스 전체 재등록(초기 1회 + 알람 변경 시)
 * - 기존 등록을 중지 후, 현재 알람 기준으로 재등록
 */
export async function syncGeofencesFromAlarms(alarms: Alarm[]) {
  try {
    await Location.stopGeofencingAsync(TASK);
  } catch {
    // 켜져 있지 않았을 수 있음 → 무시
  }

  const regions = regionsFromAlarms(alarms);

  if (regions.length > 0) {
    await Location.startGeofencingAsync(TASK, regions);
    console.log("[geofence] registered regions:", regions.length);
  } else {
    console.log("[geofence] no eligible regions");
  }
}
