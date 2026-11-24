"use client";

// Design Ref: §3.4 매칭 — 매칭 완료 화면: 안전 안내, 만족도 2문항(요청한 사용자만 응답), 일정 잡기 버튼
//   AI 프로그램이 화면에 보이지 않은 경우에는 "프로그램 도움 기대도" 문항을 숨기고 지표에서 제외한다.
// Design Ref: §5 MatchRequest — satisfaction("추천이 잘 맞았나요?"), programHelpful("추천된 프로그램이 도움이 될 것 같나요?")
// Plan: 작업 15번 "매칭 완료 화면", 작업 23번(온라인용 안전 안내) — 이 응답은 작업 19번 지표에서 읽는다.
import Link from "next/link";
import { useState } from "react";
import type { MatchRequest, Profile } from "@/lib/options";
import { getRequestsJson, parseRequests, saveRequests } from "@/lib/store";

/** 만나는 방식별 안전 안내 문구 (오프라인은 처음 만날 때, 온라인은 개인정보 공유에 대한 안내) */
export const SAFETY_NOTICES = {
  오프라인: "처음 만날 때는 공개된 장소에서 만나세요",
  온라인: "온라인에서도 연락처·계정 등 개인정보는 함부로 공유하지 마세요",
} as const;

export default function MatchComplete({
  request,
  partner,
  programSeen,
  onBack,
}: {
  request: MatchRequest;
  partner: Profile | undefined;
  /** 추천 카드에서 이 상대의 AI 프로그램을 실제로 본 적이 있는지 */
  programSeen: boolean;
  onBack: () => void;
}) {
  // 이미 응답한 요청은 저장된 값을 그대로 보여주고, 다시 바꾸지 않는다. (지표가 한 번만 기록되게 하려고)
  const answered = request.satisfaction !== undefined;
  const [satisfaction, setSatisfaction] = useState<boolean | null>(request.satisfaction ?? null);
  const [programHelpful, setProgramHelpful] = useState<boolean | null>(request.programHelpful ?? null);
  const [error, setError] = useState("");

  const ready = satisfaction !== null && (!programSeen || programHelpful !== null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (answered || satisfaction === null || (programSeen && programHelpful === null)) return;

    // 화면에 있는 값이 아니라 저장소의 최신 목록에서 이 요청만 바꿔서 저장한다.
    const latest = parseRequests(getRequestsJson(request.fromNickname));
    const next = latest.map((r) =>
      r.id === request.id ? { ...r, satisfaction, programHelpful: programSeen ? (programHelpful ?? undefined) : undefined } : r,
    );
    if (!saveRequests(request.fromNickname, next)) {
      setError("이 브라우저에서는 응답을 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
      return;
    }
    setError("");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <button type="button" onClick={onBack} className="w-fit text-sm text-emerald-700 hover:underline dark:text-emerald-400">
        ← 요청 목록으로
      </button>

      <div>
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
          매칭 완료 · {partner?.nickname ?? "알 수 없는 상대"}
        </h2>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          상대방이 매칭 요청을 수락했어요. ({request.mode}으로 만나요)
        </p>
      </div>

      <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        ⚠ {SAFETY_NOTICES[request.mode]}.
      </p>

      <form onSubmit={handleSubmit} className="surface flex flex-col gap-4 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <YesNo
          legend="추천이 잘 맞았나요?"
          value={satisfaction}
          onChange={setSatisfaction}
          disabled={answered}
        />
        {programSeen ? (
          <YesNo
            legend="추천된 프로그램이 도움이 될 것 같나요?"
            value={programHelpful}
            onChange={setProgramHelpful}
            disabled={answered}
          />
        ) : null}

        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        {answered ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-400">응답해 주셔서 고마워요.</p>
        ) : (
          <button
            type="submit"
            disabled={!ready}
            className="w-fit rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
          >
            응답 보내기
          </button>
        )}
      </form>

      <Link
        href={`/schedule?match=${encodeURIComponent(request.id)}`}
        className="w-fit rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
      >
        일정 잡기
      </Link>
    </div>
  );
}

function YesNo({
  legend,
  value,
  onChange,
  disabled,
}: {
  legend: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  disabled: boolean;
}) {
  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="font-medium text-zinc-900 dark:text-zinc-50">{legend}</legend>
      <div className="flex gap-2">
        {([true, false] as const).map((option) => (
          <button
            key={String(option)}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={`rounded-md border px-4 py-1.5 text-sm font-medium disabled:cursor-not-allowed ${
              value === option
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {option ? "예" : "아니요"}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
