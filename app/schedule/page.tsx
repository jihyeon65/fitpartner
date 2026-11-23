// Design Ref: §3.6 일정 관리 — 뼈대만 만든다. 일정 화면은 PLAN 작업 18번에서 만든다.
import PagePlaceholder from "@/components/PagePlaceholder";

export default function SchedulePage() {
  return (
    <PagePlaceholder
      title="일정"
      summary="매칭된 파트너와 함께 운동할 시간과 장소를 정해요."
      planTask="작업 18번"
      willShow={[
        "두 사람이 겹치는 가능 시간 목록과 날짜 선택 후 일정 등록",
        "장소 고르기 버튼(선택 사항): 장소 화면에서 시설을 골라 일정에 저장",
        "일정마다 '운동 완료' 체크",
      ]}
    />
  );
}
