// /subway-alert/background/geofencing.ts
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import { useAlarms } from "../store/useAlarms";
import { useSystem } from "../store/useSystem";
import { isActiveNow, shouldThrottle } from "../utils/schedule";
import { fetchRealtimeArrivals, pickTwoArrivalsForDirection } from "../utils/api/seoul";
import { sendArrivalNotification } from "../utils/notify";

const TASK = "GEOFENCE_TASK"; // 기존 이름 유지 (다른 곳에서 참조할 수 있으므로)
export const GEOFENCE_TASK = TASK; // 외부에서도 동일 상수로 참조 가능하도록 export

// Expo Location의 이벤트 타입 값과 동일하게 맞춰둠 (의존성 최소화)
const EVENT_ENTER = 1; // Location.GeofencingEventType.Enter
const EVENT_EXIT = 2;  // Location.GeofencingEventType.Exit

/**
 * 앱 어디서든 이 파일이 import 되면 태스크가 정의된다.
 * 기존 주석: 실제 start/stopGeofencingAsync는 utils/geofence.ts에서 수행한다.
 * ▶︎ 변경점: 아래 refreshGeofencing()을 추가해, 이 파일에서도 재등록을 수행할 수 있게 했다.
 */
try {
  TaskManager.defineTask(TASK, async ({ data, error }) => {
    const { pushLog } = useSystem.getState();

    if (error || !data) {
      if (error) {
        console.log("[GEOFENCE_TASK] error:", error);
        pushLog?.(`태스크 에러: ${String(error)}`);
      }
      return;
    }

    // 이벤트 수신 로그 (심사/디버깅용)
    try {
      const { region, eventType } = data as any;
      const idf = String(region?.identifier ?? "");
      const kind = eventType === EVENT_ENTER ? "ENTER" : eventType === EVENT_EXIT ? "EXIT" : "UNKNOWN";
      pushLog?.(`이벤트 수신: ${idf} (${kind})`);
    } catch {
      // no-op
    }

    const { region, eventType } = data as any;
    const identifier: string = String(region?.identifier ?? "");
    if (!identifier.startsWith("alarm:")) return;

    const id = identifier.replace("alarm:", "");
    const state = useAlarms.getState();
    const alarm = state.alarms.find((a) => a.id === id);

    if (!alarm) {
      console.log("[GEOFENCE_TASK] alarm not found:", id);
      return;
    }
    if (!alarm.enabled) {
      // Home 탭에서는 enabled=true만 노출이므로, 비활성은 무시
      return;
    }

    // ENTER/EXIT 매칭
    const isEnterEvent = eventType === EVENT_ENTER;
    const triggerOk =
      (isEnterEvent && alarm.trigger === "enter") ||
      (!isEnterEvent && alarm.trigger === "exit");
    if (!triggerOk) return;

    // 요일/시간대 통과 여부
    if (!isActiveNow(alarm)) {
      // console.log("[GEOFENCE_TASK] schedule blocked", { id });
      return;
    }

    // 쿨다운(중복 방지)
    const nowMs = Date.now();
    if (shouldThrottle(alarm, nowMs)) {
      // console.log("[GEOFENCE_TASK] throttled", { id });
      return;
    }

    // 필수 필드 점검 (지오펜스 등록 시에도 필터링하지만, 런타임에서도 안전망)
    if (!alarm.stationApiName || !alarm.neighborApiName || !alarm.dirKey) {
      console.log("[GEOFENCE_TASK] missing direction fields:", { id });
      return;
    }

    try {
      // 실시간 도착 목록 조회 후, 방면 일치 상위 2건만 추출
      const list = await fetchRealtimeArrivals(alarm.stationApiName);
      const top2 = pickTwoArrivalsForDirection(list, {
        neighborApiName: alarm.neighborApiName,
        dirKey: alarm.dirKey,
      });

      // SimpleArrival[] -> ArrivalLite[] 로 변환 (null → undefined 치환)
      const arrivalsLite = top2.map((a) => ({
        stationsAway: a.stationsAway ?? undefined,
        message: a.arvlMsg2,
      }));

      // 커스텀 문구(랜덤)
      const phrases = state.customPhrases ?? [
        "빨리 달리세요!", "지금 뛰면 안놓친다", "지금 놓치면 너 지각 확정",
      ];

      // 로컬 알림 발송 (문구/포맷은 notify 유틸에서 처리)
      await sendArrivalNotification({
        alarm: { title: alarm.title },
        arrivals: arrivalsLite,
        phrases,
      });

      // 쿨다운 타임스탬프 갱신 (스토어에 markTriggered가 없으면 무시)
      try {
        state.markTriggered?.(id, nowMs);
      } catch {}
    } catch (e) {
      console.log("[GEOFENCE_TASK] handler error:", e);
      useSystem.getState().pushLog?.(`핸들러 에러: ${String((e as any)?.message ?? e)}`);
    }
  });
} catch (e) {
  // 개발 중 Fast Refresh 등으로 defineTask가 중복될 수 있으니 무시
  // console.log("[GEOFENCE_TASK] defineTask duplicate:", e);
}

