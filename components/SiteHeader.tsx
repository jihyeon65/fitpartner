// Design Ref: §3 화면 구성 — 모든 화면 맨 위의 헤더(서비스 이름 · 닉네임 · 메뉴 · 닉네임 바꾸기)
// Plan: 작업 2번 "기본 화면 틀", 작업 4번 "닉네임만 입력하는 실습용 간단 로그인"
import Link from "next/link";
import NavLinks from "./NavLinks";
import NicknameBadge from "./NicknameBadge";

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
        <NicknameBadge />
      </div>
    </header>
  );
}
