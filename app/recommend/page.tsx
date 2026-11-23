// Design Ref: §3.3 추천 결과 — 점수 안내 문구와 파트너 카드(최대 5개, 점수 높은 순)
// Plan: 작업 9번 "추천 결과 화면(AI 없이 먼저)" — AI 결과 연결은 작업 13번에서 이어서 한다.
import RecommendList from "@/components/RecommendList";

export default function RecommendPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">추천 결과</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">조건에 맞는 파트너를 적합도 점수와 함께 보여줘요.</p>
      </div>

      <RecommendList />
    </section>
  );
}
