// Design Ref: §3.5 지도·시설 검색 — 종목·구로 시설을 지도와 목록에서 확인한다.
// Plan: 작업 17번 "지도·시설 검색 화면(N2)" — 일정 장소 선택 모드는 작업 18번에서 이어서 만든다.
import PlacesExplorer from "@/components/PlacesExplorer";

export default function PlacesPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">장소</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">종목과 구를 고르면 운동할 수 있는 시설을 지도에서 보여줘요.</p>
      </div>

      <PlacesExplorer />
    </section>
  );
}
