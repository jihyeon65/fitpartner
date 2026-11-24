"use client";

// Design Ref: §12.5 화면 확장 — 온라인 모임 채팅방: 글 보내기·읽기, 개인정보 안내, 가상 참여자의 시연용 답글
// Plan: 사용자 요청(온라인 모임 앱 안 소통). 글은 이 브라우저에만 저장되고 같은 브라우저의 다른 닉네임도 같은 방을 본다.
import { useEffect, useRef, useState } from "react";
import { CHAT_NOTICE, MAX_MESSAGE_LENGTH, sendMessage, visibleMessages } from "@/lib/chat";
import type { Group, GroupJoin, Profile } from "@/lib/options";
import { getChatJson, parseChat, saveChat } from "@/lib/store";
import { useGroupChat, useNow } from "@/lib/use-requests";

export default function GroupChat({ group, me, allJoins }: { group: Group; me: Profile; allJoins: GroupJoin[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 w-full">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-sky-300 px-3 py-1.5 text-sm font-medium text-sky-800 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-950"
      >
        {open ? "채팅방 닫기" : "💬 채팅방 열기"}
      </button>
      {open ? <ChatRoom group={group} me={me} allJoins={allJoins} /> : null}
    </div>
  );
}

function ChatRoom({ group, me, allJoins }: { group: Group; me: Profile; allJoins: GroupJoin[] }) {
  const stored = useGroupChat(group.id);
  const now = useNow();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const listRef = useRef<HTMLUListElement>(null);
  const messages = stored === undefined ? [] : visibleMessages(stored, now);

  // 새 글이 보이면 맨 아래로 내린다.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 화면에 있는 목록이 아니라 저장소의 최신 글을 기준으로 이어 붙인다.
    const latest = parseChat(getChatJson(group.id));
    const result = sendMessage(me, group, latest, allJoins, text, new Date().getTime());
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (!saveChat(group.id, result.messages)) {
      setError("이 브라우저에서는 글을 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
      return;
    }
    setError("");
    setText("");
  }

  return (
    <div className="surface mt-2 flex max-w-xl flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">⚠ {CHAT_NOTICE}</p>
      <ul ref={listRef} aria-label="채팅 글" className="flex h-56 flex-col gap-2 overflow-y-auto">
        {messages.length === 0 ? (
          <li className="m-auto text-sm text-zinc-500 dark:text-zinc-400">아직 글이 없어요. 먼저 인사해 보세요.</li>
        ) : (
          messages.map((m) => {
            const mine = !m.virtual && m.sender === me.nickname;
            return (
              <li key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{mine ? "나" : m.sender}</span>
                <span
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-3 py-1.5 text-sm ${
                    mine ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                  }`}
                >
                  {m.text}
                </span>
              </li>
            );
          })
        )}
      </ul>
      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(event) => {
            setText(event.target.value);
            setError("");
          }}
          placeholder="메시지를 입력하세요"
          aria-label="메시지"
          className="min-w-0 flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button type="submit" className="rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
          보내기
        </button>
      </form>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        시연용이에요: 글은 이 브라우저에만 저장되고, 가상 참여자는 정해진 인사말로 답해요.
      </p>
    </div>
  );
}
