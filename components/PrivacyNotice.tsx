"use client";

// Design Ref: §9 보안·개인정보 — 로그인이 없어 기록이 이 브라우저에 그대로 저장되므로, 공용 PC에서 쓰는 사람을 위한 안내와 "내 기록 지우기"
// Plan: 공개 전 보안 점검(공용 PC 안내·기록 삭제)
import { useState } from "react";
import { clearUserData } from "@/lib/store";
import { useNickname } from "@/lib/use-nickname";

export default function PrivacyNotice() {
  const nickname = useNickname();
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");

  function handleClear() {
    if (!nickname) return;
    setMessage(clearUserData(nickname) ? "이 브라우저에 저장된 내 기록을 모두 지웠어요." : "기록을 지우지 못했어요. 브라우저의 저장소 설정을 확인해 주세요.");
    setConfirming(false);
  }

  return (
    <div className="surface flex max-w-xl flex-col gap-2 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-700 dark:border-zinc-800 dark:text-zinc-300">
      <p>
        프로필·일정·채팅 글은 이 기기의 브라우저에만 저장돼요. 로그인이 없어서 같은 기기에서 같은 닉네임을 쓰면 누구나 볼 수 있어요.
        공용 컴퓨터라면 사용 후 기록을 지워 주세요.
      </p>
      {nickname ? (
        confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>&quot;{nickname}&quot;의 기록을 모두 지울까요? 되돌릴 수 없어요.</span>
            <button type="button" onClick={handleClear} className="rounded-md bg-red-600 px-3 py-1.5 font-medium text-white hover:bg-red-700">
              지우기
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMessage("");
              setConfirming(true);
            }}
            className="w-fit rounded-md border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            내 기록 지우기
          </button>
        )
      ) : null}
      {message ? <p role="status">{message}</p> : null}
    </div>
  );
}
