// Design Ref: §3.6 일정 관리 — 가능한 시간 비교·일정 등록·(선택) 장소 고르기·"운동 완료" 체크
// Plan: 작업 18번 "일정 관리"
import { Suspense } from "react";
import ScheduleView from "@/components/ScheduleView";

export default function SchedulePage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">일정</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">매칭된 파트너와 함께 운동할 시간과 장소를 정해요.</p>
      </div>

      {/* 주소의 ?match= 값을 읽는 화면이라 Suspense로 감싼다. */}
      <Suspense fallback={null}>
        <ScheduleView />
      </Suspense>
    </section>
  );
}
