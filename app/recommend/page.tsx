// Design Ref: §3.3 추천 결과 — 뼈대만 만든다. 결과 화면은 PLAN 작업 9번(AI 없이)과 13번(AI 결과 연결)에서 만든다.
import PagePlaceholder from "@/components/PagePlaceholder";

export default function RecommendPage() {
  return (
    <PagePlaceholder
      title="추천 결과"
      summary="조건에 맞는 파트너를 적합도 점수와 함께 보여줘요."
      planTask="작업 9번·13번"
      willShow={[
        "적합도 점수 안내 문구와 파트너 카드(최대 5개, 점수 높은 순)",
        "카드마다 닉네임·적합도 점수·일치 조건, '비슷한 실력 매칭' 배지",
        "펼치면 추천 이유·연습 방식·운동 프로그램(AI)",
        "[매칭 요청] 버튼",
      ]}
    />
  );
}
