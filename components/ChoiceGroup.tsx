"use client";

// Design Ref: §3.2 프로필 입력 — 모두 선택형(선택 버튼), 자유 입력란 없음
// Plan: 작업 5번 "프로필 입력 화면"
// 한 개만 고르는 묶음(SingleChoice)과 여러 개를 고르는 묶음(MultiChoice)을 만든다.
import type { ReactNode } from "react";

type Value = string | number;

type CommonProps<T extends Value> = {
  /** 항목 이름 (예: "종목") */
  legend: string;
  /** 항목 아래에 보이는 설명 */
  hint?: ReactNode;
  /** 고를 수 있는 값 목록 */
  options: readonly T[];
  /** 버튼에 보이는 글자. 없으면 값을 그대로 보여준다. */
  getLabel?: (value: T) => string;
};

function buttonClass(selected: boolean): string {
  return selected
    ? "rounded-full border border-emerald-600 bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white"
    : "rounded-full border border-zinc-300 px-4 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";
}

function Frame({ legend, hint, children }: { legend: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">{legend}</legend>
      <div className="flex flex-wrap gap-2">{children}</div>
      {hint ? <p className="text-sm text-zinc-500 dark:text-zinc-400">{hint}</p> : null}
    </fieldset>
  );
}

/** 한 개만 고른다. 이미 고른 값을 다시 누르면 선택이 풀린다. */
export function SingleChoice<T extends Value>({
  legend,
  hint,
  options,
  getLabel,
  value,
  onChange,
}: CommonProps<T> & { value: T | null; onChange: (value: T | null) => void }) {
  return (
    <Frame legend={legend} hint={hint}>
      {options.map((option) => {
        const selected = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(selected ? null : option)}
            className={buttonClass(selected)}
          >
            {getLabel ? getLabel(option) : option}
          </button>
        );
      })}
    </Frame>
  );
}

/** 여러 개를 고른다. 누를 때마다 선택이 켜지고 꺼진다. */
export function MultiChoice<T extends Value>({
  legend,
  hint,
  options,
  getLabel,
  values,
  onChange,
}: CommonProps<T> & { values: readonly T[]; onChange: (values: T[]) => void }) {
  return (
    <Frame legend={legend} hint={hint}>
      {options.map((option) => {
        const selected = values.includes(option);
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            onClick={() =>
              // 목록에 정해진 순서를 지켜서 저장한다. (누른 순서가 달라도 같은 결과가 되게)
              onChange(options.filter((o) => (o === option ? !selected : values.includes(o))))
            }
            className={buttonClass(selected)}
          >
            {getLabel ? getLabel(option) : option}
          </button>
        );
      })}
    </Frame>
  );
}
