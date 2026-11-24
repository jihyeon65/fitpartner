// FitPartner 로고: 초록 둥근 사각형 안에 나란히 선 두 사람(파트너)과 그 아래를 지나는 심박선(운동)
// Design Ref: §3 화면 구성 — 헤더·첫 화면의 서비스 이름 자리에 글자 대신 로고를 쓴다.
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="FitPartner 로고" className="shrink-0">
      <rect width="32" height="32" rx="8" className="fill-emerald-600" />
      <circle cx="11.5" cy="10.5" r="3.4" fill="#fff" />
      <circle cx="20.5" cy="10.5" r="3.4" fill="#fff" opacity="0.8" />
      <path d="M5.8 20c0-3.2 2.6-5 5.7-5s5.7 1.8 5.7 5z" fill="#fff" />
      <path d="M14.8 20c0-3.2 2.6-5 5.7-5s5.7 1.8 5.7 5z" fill="#fff" opacity="0.8" />
      <path d="M4 25.5h6l2-3 3 5.5 2.5-4.5 1.5 2H28" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** 로고 마크 + "FitPartner" 글자 */
export default function Logo({ size = 32, textClassName = "text-lg" }: { size?: number; textClassName?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className={`${textClassName} font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50`}>
        Fit<span className="text-emerald-600 dark:text-emerald-400">Partner</span>
      </span>
    </span>
  );
}
