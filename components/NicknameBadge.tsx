"use client";

// Design Ref: §3 헤더 — 현재 닉네임과 [닉네임 바꾸기]
// Plan: 작업 4번 "닉네임만 입력하는 실습용 간단 로그인"
import Link from "next/link";
import { useNickname } from "@/lib/use-nickname";

export default function NicknameBadge() {
  const nickname = useNickname();

  return (
    <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
      {/* 서버가 만든 첫 화면(undefined)에서는 자리만 잡아 두어 글자가 바뀌며 깜빡이지 않게 한다. */}
      <span className={nickname === undefined ? "invisible" : undefined}>
        닉네임: {nickname ?? "아직 없음"}
      </span>
      <Link
        href="/"
        className="rounded-md border border-zinc-300 px-2.5 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        닉네임 바꾸기
      </Link>
    </div>
  );
}
