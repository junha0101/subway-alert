// /subway-alert/utils/api/seoul.ts
// 서울시 실시간 지하철 도착 정보 API 래퍼
// DOC: http://swopenapi.seoul.go.kr/api/subway/{KEY}/json/realtimeStationArrival/0/40/{STATION}

import Constants from "expo-constants";
import { isTrainTowardsNeighbor } from "../stations";

export type RawArrival = {
  subwayId?: string;
  updnLine?: string;     // "상행" | "하행" | "내선" | "외선"
  trainLineNm?: string;  // "정부과천청사행" 등
  bstatnNm?: string;     // 종착역
  arvlMsg2?: string;     // "2분 후(서초 진입)" 같은 요약
  arvlMsg3?: string;     // "서초 진입" 등 현재 상태
  recptnDt?: string;     // 수신 시각
};

export type SimpleArrival = {
  updnLine?: string;
  trainLineNm?: string;
  bstatnNm?: string;
  arvlMsg2?: string;
  arvlMsg3?: string;
  recptnDt?: string;
  /** 파싱된 정거장 수(없으면 null) */
  stationsAway: number | null;
};

/** "n정거장 전 / n번째 전" 같은 문구에서 정거장 수 뽑기(없으면 null) */
export function parseStationsAway(msg?: string | null): number | null {
  if (!msg) return null;
  const m1 = msg.match(/(\d+)\s*정거장\s*전/);
  if (m1) return Number(m1[1]);
  const m2 = msg.match(/(\d+)\s*번째\s*전/);
  if (m2) return Number(m2[1]);
  return null;
}

/**
 * 실시간 도착 조회
 * - EXPO_PUBLIC_SEOUL_API_KEY 없으면 경고만 남기고 [] 반환(런타임 크래시 방지)
 * - swopenapi는 http 스킴 → 실제 서비스에선 프록시/https 권장
 */
export async function fetchRealtimeArrivals(stationApiName: string): Promise<SimpleArrival[]> {
  // 키 가져오기: app.json > extra 우선, 없으면 process.env fallback
  const key: string | undefined =
    (Constants.expoConfig?.extra as any)?.EXPO_PUBLIC_SEOUL_API_KEY ||
    process.env.EXPO_PUBLIC_SEOUL_API_KEY;

  if (!key) {
    console.warn("[seoul] EXPO_PUBLIC_SEOUL_API_KEY is missing. Returning empty list.");
    return [];
  }

  const url = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/40/${encodeURIComponent(
    stationApiName
  )}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      console.warn(`[seoul] HTTP ${res.status}: ${text}`);
      return [];
    }
    const json = await res.json();
    const list: RawArrival[] = json?.realtimeArrivalList ?? [];
    return list.map((r) => ({
      updnLine: r.updnLine,
      trainLineNm: r.trainLineNm,
      bstatnNm: r.bstatnNm,
      arvlMsg2: r.arvlMsg2,
      arvlMsg3: r.arvlMsg3,
      recptnDt: r.recptnDt,
      stationsAway: parseStationsAway(r.arvlMsg2),
    }));
  } catch (e) {
    console.warn("[seoul] fetch error:", e);
    return [];
  }
}

/**
 * 방면 기준으로 상위 2개만 추출
 * - stations/index.ts 의 시그니처에 맞춰 변환
 * - 필터 결과가 없으면 정거장 수 기준 오름차순 상위 2개 fallback
 */
export function pickTwoArrivalsForDirection(
  list: SimpleArrival[],
  opts: { neighborApiName: string; dirKey: "up" | "down" }
): SimpleArrival[] {
  const filtered = list.filter((item) =>
    isTrainTowardsNeighbor({
      apiNeighborName: opts.neighborApiName,
      upOrDown: opts.dirKey,
      updnLineText: item.updnLine,
      trainLineNm: item.trainLineNm,
      bstatnNm: item.bstatnNm,
    })
  );

  const base = (filtered.length > 0 ? filtered : list).slice();
  base.sort((a, b) => (a.stationsAway ?? 99) - (b.stationsAway ?? 99));
  return base.slice(0, 2);
}
