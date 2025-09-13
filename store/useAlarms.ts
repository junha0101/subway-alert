// /subway-alert/store/useAlarms.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { refreshGeofencing } from "../background/geofencing"; // ✅ 알람 변경 → 지오펜스 재등록

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
  /**
   * 좌표는 다양한 형태로 들어올 수 있으므로 넓게 허용한다.
   * - location: { lat, lng }  ← 기존 프로젝트에서 쓰던 형태
   * - latitude/longitude 또는 lat/lng (개별 필드)
   * - coords/region: { latitude, longitude } (여타 컴포넌트/라이브러리 호환)
   */
  location?: { lat: number; lng: number }; // 지오펜스 중심 좌표
  latitude?: number;
  longitude?: number;
  lat?: number;
  lng?: number;
  coords?: { latitude: number; longitude: number };
  region?: { latitude: number; longitude: number };

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

// ✅ 지오펜스 재등록 디바운스 (RN에선 number 반환)
let _geofenceTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleGeofenceRefresh(delay = 300) {
  if (_geofenceTimer) clearTimeout(_geofenceTimer);
  _geofenceTimer = setTimeout(() => {
    try {
      refreshGeofencing();
    } catch (e) {
      // no-op (로그는 background/geofencing.ts에서 관리)
    }
  }, delay);
}

// 좌표 정규화 유틸: 들어온 Alarm 파라미터에서 lat/lng를 최대한 추출해 일관 저장
function normalizeCoords(a: Partial<Alarm>) {
  // 추출
  const lat =
    a.latitude ??
    a.lat ??
    a.coords?.latitude ??
    a.region?.latitude ??
    a.location?.lat;

  const lng =
    a.longitude ??
    a.lng ??
    a.coords?.longitude ??
    a.region?.longitude ??
    a.location?.lng;

  // 숫자인지 검증
  const validLat = typeof lat === "number" && !Number.isNaN(lat);
  const validLng = typeof lng === "number" && !Number.isNaN(lng);

  if (!validLat || !validLng) {
    return {
      // 좌표가 없다면 그대로 둔다(지오펜싱 등록 시 필터링/예외 처리)
      location: a.location,
      latitude: a.latitude,
      longitude: a.longitude,
      lat: a.lat,
      lng: a.lng,
      coords: a.coords,
      region: a.region,
    };
  }

  // 일관 저장(모든 형태를 채워, 어느 소비자에서도 접근 가능)
  return {
    location: { lat: lat as number, lng: lng as number },
    latitude: lat as number,
    longitude: lng as number,
    lat: lat as number,
    lng: lng as number,
    coords: { latitude: lat as number, longitude: lng as number },
    region: { latitude: lat as number, longitude: lng as number },
  };
}

export const useAlarms = create<State>()(
  persist(
    (set, get) => ({
      // 알람
      alarms: seed,
      customPhrases: ["빨리 달리세요!", "지금 뛰면 안놓친다", "지금 놓치면 너 지각 확정"],

      addAlarm(a) {
        const id = `a${Date.now()}`;
        const coords = normalizeCoords(a);

        set({
          alarms: [
            {
              ...a,
              ...coords,                    // ✅ 좌표를 일관된 모든 형태로 채워 저장
              id,
              radiusM: 100,
              createdAt: Date.now(),
            } as Alarm,
            ...get().alarms,
          ],
        });

        // ✅ 알람 배열 변경 → 지오펜스 재등록(디바운스)
        scheduleGeofenceRefresh();
      },

      toggleAlarm(id) {
        set({
          alarms: get().alarms.map(x =>
            x.id === id ? { ...x, enabled: !x.enabled } : x
          ),
        });

        // ✅ 알람 배열 변경 → 지오펜스 재등록(디바운스)
        scheduleGeofenceRefresh();
      },

      removeAlarm(id) {
        set({ alarms: get().alarms.filter(x => x.id !== id) });

        // ✅ 알람 배열 변경 → 지오펜스 재등록(디바운스)
        scheduleGeofenceRefresh();
      },

      removeMany(ids) {
        const setIds = new Set(ids);
        set({ alarms: get().alarms.filter(x => !setIds.has(x.id)) });

        // ✅ 알람 배열 변경 → 지오펜스 재등록(디바운스)
        scheduleGeofenceRefresh();
      },

      // ✅ 지오펜싱 쿨다운 타임스탬프 갱신 (알람 배열 구조는 유지 → 재등록 불필요)
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
          // radiusM 보정 + 좌표 재정규화(구버전 데이터 정리)
          state.alarms = state.alarms.map((a: Alarm) => {
            const radius =
              !a.radiusM || Number.isNaN(a.radiusM as unknown as number) ? 100 : a.radiusM;

            const fixed = {
              ...a,
              radiusM: radius,
              createdAt: a.createdAt ?? Date.now(),
              ...normalizeCoords(a),
            } as Alarm;

            return fixed;
          });

          // ✅ 즐겨찾기 필드가 없던 사용자의 경우 초기화
          if (!Array.isArray((state as any).favorites)) (state as any).favorites = [];

          // ✅ 스토어 복구 직후에도 지오펜스 상태 최신화
          scheduleGeofenceRefresh(100);
        }
      },
    }
  )
);
