// Design Ref: §3.7 지표 — 서비스가 목표를 얼마나 달성했는지 숫자로 확인한다.
// Plan: 작업 19번 "지표 기록"
import MetricsView from "@/components/MetricsView";

export default function MetricsPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">지표</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">서비스가 목표를 얼마나 달성했는지 숫자로 확인해요.</p>
      </div>

      <MetricsView />
    </section>
  );
}
