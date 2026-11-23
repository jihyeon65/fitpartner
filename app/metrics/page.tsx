// Design Ref: §3.7 지표 — 뼈대만 만든다. 지표 화면은 PLAN 작업 19번에서 만든다.
import PagePlaceholder from "@/components/PagePlaceholder";

export default function MetricsPage() {
  return (
    <PagePlaceholder
      title="지표"
      summary="서비스가 목표를 얼마나 달성했는지 숫자로 확인해요."
      planTask="작업 19번"
      willShow={[
        "파트너 탐색 시간, 추천 만족도, 프로그램 도움 기대도",
        "일정 등록률, 운동 완료율, 초보자 비율(가상 프로필 20명 기준)",
        "이 브라우저에 저장된 모든 닉네임의 기록을 합산해 표시",
      ]}
    />
  );
}
