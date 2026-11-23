"use client";

// Design Ref: §3.3 추천 결과 — "▶ 추천 이유 / 연습 방식 / 프로그램" 펼침, AI 응답 중 표시, 실패 시 "잠시 후 다시 시도해 주세요"
//   점수 목록은 그대로 두고 AI 영역에만 안내를 보인다. 참고 안내 문구는 서버(코드)가 붙인 것을 그대로 보여준다.
// Plan: 작업 13번 "추천 결과 화면에 AI 결과 연결"
// Plan: 작업 15번 "매칭 완료 화면" — 프로그램을 보여준 후보를 기록한다.
//   펼쳤을 때 처음 한 번만 /api/analyze 를 부른다. (카드마다 AI를 미리 부르면 느리고 비용이 들기 때문)
import { useState } from "react";
import type { Profile } from "@/lib/options";
import type { AnalysisResult, ReasonItem } from "@/lib/analysis";
import { markProgramSeen } from "@/lib/store";

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: AnalysisResult };

const RETRY_MESSAGE = "잠시 후 다시 시도해 주세요";

export default function AnalysisPanel({ me, candidateId }: { me: Profile; candidateId: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ kind: "idle" });

  async function load() {
    setState({ kind: "loading" });
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ me, candidateId }),
      });
      // AI 시간 초과·호출 실패(503)나 그 밖의 오류는 모두 같은 안내만 보인다.
      if (!response.ok) {
        setState({ kind: "error", message: RETRY_MESSAGE });
        return;
      }
      const result = (await response.json()) as AnalysisResult;
      // 프로그램을 실제로 보여줬다면 기록한다. (매칭 완료 화면의 "프로그램 도움 기대도" 문항을 보일지 정하는 데 쓴다)
      if (result.status === "ok" && result.program) markProgramSeen(me.nickname, candidateId);
      setState({ kind: "done", result });
    } catch {
      setState({ kind: "error", message: RETRY_MESSAGE });
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && state.kind === "idle") void load();
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="text-sm font-medium text-emerald-700 hover:underline dark:text-emerald-400"
      >
        {open ? "▼" : "▶"} 추천 이유 · 연습 방식 · 프로그램 (AI)
      </button>

      {open ? (
        <div className="mt-2 rounded-md bg-zinc-50 p-3 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
          {state.kind === "loading" ? <p>AI가 분석하는 중이에요…</p> : null}
          {state.kind === "error" ? (
            <div className="flex flex-wrap items-center gap-3">
              <p role="alert">{state.message}</p>
              <button
                type="button"
                onClick={() => void load()}
                className="rounded border border-zinc-300 px-2 py-0.5 text-xs hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                다시 시도
              </button>
            </div>
          ) : null}
          {state.kind === "done" ? <Result result={state.result} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function Result({ result }: { result: AnalysisResult }) {
  if (result.status === "insufficient") return <p>{result.message}</p>;

  const { reasons, practice, program, effects, notice, consult } = result;
  return (
    <div className="flex flex-col gap-3">
      <Section title="공통점" items={reasons.commonalities} />
      <Section title="차이점" items={reasons.differences} />
      {practice.length > 0 ? <Section title="연습 방식" items={practice} /> : null}
      {program ? (
        <div>
          <h4 className="font-semibold">
            운동 프로그램 · 1회 {program.minutesPerSession}분, 주 {program.sessionsPerWeek}회
            {program.lowIntensityLabel ? (
              <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                {program.lowIntensityLabel}
              </span>
            ) : null}
          </h4>
          <List items={program.items} />
        </div>
      ) : null}
      {effects.length > 0 ? <Section title="기대 효과" items={effects} /> : null}
      {consult ? <p>{consult}</p> : null}
      <p className="text-xs text-zinc-600 dark:text-zinc-400">※ {notice}</p>
    </div>
  );
}

function Section({ title, items }: { title: string; items: ReasonItem[] }) {
  return (
    <div>
      <h4 className="font-semibold">{title}</h4>
      <List items={items} />
    </div>
  );
}

function List({ items }: { items: ReasonItem[] }) {
  return (
    <ul className="mt-1 list-disc pl-5">
      {items.map((item) => (
        <li key={item.text}>{item.text}</li>
      ))}
    </ul>
  );
}
