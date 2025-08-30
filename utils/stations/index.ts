// /subway-alert/utils/stations/index.ts
// 2호선+4호선 역 데이터 접근 유틸 (자동완성/노선/방면)

export type StationRow = {
  displayName: string;         // 앱 표시용 (예: "인덕원역")
  apiName: string;             // API 질의용 (예: "인덕원")
  line: string;                // "2호선" | "4호선"
  neighborsUp: string | null;  // "평촌(4호선)" | null
  neighborsDown: string | null;// "정부과천청사(4호선)" | null
  branchTag: string;           // "main" 등
};

// NOTE: 경로 기준은 현재 파일(/utils/stations/index.ts)
import raw from "../../assets/data/stations_line2_line4.json";

const DATA: StationRow[] = raw as StationRow[];

/** 내부: 괄호 안의 호선 표기 제거 → "평촌", "정부과천청사" */
function stripLineSuffix(nameWithLine?: string | null): string | null {
  if (!nameWithLine) return null;
  const m = nameWithLine.match(/^(.+?)\s*\((.+?)\)$/);
  return m ? m[1] : nameWithLine;
}

/** 내부: 비교용 정규화(공백/괄호/특수문자 제거, 소문자화) */
function normalize(s: string): string {
  return s.replace(/[()\s]/g, "").toLowerCase();
}

/** 전체 데이터 반환 (읽기 전용) */
export function getAllStations(): ReadonlyArray<StationRow> {
  return DATA;
}

/** 특정 역(apiName)으로 라인 목록(중복 제거) 얻기 */
export function getLinesForStation(apiName: string): string[] {
  const key = normalize(apiName);
  const set = new Set<string>();
  for (const row of DATA) {
    if (normalize(row.apiName) === key) set.add(row.line);
  }
  return Array.from(set);
}

/** 자동완성: 역명(표시/api 모두) 부분일치 검색
 *  - query: 최소 1글자
 *  - options.limit 기본 10
 *  - options.line 지정 시 해당 호선만
 */
export function searchStations(
  query: string,
  options?: { limit?: number; line?: string }
): Array<{ displayName: string; apiName: string; line: string }> {
  const q = normalize(query);
  if (!q) return [];

  const limit = options?.limit ?? 10;
  const lineFilter = options?.line ? normalize(options.line) : null;

  const results: Array<{ displayName: string; apiName: string; line: string }> = [];
  for (const row of DATA) {
    if (lineFilter && normalize(row.line) !== lineFilter) continue;
    const cand1 = normalize(row.displayName);
    const cand2 = normalize(row.apiName);
    if (cand1.includes(q) || cand2.includes(q)) {
      results.push({ displayName: row.displayName, apiName: row.apiName, line: row.line });
      if (results.length >= limit) break;
    }
  }
  return results;
}

/** 방면 후보(이웃역) 얻기
 *  - apiName + line 으로 해당 조합의 행을 찾고,
 *  - neighborsUp / neighborsDown 을 "○○ 방면" 레이블로 반환
 */
export function getDirectionsForStationLine(
  apiName: string,
  line: string
): Array<{ key: "up" | "down"; label: string; neighborApiName: string }> {
  const keyStation = normalize(apiName);
  const keyLine = normalize(line);

  const row = DATA.find(
    (r) => normalize(r.apiName) === keyStation && normalize(r.line) === keyLine
  );
  if (!row) return [];

  const upName = stripLineSuffix(row.neighborsUp) ?? undefined;
  const downName = stripLineSuffix(row.neighborsDown) ?? undefined;

  const out: Array<{ key: "up" | "down"; label: string; neighborApiName: string }> = [];
  if (upName) out.push({ key: "up", label: `${upName} 방면`, neighborApiName: upName });
  if (downName) out.push({ key: "down", label: `${downName} 방면`, neighborApiName: downName });
  return out;
}

/** 선택된 방면이 유효한지(해당 역/호선의 이웃과 일치하는지) */
export function validateDirection(
  apiName: string,
  line: string,
  pickedNeighborApiName: string
): boolean {
  const cand = getDirectionsForStationLine(apiName, line);
  const key = normalize(pickedNeighborApiName);
  return cand.some((c) => normalize(c.neighborApiName) === key);
}

/** 서울시 실시간 응답 필터링에 쓸 간단 규칙
 *  - 종착(bstatnNm) 또는 행선(trainLineNm) 문자열 안에 neighbor 이름 포함 여부
 *  - updnLine 텍스트(상/하/내/외)와 사용자가 고른 up/down 키가 대략 일치하는지
 *  ※ 상세 매칭은 실제 API 필드 보고 고도화
 */
export function isTrainTowardsNeighbor(params: {
  apiNeighborName: string;
  upOrDown: "up" | "down";
  updnLineText?: string; // API: "상행" | "하행" | "내선" | "외선" ...
  trainLineNm?: string;  // API: "성수행", "정부과천청사행" 등
  bstatnNm?: string;     // API: 종착역
}): boolean {
  const target = normalize(params.apiNeighborName);
  const inTrainLine = params.trainLineNm ? normalize(params.trainLineNm).includes(target) : false;
  const inDest = params.bstatnNm ? normalize(params.bstatnNm).includes(target) : false;

  // 방향 텍스트 간이 매핑
  const upText = ["상행", "내선"];   // 2호선 내선 등
  const downText = ["하행", "외선"];

  const dirOk =
    !params.updnLineText ||
    (params.upOrDown === "up" && upText.some((t) => params.updnLineText!.includes(t))) ||
    (params.upOrDown === "down" && downText.some((t) => params.updnLineText!.includes(t)));

  return dirOk && (inTrainLine || inDest);
}
