// /subway-alert/store/useAlarms.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** 상/하행 키 */
export type DirKey = "up" | "down";

export type Alarm = {
  id: string;
  title: string;              // "강남역 2호선 (역삼 방면)"
  radiusM: number;            // 기본 100
  days: number[];             // 0~6 (일~토)
  startTime: string;          // "07:00"
  endTime: string;            // "09:30"
  enabled: boolean;           // ON/OFF

  // ✅ 지오펜싱/방면/스케줄 확장 필드
  location?: { lat: number; lng: number }; // 지오펜스 중심 좌표
  trigger?: "enter" | "exit";              // 진입/이탈
  stationApiName?: string;                 // 실시간 API용 역명
  dirKey?: DirKey;                         // "up" | "down"
  neighborApiName?: string;                // 방면 매칭용
  createdAt: number;                       // 생성 시각(ms)
  lastTriggeredAt?: number;                // 최근 발화시각(ms) — 쿨다운
};

export type Favorite = {
  key: string;                // stationId|line|direction
  stationId: string;
  stationName: string;        // "인덕원역"
  line: string;               // "4호선"
  direction: string;          // "정부과천청사 방면"
};

// 데모용 시드 데이터(필수 확장 필드는 비워둠: 등록 단계에서 필터됨)
const seed: Alarm[] = [
  { id: "a1", title: "강남역 2호선 (역삼 방면)", radiusM: 100, days: [1,2,3,4,5], startTime: "07:00", endTime: "09:30", enabled: true, createdAt: Date.now() },
  { id: "a2", title: "인덕원역 4호선 (정부과천청사 방면)", radiusM: 100, days: [0,6],   startTime: "13:00", endTime: "14:30", enabled: true, createdAt: Date.now() }
];

type State = {
  // 알람
  alarms: Alarm[];
  customPhrases: string[];
  // ✅ addAlarm은 새 확장 필드까지 포함해 저장
  addAlarm: (a: Omit<Alarm, "id" | "radiusM" | "createdAt">) => void;
  toggleAlarm: (id: string) => void;
  removeAlarm: (id: string) => void;
  removeMany?: (ids: string[]) => void;
  // ✅ 쿨다운 타임스탬프 갱신
  markTriggered: (id: string, ts: number) => void;

  // ✅ 즐겨찾기
  favorites: Favorite[];
  addFavorite: (f: Favorite) => void;
  removeFavorite: (key: string) => void;
  existsFavorite: (key: string) => boolean;
};

export const useAlarms = create<State>()(
  persist(
    (set, get) => ({
      // 알람
      alarms: seed,
      customPhrases: ["빨리 달리세요!", "지금 뛰면 안놓친다", "지금 놓치면 너 지각 확정"],

      addAlarm(a) {
        const id = `a${Date.now()}`;
        set({
          alarms: [
            {
              ...a,
              id,
              radiusM: 100,
              createdAt: Date.now(),
            },
            ...get().alarms,
          ],
        });
      },

      toggleAlarm(id) {
        set({
          alarms: get().alarms.map(x =>
            x.id === id ? { ...x, enabled: !x.enabled } : x
          ),
        });
      },

      removeAlarm(id) {
        set({ alarms: get().alarms.filter(x => x.id !== id) });
      },

      removeMany(ids) {
        const setIds = new Set(ids);
        set({ alarms: get().alarms.filter(x => !setIds.has(x.id)) });
      },

      // ✅ 지오펜싱 쿨다운 타임스탬프 갱신
      markTriggered(id, ts) {
        set({
          alarms: get().alarms.map(a =>
            a.id === id ? { ...a, lastTriggeredAt: ts } : a
          ),
        });
      },

      // ✅ 즐겨찾기
      favorites: [],
      addFavorite(f) {
        if (get().favorites.some(x => x.key === f.key)) return; // 중복 방지
        set({ favorites: [f, ...get().favorites] });
      },
      removeFavorite(key) {
        set({ favorites: get().favorites.filter(x => x.key !== key) });
      },
      existsFavorite(key) {
        return get().favorites.some(x => x.key === key);
      },
    }),
    {
      name: "subway-alert-store",
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // radiusM 보정
          state.alarms = state.alarms.map((a: Alarm) => ({
            ...a,
            radiusM: !a.radiusM || isNaN(a.radiusM as unknown as number) ? 100 : a.radiusM,
            createdAt: a.createdAt ?? Date.now(),
          }));
          // ✅ 즐겨찾기 필드가 없던 사용자의 경우 초기화
          if (!Array.isArray((state as any).favorites)) (state as any).favorites = [];
        }
      },
    }
  )
);
