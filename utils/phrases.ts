// utils/phrases.ts
export const CUSTOM_PHRASES = [
  "빨리 달리세요!",
  "지금 뛰면 안놓친다",
  "지금 놓치면 너 지각 확정",
];

/** 등록된 문구 중 1개 랜덤 반환 (비어있으면 빈 문자열) */
export const pickRandomPhrase = (list: string[] = CUSTOM_PHRASES) => {
  if (!list || list.length === 0) return "";
  const i = Math.floor(Math.random() * list.length);
  return list[i];
};
