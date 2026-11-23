// Design Ref: §3.5 지도·시설 검색 — 종목·구로 시설을 지도와 목록에서 확인한다.
// Plan: 작업 17번 "지도·시설 검색 화면(N2)", 작업 18번 "일정 관리"(일정 장소 선택 모드)
import { Suspense } from "react";
import PlacesExplorer from "@/components/PlacesExplorer";

export default function PlacesPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">장소</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">종목과 구를 고르면 운동할 수 있는 시설을 지도에서 보여줘요.</p>
      </div>

      {/* 주소의 ?pick= 값(일정에서 장소를 고르러 온 경우)을 읽는 화면이라 Suspense로 감싼다. */}
      <Suspense fallback={null}>
        <PlacesExplorer />
      </Suspense>
    </section>
  );
}
