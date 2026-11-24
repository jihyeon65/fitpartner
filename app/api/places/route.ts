// Design Ref: §7 API 명세 — GET /api/places: 종목·구를 받아 샘플 시설 데이터에서 거르고 이름·주소·좌표·종목만 정리해 반환
//   선택지 밖의 값은 400, 샘플 데이터를 읽지 못하는 서버 오류는 500 "시설 정보를 불러오지 못했어요"
//   (공공데이터 연동 시에는 502로 처리한다. 지금은 샘플 데이터라 해당 없음)
// Plan: 작업 16번 "시설 샘플 데이터 만들기"
import { DISTRICTS, FACILITY_SPORTS } from "@/lib/options";
import { findPlaces } from "@/lib/places";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: Request) {
  const limited = rateLimit(request, "places", 120, 60_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const sport = searchParams.get("sport");
  const district = searchParams.get("district");

  // 시설이 있는 종목(러닝·배드민턴·헬스)만 받는다. 맨몸운동은 시설이 없어서 400이다.
  const validSport = FACILITY_SPORTS.find((item) => item === sport);
  const validDistrict = DISTRICTS.find((item) => item === district);
  if (!validSport || !validDistrict) {
    const missing = [!validSport ? "종목을" : null, !validDistrict ? "구를" : null].filter(Boolean).join(", ");
    return Response.json({ message: `${missing} 선택해 주세요.` }, { status: 400 });
  }

  try {
    // 화면에는 지도에 필요한 값만 보낸다. (id·이름·주소·종목·구·좌표)
    const places = findPlaces(validSport, validDistrict).map(({ id, name, address, sports, district, lat, lng }) => ({
      id,
      name,
      address,
      sports,
      district,
      lat,
      lng,
    }));
    return Response.json(places);
  } catch {
    return Response.json({ message: "시설 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 500 });
  }
}
