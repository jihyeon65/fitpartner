// Design Ref: §5 저장 위치 — 운동 시설 정보는 서버 코드 안의 샘플 데이터(27곳)에서 읽는다. (공공데이터 연동은 보류)
// Design Ref: §5 선택지 제안값 — 구 3개 × 종목 3개 × 3곳, 주소는 가상 주소,
//   좌표는 구 중심 좌표에서 ±0.01도 안으로 흩어서 정하며 27곳 중 2곳은 좌표를 비운다.
//   (이름은 "샘플 ○○ 1"처럼 붙이지 않고, 실제 시설처럼 보이는 지어낸 이름을 쓴다. 화면의 "시설 정보는 샘플 데이터입니다" 안내는 그대로 둔다)
// Design Ref: §9 보안 — 샘플 데이터에 실제 개인·업소 정보를 넣지 않는다. (실제 업소 이름이 아니라 지어낸 이름과 가상 주소만 사용)
// Plan: 작업 16번 "시설 샘플 데이터 만들기" — 나중에 공공데이터로 바꿔도 같은 Place 모양을 돌려주면 화면은 그대로 둘 수 있다.
import "server-only";
import { DISTRICT_CENTERS } from "./districts";
import { DISTRICTS, FACILITY_SPORTS, type District, type FacilitySport, type Place } from "./options";

/** 한 번에 돌려주는 시설의 최대 개수 */
export const MAX_PLACES = 50;

/** 구 이름 → 시설 id에 쓰는 글자 */
const DISTRICT_ID: Record<District, string> = { 대덕구: "daedeok", 중구: "jung", 유성구: "yuseong" };

/** 종목 → 시설 id에 쓰는 글자 */
const SPORT_ID: Record<FacilitySport, string> = { 러닝: "running", 배드민턴: "badminton", 헬스: "gym" };

/**
 * 시설 이름 (구 → 종목 → 1·2·3번 순서). 시설 종류 대응: 러닝=공원·트랙, 배드민턴=체육관, 헬스=헬스장.
 * 실제 업소와 겹치지 않도록 지어낸 이름이다. 27개 모두 서로 달라야 한다.
 */
const NAMES: Record<District, Record<FacilitySport, [string, string, string]>> = {
  대덕구: {
    러닝: ["푸른솔 러닝파크", "새벽바람 트랙", "한밭 달리기공원"],
    배드민턴: ["스매시 체육관", "셔틀콕 아레나", "라켓온 배드민턴장"],
    헬스: ["힘찬 피트니스", "아이언핏 헬스장", "바디온 짐"],
  },
  중구: {
    러닝: ["은행나무 러닝파크", "달빛 트랙", "온누리 달리기공원"],
    배드민턴: ["클리어 체육관", "드롭샷 아레나", "윙스 배드민턴장"],
    헬스: ["파워업 피트니스", "스트롱핏 헬스장", "코어랩 짐"],
  },
  유성구: {
    러닝: ["솔바람 러닝파크", "별빛 트랙", "온천수 달리기공원"],
    배드민턴: ["랠리 체육관", "스윙온 아레나", "하이클리어 배드민턴장"],
    헬스: ["맥스핏 피트니스", "바디웍스 헬스장", "리프트존 짐"],
  },
};

/**
 * 구 중심에서 얼마나 떨어뜨릴지(도). 한 구·한 종목에 3곳이므로 3개씩, 모두 ±0.01도 안이다.
 * 종목 순서(러닝·배드민턴·헬스)대로 [위도 차이, 경도 차이] 3쌍씩 적어 둔다.
 */
const OFFSETS: Record<FacilitySport, [number, number][]> = {
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
    for (const sport of FACILITY_SPORTS) {
      OFFSETS[sport].forEach(([dLat, dLng], index) => {
        const number = index + 1;
        const id = `${DISTRICT_ID[district]}-${SPORT_ID[sport]}-${number}`;
        const place: Place = {
          id,
          name: NAMES[district][sport][index],
          address: `대전광역시 ${district} 가온로 ${number * 10 + FACILITY_SPORTS.indexOf(sport)}번길 (가상 주소)`,
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
export function findPlaces(sport: FacilitySport, district: District): Place[] {
  return SAMPLE_PLACES.filter((place) => place.district === district && place.sports.includes(sport))
    .map((place) => ({ ...place, sports: [...place.sports] }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"))
    .slice(0, MAX_PLACES);
}
