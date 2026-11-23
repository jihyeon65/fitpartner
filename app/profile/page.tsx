// Design Ref: §3.2 프로필 입력 — 뼈대만 만든다. 실제 입력 화면은 PLAN 작업 5번에서 만든다.
import PagePlaceholder from "@/components/PagePlaceholder";

export default function ProfilePage() {
  return (
    <PagePlaceholder
      title="프로필 입력"
      summary="운동 종목·실력·목적 등을 선택하면 맞는 파트너를 추천해 드려요."
      planTask="작업 5번"
      willShow={[
        "종목(러닝·배드민턴·헬스), 실력(1~5단계), 목적, 성향을 고르는 선택 버튼",
        "가능 시간(4개 묶음), 희망 지역(구), 파트너 조건(선택)",
        "빠진 항목이 있으면 안내가 뜨는 [추천 받기] 버튼",
      ]}
    />
  );
}
