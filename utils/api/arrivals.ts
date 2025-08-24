// /subway-alert/utils/arrivals.ts
import { fetchRealtimeArrivals, parseStationsAway, SimpleArrival } from "../api/seoul";
import { isTrainTowardsNeighbor } from "../stations";

export type NextTwo = {
  primary?: { label: string; stationsAway: number | null };
  secondary?: { label: string; stationsAway: number | null };
};

export async function getNextTwoArrivals(params: {
  stationApiName: string;
  line: string; // "2호선" | "4호선"
  direction: { key: "up" | "down"; neighborApiName: string; label: string };
}): Promise<NextTwo> {
  const { stationApiName, direction } = params;

  let list: SimpleArrival[] = [];
  try {
    list = await fetchRealtimeArrivals(stationApiName);
  } catch {
    return {};
  }

  const filtered = list.filter((r) =>
    isTrainTowardsNeighbor({
      apiNeighborName: direction.neighborApiName,
      upOrDown: direction.key,
      updnLineText: r.updnLine,
      trainLineNm: r.trainLineNm,
      bstatnNm: r.bstatnNm,
    })
  );

  const top2 = filtered.slice(0, 2);

  const toItem = (r: SimpleArrival) => {
    const stationsAway =
      parseStationsAway(r.arvlMsg2) ??
      parseStationsAway(r.arvlMsg3) ??
      null;
    const label =
      (stationsAway !== null ? `${stationsAway} 정거장 전` : (r.arvlMsg2 || r.arvlMsg3 || "도착 정보 없음"));
    return { label, stationsAway };
  };

  return {
    primary: top2[0] ? toItem(top2[0]) : undefined,
    secondary: top2[1] ? toItem(top2[1]) : undefined,
  };
}
