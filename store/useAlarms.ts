// /subway-alert/store/useAlarms.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Alarm = {
  id: string;
  title: string;              // "강남역 2호선 (역삼 방면)"
  radiusM: number;            // 항상 100 (고정)
  days: number[];             // 0~6 (일~토)
  startTime: string;          // "07:00"
  endTime: string;            // "09:30"
  enabled: boolean;           // ON/OFF
};

// 데모용 시드 데이터
const seed: Alarm[] = [
  { id: "a1", title: "강남역 2호선 (역삼 방면)", radiusM: 100, days: [1,2,3,4,5], startTime: "07:00", endTime: "09:30", enabled: true },
  { id: "a2", title: "인덕원역 4호선 (정부과천청사 방면)", radiusM: 100, days: [0,6], startTime: "13:00", endTime: "14:30", enabled: true }
];

type State = {
  alarms: Alarm[];
  customPhrases: string[];
  addAlarm: (a: Omit<Alarm, "id" | "radiusM">) => void;
  toggleAlarm: (id: string) => void;
  removeAlarm: (id: string) => void;          // ✅ 추가
  removeMany?: (ids: string[]) => void;       // ✅ 선택(편의)
};

export const useAlarms = create<State>()(
  persist(
    (set, get) => ({
      alarms: seed,
      customPhrases: ["빨리 달리세요!", "지금 뛰면 안놓친다", "지금 놓치면 너 지각 확정"],

      addAlarm(a) {
        const id = `a${Date.now()}`;
        set({ alarms: [{ ...a, id, radiusM: 100 }, ...get().alarms] });
      },

      toggleAlarm(id) {
        set({
          alarms: get().alarms.map(x =>
            x.id === id ? { ...x, enabled: !x.enabled } : x
          ),
        });
      },

      // ✅ 단일 삭제
      removeAlarm(id) {
        // (훗날 지오펜스/알림 스케줄러 연동 시)
        // unregisterGeofenceForAlarm(id);
        // cancelScheduledNotificationsForAlarm(id);
        set({ alarms: get().alarms.filter(x => x.id !== id) });
        // persist 미들웨어가 set 직후 AsyncStorage에 반영
      },

      // ✅ 다중 삭제(선택)
      removeMany(ids) {
        const setIds = new Set(ids);
        // ids.forEach(id => { unregisterGeofenceForAlarm(id); cancelScheduledNotificationsForAlarm(id); });
        set({ alarms: get().alarms.filter(x => !setIds.has(x.id)) });
      },
    }),
    {
      name: "subway-alert-store",
      storage: createJSONStorage(() => AsyncStorage),
      // 기존 데이터 복원 시 radiusM 없거나 0/NaN → 100으로 치환
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.alarms = state.alarms.map((a) => ({
            ...a,
            radiusM: !a.radiusM || isNaN(a.radiusM) ? 100 : a.radiusM,
          }));
        }
      },
    }
  )
);
