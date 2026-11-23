"use client";

// Design Ref: §3.1 로그인 — 닉네임 입력칸 1개(이메일·비밀번호 없음), 닉네임이 비면 [시작하기] 비활성
// Plan: 작업 4번 "닉네임만 입력하는 실습용 간단 로그인"
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { NICKNAME_MAX_LENGTH, isValidNickname, normalizeNickname, setNickname } from "@/lib/store";
import { useNickname } from "@/lib/use-nickname";

export default function NicknameForm() {
  const router = useRouter();
  const saved = useNickname();

  // draft가 null이면 아직 직접 입력하지 않은 상태라서 저장된 닉네임을 보여준다.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");

  const value = draft ?? saved ?? "";
  const nickname = normalizeNickname(value);
  const canStart = isValidNickname(nickname);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canStart) return;
    const done = setNickname(nickname);
    if (done === null) {
      setError("이 브라우저에서는 닉네임을 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
      return;
    }
    router.push("/profile");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
      <label htmlFor="nickname" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        닉네임
      </label>
      <input
        id="nickname"
        name="nickname"
        type="text"
        value={value}
        maxLength={NICKNAME_MAX_LENGTH}
        autoComplete="off"
        placeholder="예: 운동초보"
        onChange={(event) => {
          setDraft(event.target.value);
          setError("");
        }}
        aria-describedby="nickname-help"
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
      />
      <p id="nickname-help" className="text-sm text-zinc-500 dark:text-zinc-400">
        1~{NICKNAME_MAX_LENGTH}자로 적어 주세요. 이름·연락처 같은 개인정보는 쓰지 마세요.
        {saved ? ` 지금은 "${saved}" 닉네임이에요. 다른 닉네임으로 시작하면 기록이 따로 저장돼요.` : ""}
      </p>

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!canStart}
        className="w-fit rounded-md bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
      >
        시작하기
      </button>
    </form>
  );
}
