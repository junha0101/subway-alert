// /utils/schedule.ts
export const COOLDOWN_MS = 5 * 60 * 1000; // 5분

export function isActiveNow(
  alarm: {
    days?: number[];
    startTime?: string; // "HH:mm"
    endTime?: string;   // "HH:mm"
  },
  now = new Date()
) {
  const dayOk = !alarm.days || alarm.days.includes(now.getDay());
  const t = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")}`;
  const timeOk =
    !alarm.startTime ||
    !alarm.endTime ||
    (alarm.startTime <= t && t <= alarm.endTime);
  return dayOk && timeOk;
}

export function shouldThrottle(
  alarm: { lastTriggeredAt?: number },
  nowMs: number
) {
  return !!alarm.lastTriggeredAt && nowMs - alarm.lastTriggeredAt < COOLDOWN_MS;
}
