// Design Ref: §3.4 매칭 — 화면에서 이 닉네임의 보낸 요청 목록을 읽는 훅, 시간이 흐르면 상태가 바뀌도록 현재 시각도 준다.
// Plan: 작업 14번 "매칭 요청"
import { useMemo, useSyncExternalStore } from "react";
import type { UserRecord } from "./metrics";
import type { MatchRequest, Schedule } from "./options";
import {
  getAllUsersSnapshot,
  getProgramSeenJson,
  getRequestsJson,
  getScheduleDraftJson,
  getSchedulesJson,
  parseAllUsers,
  parseProgramSeen,
  parseRequests,
  parseScheduleDraft,
  parseSchedules,
  subscribeAllUsers,
  subscribeProgramSeen,
  subscribeRequests,
  subscribeScheduleDraft,
  subscribeSchedules,
  type ScheduleDraft,
} from "./store";

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

/** 이 닉네임의 일정 목록. undefined는 아직 브라우저 저장소를 읽기 전이라는 뜻이다. */
export function useSchedules(nickname: string | null): Schedule[] | undefined {
  const json = useSyncExternalStore(
    subscribeSchedules,
    () => (nickname === null ? null : getSchedulesJson(nickname)),
    () => undefined,
  );
  return useMemo(() => (json === undefined ? undefined : parseSchedules(json)), [json]);
}

/** 장소 화면을 다녀오는 동안 보관한 일정 입력 임시 값. (undefined는 읽기 전, null은 없음) */
export function useScheduleDraft(nickname: string | null): ScheduleDraft | null | undefined {
  const json = useSyncExternalStore(
    subscribeScheduleDraft,
    () => (nickname === null ? null : getScheduleDraftJson(nickname)),
    () => undefined,
  );
  return useMemo(() => (json === undefined ? undefined : parseScheduleDraft(json)), [json]);
}

/** 이 브라우저의 모든 닉네임 기록. undefined는 아직 브라우저 저장소를 읽기 전이라는 뜻이다. (지표 합산용) */
export function useAllUsers(): UserRecord[] | undefined {
  const snapshot = useSyncExternalStore(subscribeAllUsers, getAllUsersSnapshot, () => undefined);
  return useMemo(() => (snapshot === undefined ? undefined : parseAllUsers(snapshot)), [snapshot]);
}

/** AI 프로그램을 화면에서 본 후보의 id 목록. undefined는 아직 브라우저 저장소를 읽기 전이라는 뜻이다. */
export function useProgramSeen(nickname: string | null): string[] | undefined {
  const json = useSyncExternalStore(
    subscribeProgramSeen,
    () => (nickname === null ? null : getProgramSeenJson(nickname)),
    () => undefined,
  );
  return useMemo(() => (json === undefined ? undefined : parseProgramSeen(json)), [json]);
}

// 현재 시각은 모든 화면이 함께 쓰는 하나의 값으로 둔다. (서버가 만드는 첫 화면에서는 시각을 모르므로 0으로 둔다)
let lastTick = 0;

function subscribeTick(callback: () => void): () => void {
  const timer = setInterval(() => {
    lastTick = Date.now();
    callback();
  }, 1000);
  return () => clearInterval(timer);
}

function getTick(): number {
  // 처음 읽을 때만 현재 시각을 넣고, 그 뒤에는 1초마다 바뀐 값을 그대로 돌려준다.
  if (lastTick === 0) lastTick = Date.now();
  return lastTick;
}

/** 1초마다 바뀌는 현재 시각(밀리초). 남은 시간·3초 뒤 수락 표시를 갱신하는 데 쓴다. */
export function useNow(): number {
  return useSyncExternalStore(subscribeTick, getTick, () => 0);
}
