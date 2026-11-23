// Design Ref: §3.4 매칭 — 보낸 요청 목록 (상대 닉네임·상태·남은 시간)
// Plan: 작업 14번 "매칭 요청" — 매칭 완료 화면(안전 안내·만족도)은 작업 15번에서 이어서 만든다.
import RequestList from "@/components/RequestList";

export default function MatchesPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">매칭</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">보낸 매칭 요청의 상태를 확인해요.</p>
      </div>

      <RequestList />
    </section>
  );
}
