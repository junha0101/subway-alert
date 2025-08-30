// /subway-alert/utils/notify.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// ✅ 포그라운드 노출: 최신 타입은 shouldShowBanner / shouldShowList 요구
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    // deprecated인 shouldShowAlert는 타입상 선택이지만, 하위 호환 위해 남겨도 무방
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** 앱 시작 시 1회 호출 권장 */
export async function initNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("[notify] 알림 권한이 거부되었습니다.");
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "기본 알림",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#5A4DFF",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }
}

type ArrivalLite = { message?: string; stationsAway?: number };

export async function sendArrivalNotification({
  alarm,
  arrivals,
  phrases,
}: {
  alarm: { title: string };
  arrivals: ArrivalLite[];
  phrases?: string[];
}) {
  const a1 = arrivals[0];
  const a2 = arrivals[1];

  const line1 = a1 ? `· ${a1.stationsAway ?? "?"} 정류장 전` : "· 도착 정보 없음";
  const line2 = a2 ? `· ${a2.stationsAway ?? "?"} 정류장 전` : "";

  const defaults = ["빨리 달리세요!", "지금 뛰면 안놓친다", "지금 놓치면 너 지각 확정"];
  const list = phrases && phrases.length ? phrases : defaults;
  const tail = list[Math.floor(Math.random() * list.length)];

  const body = `${line1}\n${line2}${line2 ? "\n" : ""}${tail}`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `[알림] ${alarm.title}`,
      body,
      sound: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    },
    trigger: null, // 즉시
  });
}

/** UI에서 필드형으로 바로 쓸 수 있는 호환 함수 */
export async function sendArrivalNotificationWithFields(params: {
  station: string;
  line: string;
  direction: string;
  firstStopsAway: number | string;
  secondStopsAway?: number | string;
  phrases?: string[];
}) {
  const { station, line, direction, firstStopsAway, secondStopsAway, phrases } = params;

  const arrivals: ArrivalLite[] = [{ stationsAway: Number(firstStopsAway) || undefined }];
  if (secondStopsAway !== undefined)
    arrivals.push({ stationsAway: Number(secondStopsAway) || undefined });

  return sendArrivalNotification({
    alarm: { title: `${station} ${line}(${direction})` },
    arrivals,
    phrases,
  });
}
