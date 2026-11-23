"use client";

// Design Ref: §3 화면 구성 — 헤더 메뉴: 프로필 / 추천 / 모임 / 장소 / 매칭 / 일정 / 지표 (모임은 v0.8에서 추가, DESIGN 12.5)
// 현재 보고 있는 메뉴를 표시하려면 주소(pathname)를 읽어야 해서 이 부품만 클라이언트 컴포넌트로 둔다.
import Link from "next/link";
import { usePathname } from "next/navigation";

const MENU = [
  { href: "/profile", label: "프로필" },
  { href: "/recommend", label: "추천" },
  { href: "/groups", label: "모임" },
  { href: "/places", label: "장소" },
  { href: "/matches", label: "매칭" },
  { href: "/schedule", label: "일정" },
  { href: "/metrics", label: "지표" },
] as const;

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav aria-label="주요 메뉴">
      <ul className="flex flex-wrap gap-1">
        {MENU.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  active
                    ? "rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
                    : "rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
