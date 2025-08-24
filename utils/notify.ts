// utils/notify.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { pickRandomPhrase } from "./phrases";

// ✅ 앱이 포그라운드일 때도 배너/사운드 나오게 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function initNotifications() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("알림 권한이 거부되었습니다.");
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

export async function sendArrivalNotification(params: {
  station: string;
  line: string;
  direction: string;
  firstStopsAway: number;
  secondStopsAway: number;
  phrases?: string[];
}) {
  const { station, line, direction, firstStopsAway, secondStopsAway, phrases } = params;
  const title = `[알림] ${station} ${line}(${direction})`;
  const bodyLines = [`· ${firstStopsAway} 정류장 전`, `· ${secondStopsAway} 정류장 전`];
  const list = phrases && phrases.length ? phrases : ["빨리 달리세요!","지금 뛰면 안놓친다","지금 놓치면 너 지각 확정"];
  const custom = list[Math.floor(Math.random() * list.length)];
  const body = [ ...bodyLines, custom ].join("\n");

  await Notifications.scheduleNotificationAsync({
    content: { title, body, sound: true, priority: Notifications.AndroidNotificationPriority.MAX },
    trigger: null, // 즉시
  });
}
