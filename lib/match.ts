// Design Ref: §4.3 매칭 흐름 — 요청 저장(만료 시각 = 지금 + EXPIRE_MINUTES), 가상 프로필 중 5명은 "대기"로 남고 나머지는 3초 뒤 자동 수락
// PRD 5번 매칭 규칙 — 요청은 7일 뒤 만료(시연은 1분), 동시 요청은 "대기" 상태만 세서 최대 3명
// Plan: 작업 14번 "매칭 요청", 작업 23번(요청에 만나는 방식 기록)
//
// 요청의 "지금 상태"는 저장해 둔 글자가 아니라 시각을 보고 계산한다. 그래서 화면을 닫았다 열어도 같은 결과가 나오고,
// 3초 뒤 수락·만료가 타이머에 의존하지 않는다.
import type { MatchRequest, Mode, Profile } from "./options";
import { NON_ACCEPTING_PROFILE_IDS } from "./profiles";

/**
 * 요청이 만료되기까지의 시간(분). 코드에서 이 값 한 곳만 바꿔서 전환한다.
 *   10080 = 7일 (실제 규칙) / 1 = 1분 (시연용: 기다리지 않고 만료를 확인하기 위해)
 */
export const EXPIRE_MINUTES = 1;

/** 동시에 "대기" 상태로 둘 수 있는 요청 수 */
export const MAX_PENDING_REQUESTS = 3;

/** 가상 프로필이 요청을 자동으로 수락하기까지의 시간(밀리초) */
export const AUTO_ACCEPT_DELAY_MS = 3000;

export type RequestStatus = MatchRequest["status"];

/** 지금 시각 기준 요청의 상태. (수락 → 만료 → 대기 순서로 판단) */
export function currentStatus(request: MatchRequest, nowMs: number): RequestStatus {
  if (request.status === "수락") return "수락";
  const acceptsAutomatically = !(NON_ACCEPTING_PROFILE_IDS as readonly string[]).includes(request.toProfileId);
  if (acceptsAutomatically && nowMs >= Date.parse(request.createdAt) + AUTO_ACCEPT_DELAY_MS) return "수락";
  if (nowMs >= Date.parse(request.expiresAt)) return "만료";
  return "대기";
}

/** 만료까지 남은 시간(밀리초). 이미 지났으면 0 */
export function remainingMs(request: MatchRequest, nowMs: number): number {
  return Math.max(0, Date.parse(request.expiresAt) - nowMs);
}

/** 남은 시간을 "N분 N초" 같은 글자로 만든다. (하루 이상이면 "N일 N시간") */
export function formatRemaining(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}일 ${hours}시간`;
  if (hours > 0) return `${hours}시간 ${minutes}분`;
  if (minutes > 0) return `${minutes}분 ${seconds}초`;
  return `${seconds}초`;
}

/** 지금 "대기" 상태인 요청 수 (수락·만료된 요청은 세지 않는다) */
export function pendingCount(requests: readonly MatchRequest[], nowMs: number): number {
  return requests.filter((r) => currentStatus(r, nowMs) === "대기").length;
}

/** 이 후보에게 이미 보낸 요청 중 아직 유효한(대기·수락) 것. 만료된 요청은 다시 보낼 수 있으므로 제외한다. */
export function activeRequestTo(
  requests: readonly MatchRequest[],
  profileId: string,
  nowMs: number,
): MatchRequest | undefined {
  return requests.find((r) => r.toProfileId === profileId && currentStatus(r, nowMs) !== "만료");
}

export type CreateRequestResult =
  | { ok: true; request: MatchRequest }
  | { ok: false; reason: "already-requested" | "too-many-pending" };

/** 새 요청을 만든다. 이미 요청했거나 대기 중인 요청이 3명이면 만들지 않는다. */
export function createRequest(
  me: Pick<Profile, "nickname">,
  candidateId: string,
  existing: readonly MatchRequest[],
  nowMs: number,
  mode: Mode,
): CreateRequestResult {
  if (activeRequestTo(existing, candidateId, nowMs)) return { ok: false, reason: "already-requested" };
  if (pendingCount(existing, nowMs) >= MAX_PENDING_REQUESTS) return { ok: false, reason: "too-many-pending" };
  return {
    ok: true,
    request: {
      id: `req-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
      fromNickname: me.nickname,
      toProfileId: candidateId,
      mode,
      status: "대기",
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + EXPIRE_MINUTES * 60_000).toISOString(),
    },
  };
}
