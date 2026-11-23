// Design Ref: §5 저장 위치 — 운동 시설 정보는 서버 코드 안의 샘플 데이터(27곳)에서 읽는다. (공공데이터 연동은 보류)
// Design Ref: §5 선택지 제안값 — 구 3개 × 종목 3개 × 3곳, 이름에 "샘플"을 붙이고 주소는 가상 주소,
//   좌표는 구 중심 좌표에서 ±0.01도 안으로 흩어서 정하며 27곳 중 2곳은 좌표를 비운다.
// Design Ref: §9 보안 — 샘플 데이터에 실제 개인·업소 정보를 넣지 않는다. (가상 이름·주소만 사용)
// Plan: 작업 16번 "시설 샘플 데이터 만들기" — 나중에 공공데이터로 바꿔도 같은 Place 모양을 돌려주면 화면은 그대로 둘 수 있다.
import "server-only";
import { DISTRICT_CENTERS } from "./districts";
import { DISTRICTS, SPORTS, type District, type Place, type Sport } from "./options";

/** 한 번에 돌려주는 시설의 최대 개수 */
export const MAX_PLACES = 50;

/** 구 이름 → 시설 id·이름에 쓰는 짧은 글자 */
const DISTRICT_CODE: Record<District, { id: string; label: string }> = {
  대덕구: { id: "daedeok", label: "대덕" },
  중구: { id: "jung", label: "중구" },
  유성구: { id: "yuseong", label: "유성" },
};

/** 종목 → 시설 id·이름에 쓰는 글자 (시설 종류 대응: 러닝=공원·운동장, 배드민턴=체육관, 헬스=헬스장) */
const SPORT_CODE: Record<Sport, { id: string; kind: string }> = {
  러닝: { id: "running", kind: "러닝 공원" },
  배드민턴: { id: "badminton", kind: "배드민턴장" },
  헬스: { id: "gym", kind: "헬스장" },
};

/**
 * 구 중심에서 얼마나 떨어뜨릴지(도). 한 구·한 종목에 3곳이므로 3개씩, 모두 ±0.01도 안이다.
 * 종목 순서(러닝·배드민턴·헬스)대로 [위도 차이, 경도 차이] 3쌍씩 적어 둔다.
 */
const OFFSETS: Record<Sport, [number, number][]> = {
  러닝: [[0.006, -0.004], [-0.005, 0.007], [0.002, 0.009]],
  배드민턴: [[-0.007, -0.006], [0.004, 0.005], [-0.002, -0.009]],
  헬스: [[0.008, 0.002], [-0.004, -0.003], [0.001, 0.006]],
};

/** 좌표를 비워 "목록에만 표시" 동작을 시험하는 시설 (2곳) */
const WITHOUT_COORDINATES = new Set(["jung-running-3", "yuseong-gym-3"]);

/** 소수점 6자리로 맞춰 부동소수점 잔여 자릿수를 없앤다. */
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function buildSamplePlaces(): Place[] {
  const places: Place[] = [];
  for (const district of DISTRICTS) {
    const center = DISTRICT_CENTERS[district];
    for (const sport of SPORTS) {
      OFFSETS[sport].forEach(([dLat, dLng], index) => {
        const number = index + 1;
        const id = `${DISTRICT_CODE[district].id}-${SPORT_CODE[sport].id}-${number}`;
        const place: Place = {
          id,
          name: `샘플 ${DISTRICT_CODE[district].label} ${SPORT_CODE[sport].kind} ${number}`,
          address: `대전광역시 ${district} 샘플로 ${number * 10 + SPORTS.indexOf(sport)}번길 (가상 주소)`,
          sports: [sport],
          district,
        };
        if (!WITHOUT_COORDINATES.has(id)) {
          place.lat = round6(center.lat + dLat);
          place.lng = round6(center.lng + dLng);
        }
        places.push(place);
      });
    }
  }
  return places;
}

/** 샘플 시설 27곳 */
export const SAMPLE_PLACES: readonly Place[] = buildSamplePlaces();

/**
 * 종목·구로 시설을 거른다. 이름 가나다순으로 정렬하고 최대 50개까지만 돌려준다.
 * (한 시설이 여러 종목에 해당하면 그 종목 중 하나라도 맞으면 포함한다)
 */
export function findPlaces(sport: Sport, district: District): Place[] {
  return SAMPLE_PLACES.filter((place) => place.district === district && place.sports.includes(sport))
    .map((place) => ({ ...place, sports: [...place.sports] }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .slice(0, MAX_PLACES);
}
