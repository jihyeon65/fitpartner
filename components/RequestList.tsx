"use client";

// Design Ref: §3.4 매칭 — 보낸 요청 목록 (상대 닉네임·상태: 대기/수락/만료·남은 시간)
// Plan: 작업 14번 "매칭 요청", 작업 15번 "매칭 완료 화면" — 수락된 요청에서 "매칭 완료 화면 열기"를 누르면 MatchComplete 를 보여준다.
import Link from "next/link";
import { useState } from "react";
import { currentStatus, formatRemaining, remainingMs, type RequestStatus } from "@/lib/match";
import { VIRTUAL_PROFILES } from "@/lib/profiles";
import { useNickname } from "@/lib/use-nickname";
import { useNow, useProgramSeen, useRequests } from "@/lib/use-requests";
import MatchComplete from "./MatchComplete";

const STATUS_STYLE: Record<RequestStatus, string> = {
  대기: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  수락: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  만료: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
};

export default function RequestList() {
  const nickname = useNickname();
  const requests = useRequests(nickname ?? null);
  const now = useNow();
  const programSeen = useProgramSeen(nickname ?? null);
  const [openId, setOpenId] = useState<string | null>(null);

  // 서버가 만든 첫 화면에서는 아직 브라우저 저장소를 모르므로 아무것도 그리지 않는다.
  if (nickname === undefined || requests === undefined || programSeen === undefined) return null;

  if (nickname === null) {
    return <Guide text="먼저 닉네임을 정해 주세요." href="/" button="닉네임 정하러 가기" />;
  }
  if (requests.length === 0) {
    return <Guide text="아직 보낸 요청이 없어요. 추천 결과에서 마음에 드는 파트너에게 매칭을 요청해 보세요." href="/recommend" button="추천 결과 보러 가기" />;
  }

  // 수락된 요청을 열어 둔 경우에는 목록 대신 매칭 완료 화면을 보여준다.
  const opened = openId ? requests.find((r) => r.id === openId) : undefined;
  if (opened && currentStatus(opened, now) === "수락") {
    return (
      <MatchComplete
        request={opened}
        partner={VIRTUAL_PROFILES.find((p) => p.id === opened.toProfileId)}
        programSeen={programSeen.includes(opened.toProfileId)}
        onBack={() => setOpenId(null)}
      />
    );
  }

  // 최근에 보낸 요청이 위로 오게 한다.
  const sorted = [...requests].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <ul className="flex flex-col gap-3">
      {sorted.map((request) => {
        const status = currentStatus(request, now);
        const partner = VIRTUAL_PROFILES.find((p) => p.id === request.toProfileId);
        return (
          <li
            key={request.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              {partner?.nickname ?? "알 수 없는 상대"}
            </span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>{status}</span>
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">
              {request.mode}
            </span>
            {status === "대기" ? (
              <span className="text-sm text-zinc-600 dark:text-zinc-400">
                만료까지 {formatRemaining(remainingMs(request, now))}
              </span>
            ) : null}
            {status === "수락" ? (
              <button
                type="button"
                onClick={() => setOpenId(request.id)}
                className="ml-auto rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                매칭 완료 화면 열기
              </button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

function Guide({ text, href, button }: { text: string; href: string; button: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
      <p className="text-zinc-700 dark:text-zinc-300">{text}</p>
      <Link
        href={href}
        className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
      >
        {button}
      </Link>
    </div>
  );
}
