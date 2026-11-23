// Design Ref: §3 화면 구성 — 모든 화면 맨 위의 헤더(서비스 이름 · 닉네임 · 메뉴 · 닉네임 바꾸기)
// Plan: 작업 2번 "기본 화면 틀"
// 닉네임 로그인(작업 4번)과 브라우저 저장소(lib/store.ts)가 아직 없어서, 닉네임 자리는 안내 문구로 둔다.
import Link from "next/link";
import NavLinks from "./NavLinks";

export default function SiteHeader() {
  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
            핏파트너
          </Link>
          <NavLinks />
        </div>
        <div className="flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
          {/* 로그인 기능(작업 4번)을 만들면 실제 닉네임으로 바꾼다. */}
          <span>닉네임: 아직 없음</span>
          <Link
            href="/"
            className="rounded-md border border-zinc-300 px-2.5 py-1 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            닉네임 바꾸기
          </Link>
        </div>
      </div>
    </header>
  );
}
