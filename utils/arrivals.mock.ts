// API 붙기 전까지 임시: 항상 1·3 정류장 전을 돌려준다.
export async function getMockArrivals(_target: {
  station: string;
  line: string;
  direction: string;
}) {
  await new Promise(r => setTimeout(r, 150)); // 지연 흉내
  return { first: 1, second: 3 };
}
