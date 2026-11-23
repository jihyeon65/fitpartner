// Design Ref: §3.4 매칭 — 뼈대만 만든다. 요청 목록은 PLAN 작업 14번, 완료 화면은 15번에서 만든다.
import PagePlaceholder from "@/components/PagePlaceholder";

export default function MatchesPage() {
  return (
    <PagePlaceholder
      title="매칭"
      summary="보낸 매칭 요청과 매칭 완료 내용을 확인해요."
      planTask="작업 14번·15번"
      willShow={[
        "보낸 요청 목록 (상대 닉네임·상태: 대기/수락/만료·남은 시간)",
        "매칭 완료 화면: 안전 안내 문구와 만족도 2문항, 일정 잡기 버튼",
      ]}
    />
  );
}
