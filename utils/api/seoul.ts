// /subway-alert/utils/api/seoul.ts
// 서울시 실시간 지하철 도착 정보 API 래퍼
// DOC: http://swopenapi.seoul.go.kr/api/subway/{KEY}/json/realtimeStationArrival/0/40/{STATION}

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
};

export async function fetchRealtimeArrivals(stationApiName: string): Promise<SimpleArrival[]> {
  const key = process.env.EXPO_PUBLIC_SEOUL_API_KEY;
  if (!key) throw new Error("EXPO_PUBLIC_SEOUL_API_KEY 가 설정되지 않았습니다.");

  // ⚠️ swopenapi는 http 스킴. 배포 시엔 프록시/백엔드 권장.
  const url = `http://swopenapi.seoul.go.kr/api/subway/${key}/json/realtimeStationArrival/0/40/${encodeURIComponent(
    stationApiName
  )}`;

  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Seoul API HTTP ${res.status}: ${text}`);
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
  }));
}

// "n정거장 전 / n번째 전" 같은 문구에서 정거장 수 뽑기(없으면 null)
export function parseStationsAway(msg?: string | null): number | null {
  if (!msg) return null;
  const m1 = msg.match(/(\d+)\s*정거장\s*전/);
  if (m1) return Number(m1[1]);
  const m2 = msg.match(/(\d+)\s*번째\s*전/);
  if (m2) return Number(m2[1]);
  return null;
}
