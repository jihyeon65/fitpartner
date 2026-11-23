// Design Ref: §3.4 매칭 — 보낸 요청 목록 (상대 닉네임·상태·남은 시간)과 매칭 완료 화면
// Plan: 작업 14번 "매칭 요청", 작업 15번 "매칭 완료 화면"
import RequestList from "@/components/RequestList";

export default function MatchesPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">매칭</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">보낸 매칭 요청의 상태를 확인하고, 수락된 매칭을 열어 봐요.</p>
      </div>

      <RequestList />
    </section>
  );
}
