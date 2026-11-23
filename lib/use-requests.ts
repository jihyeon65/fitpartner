// Design Ref: §3.4 매칭 — 화면에서 이 닉네임의 보낸 요청 목록을 읽는 훅, 시간이 흐르면 상태가 바뀌도록 현재 시각도 준다.
// Plan: 작업 14번 "매칭 요청"
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { MatchRequest } from "./options";
import { getRequestsJson, parseRequests, subscribeRequests } from "./store";

/**
 * 이 닉네임으로 보낸 매칭 요청 목록.
 * undefined는 서버가 만든 첫 화면이라 아직 브라우저 저장소를 읽기 전이라는 뜻이다.
 */
export function useRequests(nickname: string | null): MatchRequest[] | undefined {
  const json = useSyncExternalStore(
    subscribeRequests,
    () => (nickname === null ? null : getRequestsJson(nickname)),
    () => undefined,
  );
  return useMemo(() => (json === undefined ? undefined : parseRequests(json)), [json]);
}

/** 일정한 간격으로 바뀌는 현재 시각(밀리초). 남은 시간·3초 뒤 수락 표시를 갱신하는 데 쓴다. */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
