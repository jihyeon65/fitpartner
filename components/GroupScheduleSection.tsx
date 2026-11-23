"use client";

// Design Ref: §12.5 화면 — /schedule 아래 "모임 일정" 구역: 내가 만든 모임과 참여가 확정된 모임의 날짜·시간·방식, "내 운동 완료" 체크
// Design Ref: §12.4 지표 — 모임은 기존 6개 지표에 넣지 않는다. (완료 체크는 이 구역에서만 보여준다)
// Plan: 작업 26번 "모임 참여 처리와 일정 연결"
//
// 호스트(내가 만든 모임)의 완료는 모임(Group.hostDone)에, 참여자의 완료는 참여 신청(GroupJoin.done)에 저장한다.
import { useMemo, useState } from "react";
import {
  buildSeedGroups,
  groupTitle,
  myGroupSchedule,
  seatsTaken,
  setHostDone,
  setJoinDone,
  type GroupScheduleItem,
} from "@/lib/groups";
import type { Profile } from "@/lib/options";
import {
  getGroupJoinsJson,
  getGroupsJson,
  parseGroupJoins,
  parseGroups,
  saveGroupJoins,
  saveGroups,
} from "@/lib/store";
import { useAllGroupJoins, useMyGroupJoins, useNow, useUserGroups } from "@/lib/use-requests";
import { todayString } from "@/lib/schedule";
import Link from "next/link";

export default function GroupScheduleSection({ me }: { me: Profile }) {
  const userGroups = useUserGroups();
  const myJoins = useMyGroupJoins(me.nickname);
  const allJoins = useAllGroupJoins();
  const now = useNow();
  const [error, setError] = useState("");

  // 가상 모임은 날짜가 "오늘 기준"이라 하루에 한 번만 다시 만든다.
  const day = todayString(new Date(now));
  const seeds = useMemo(() => buildSeedGroups(Date.parse(`${day}T12:00:00`)), [day]);

  if (userGroups === undefined || myJoins === undefined || allJoins === undefined) return null;

  const groups = [...seeds, ...userGroups];
  const items = myGroupSchedule(me, groups, myJoins, now);

  function toggle(item: GroupScheduleItem) {
    // 화면에 있는 목록이 아니라 저장소의 최신 값에서 이 모임만 바꿔 저장한다.
    const next = !item.done;
    const ok =
      item.role === "호스트"
        ? saveGroups(setHostDone(parseGroups(getGroupsJson()), item.group.id, next))
        : item.join !== undefined && saveGroupJoins(me.nickname, setJoinDone(parseGroupJoins(getGroupJoinsJson(me.nickname)), item.join.id, next));
    setError(ok ? "" : "이 브라우저에서는 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">모임 일정</h2>
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
          <p className="text-zinc-700 dark:text-zinc-300">참여가 확정된 모임이나 내가 만든 모임이 아직 없어요.</p>
          <Link href="/groups" className="mt-2 inline-block text-sm text-emerald-700 hover:underline dark:text-emerald-400">
            모임 보러 가기
          </Link>
        </div>
      ) : (
        <ul className="flex max-w-2xl flex-col gap-3">
          {items.map((item) => (
            <li key={`${item.role}-${item.group.id}`} className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-50">{groupTitle(item.group)}</span>
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {item.role === "호스트" ? "내가 만든 모임" : `호스트 ${item.group.hostNickname}`}
                </span>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {item.group.date} · {item.group.slot} · {seatsTaken(item.group, allJoins, now)}/{item.group.capacity}명
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">
                {item.group.mode === "온라인"
                  ? "방식: 온라인 (각자 있는 곳에서 화상·메신저로 함께 운동해요)"
                  : `방식: 오프라인 · ${item.group.district}`}
              </p>
              <button
                type="button"
                aria-pressed={item.done}
                onClick={() => toggle(item)}
                className={`w-fit rounded-md border px-3 py-1.5 text-sm font-medium ${
                  item.done
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                {item.done ? "✓ " : ""}내 운동 완료
              </button>
            </li>
          ))}
        </ul>
      )}
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </section>
  );
}
