// /subway-alert/background/geofencing.ts
import * as TaskManager from "expo-task-manager";
import { useAlarms } from "../store/useAlarms";
import { isActiveNow, shouldThrottle } from "../utils/schedule";
import { fetchRealtimeArrivals, pickTwoArrivalsForDirection } from "../utils/api/seoul";
import { sendArrivalNotification } from "../utils/notify";

const TASK = "GEOFENCE_TASK";

// Expo Location의 이벤트 타입 값과 동일하게 맞춰둠 (의존성 최소화)
const EVENT_ENTER = 1; // Location.GeofencingEventType.Enter
const EVENT_EXIT = 2;  // Location.GeofencingEventType.Exit

/**
 * 앱 어디서든 이 파일이 import 되면 태스크가 정의된다.
 * 실제 start/stopGeofencingAsync는 utils/geofence.ts에서 수행한다.
 */
try {
  TaskManager.defineTask(TASK, async ({ data, error }) => {
    if (error || !data) {
      if (error) console.log("[GEOFENCE_TASK] error:", error);
      return;
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
    }
  });
} catch (e) {
  // 개발 중 Fast Refresh 등으로 defineTask가 중복될 수 있으니 무시
  // console.log("[GEOFENCE_TASK] defineTask duplicate:", e);
}
