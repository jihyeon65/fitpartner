// Design Ref: §3.5 지도·시설 검색 — 뼈대만 만든다. 지도 화면은 PLAN 작업 17번에서 만든다.
import PagePlaceholder from "@/components/PagePlaceholder";

export default function PlacesPage() {
  return (
    <PagePlaceholder
      title="장소"
      summary="종목과 구를 골라 운동할 수 있는 시설을 지도와 목록으로 확인해요."
      planTask="작업 16번·17번"
      willShow={[
        "종목·구 선택 (기본값은 내 프로필)",
        "지도(시설 마커)와 시설 목록, 시설 이름·주소 상세",
        "시설 정보는 샘플 데이터라는 안내와 지도 출처 표기",
      ]}
    />
  );
}