/**
 * 활성화된 알람을 지오펜싱 Region 배열로 변환
 * - 알람 구조가 프로젝트마다 다를 수 있으므로, 가능한 필드들을 안전하게 탐색한다.
 * - 필수: id, 좌표(lat/lng), trigger(enter|exit), radiusM(없으면 100m)
 */
function getActiveAlarmsAsGeofences() {
  const { alarms } = useAlarms.getState();
  const regions: Location.LocationRegion[] = [];

  for (const a of alarms) {
    if (!a?.enabled) continue;

    // 다양한 좌표 보관 케이스 대비
    const lat =
      a.latitude ??
      a.lat ??
      a.coords?.latitude ??
      a.location?.latitude ??
      a.region?.latitude;
    const lng =
      a.longitude ??
      a.lng ??
      a.coords?.longitude ??
      a.location?.longitude ??
      a.region?.longitude;

    if (typeof lat !== "number" || typeof lng !== "number") continue;

    const radius =
      typeof a.radiusM === "number" && a.radiusM > 0 ? a.radiusM : 100;

    const notifyOnEnter = a.trigger === "enter";
    const notifyOnExit = a.trigger === "exit";

    regions.push({
      identifier: `alarm:${a.id}`,
      latitude: lat,
      longitude: lng,
      radius,
      notifyOnEnter,
      notifyOnExit,
    } as any);
  }

  return regions;
}

/**
 * 지오펜싱 재등록 + 메타/로그 반영
 * - 기존 등록 제거 → 활성 알람 변환 → 재등록
 * - 성공/실패/미대상 케이스를 useSystem 메타/로그로 남긴다.
 */
export async function refreshGeofencing() {
  const { setGeofenceMeta, pushLog } = useSystem.getState();

  try {
    // 1) 기존 등록 제거
    await Location.stopGeofencingAsync(GEOFENCE_TASK).catch(() => {});

    // 2) 활성 알람 → 지오펜스 엔트리로 변환
    const regions = getActiveAlarmsAsGeofences();

    if (!regions || regions.length === 0) {
      setGeofenceMeta?.({ registeredCount: 0, lastSyncAt: Date.now() });
      pushLog?.("등록할 지오펜스 없음");
      return;
    }

    // 3) 재등록
    await Location.startGeofencingAsync(GEOFENCE_TASK, regions);

    setGeofenceMeta?.({
      registeredCount: regions.length,
      lastSyncAt: Date.now(),
    });
    pushLog?.(`지오펜스 등록 완료 (${regions.length}개)`);
  } catch (e: any) {
    pushLog?.(`지오펜스 등록 실패: ${String(e?.message ?? e)}`);
    // 실패 시에도 타임스탬프를 남겨 최근 시도 기록이 보이게 함
    setGeofenceMeta?.({ lastSyncAt: Date.now() });
    throw e;
  }
}
