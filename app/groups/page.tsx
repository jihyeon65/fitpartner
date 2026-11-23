// Design Ref: §12.5 화면 — /groups: 1대다수 모임 찾기·만들기·내 모임 (v0.9, 1대1 매칭은 그대로 유지)
// Plan: 작업 25번 "모임 화면"
import GroupsView from "@/components/GroupsView";

export default function GroupsPage() {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">모임</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          여러 명이 함께 운동하는 모임을 찾거나 직접 만들어요. 1대1 매칭은 추천 메뉴에서 그대로 쓸 수 있어요.
        </p>
      </div>

      <GroupsView />
    </section>
  );
}
