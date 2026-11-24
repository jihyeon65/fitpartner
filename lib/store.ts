// Design Ref: §5 저장 위치 — 내 프로필·요청·일정·지표는 브라우저 저장소에 닉네임별로 저장한다.
// Plan: 작업 4번 "닉네임만 입력하는 실습용 간단 로그인"에서 이 파일을 만들었고,
//   작업 5번 "프로필 입력 화면"에서 프로필 저장을 추가했다.
//   작업 14번 "매칭 요청"에서 요청 저장을 추가했고, 작업 18번 "일정 관리"에서 일정 저장을 추가했다.
//
// 브라우저 저장소(localStorage)는 사생활 보호 모드나 저장소 차단 상황에서 오류를 낼 수 있어서,
// 모든 읽기·쓰기를 try/catch로 감싸고 실패해도 화면이 깨지지 않게 한다.
// 이 파일의 함수는 브라우저에서만 호출한다. (서버에서 부르면 아무 일도 하지 않고 null을 돌려준다)

import {
  DISTRICTS,
  GOALS,
  LEVELS,
  MODES,
  PARTNER_CONDITIONS,
  SLOTS,
  SPORTS,
  STYLES,
  type Group,
  type GroupJoin,
  type MatchRequest,
  type Profile,
  type Schedule,
  type SchedulePlace,
  type Slot,
} from "./options";
import { sanitizeMessages, type ChatMessage } from "./chat";
import { sanitizeGroupJoins, sanitizeGroups } from "./groups";
import type { UserRecord } from "./metrics";

/** 현재 닉네임을 저장하는 키 */
const NICKNAME_KEY = "fitpartner:nickname";

/** 같은 탭 안에서 닉네임이 바뀌었음을 알리는 이벤트 이름 (다른 탭은 storage 이벤트로 알 수 있다) */
const NICKNAME_EVENT = "fitpartner:nickname-changed";

/** 닉네임 최대 글자 수 */
export const NICKNAME_MAX_LENGTH = 12;

/** 앞뒤 공백을 없애고, 연속된 공백은 하나로 줄인다. */
export function normalizeNickname(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

/** 정리된 닉네임이 1~12자인지 확인한다. */
export function isValidNickname(nickname: string): boolean {
  return nickname.length >= 1 && nickname.length <= NICKNAME_MAX_LENGTH;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** 저장된 현재 닉네임. 없거나 저장소를 쓸 수 없으면 null */
export function getNickname(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const saved = storage.getItem(NICKNAME_KEY);
    if (saved === null) return null;
    const nickname = normalizeNickname(saved);
    return isValidNickname(nickname) ? nickname : null;
  } catch {
    return null;
  }
}

/**
 * 닉네임을 저장한다.
 * @returns 저장된 닉네임. 규칙(1~12자)에 맞지 않거나 저장에 실패하면 null
 */
export function setNickname(raw: string): string | null {
  const nickname = normalizeNickname(raw);
  if (!isValidNickname(nickname)) return null;
  const storage = getStorage();
  if (!storage) return null;
  try {
    storage.setItem(NICKNAME_KEY, nickname);
  } catch {
    return null;
  }
  window.dispatchEvent(new Event(NICKNAME_EVENT));
  return nickname;
}

/**
 * 닉네임이 바뀌면 callback을 부른다. (React의 useSyncExternalStore에 넘기는 구독 함수)
 * @returns 구독을 끝내는 함수
 */
export function subscribeNickname(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === NICKNAME_KEY) callback();
  };
  window.addEventListener(NICKNAME_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(NICKNAME_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// ───────────── 내 프로필 (닉네임별로 따로 저장) ─────────────

/** 같은 탭 안에서 프로필이 바뀌었음을 알리는 이벤트 이름 */
const PROFILE_EVENT = "fitpartner:profile-changed";

/** 닉네임마다 다른 키로 저장해서, 닉네임을 바꿔도 서로의 프로필이 섞이지 않게 한다. */
function profileKey(nickname: string): string {
  return `fitpartner:user:${encodeURIComponent(nickname)}:profile`;
}

/** 저장된 프로필 원문(JSON 글자). 없거나 저장소를 쓸 수 없으면 null */
export function getProfileJson(nickname: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(profileKey(nickname));
  } catch {
    return null;
  }
}

function isOneOf<T extends readonly (string | number)[]>(list: T, value: unknown): value is T[number] {
  return (list as readonly unknown[]).includes(value);
}

function isListOf<T extends readonly string[]>(list: T, value: unknown): value is T[number][] {
  return Array.isArray(value) && value.every((item) => isOneOf(list, item));
}

/**
 * 저장된 글자를 프로필로 바꾼다.
 * 값이 선택지 목록 밖이거나 항목이 빠져 있으면 믿지 않고 null을 돌려준다. (저장소 값은 직접 고칠 수 있으므로)
 */
export function parseProfile(json: string | null): Profile | null {
  if (json === null) return null;
  try {
    const data: unknown = JSON.parse(json);
    if (typeof data !== "object" || data === null) return null;
    const p = data as Record<string, unknown>;
    if (typeof p.id !== "string" || typeof p.nickname !== "string") return null;
    if (!isOneOf(SPORTS, p.sport) || !isOneOf(LEVELS, p.level) || !isOneOf(GOALS, p.goal)) return null;
    if (!isOneOf(STYLES, p.style) || !isOneOf(DISTRICTS, p.district)) return null;
    if (!isListOf(SLOTS, p.slots) || p.slots.length === 0) return null;
    if (!isListOf(PARTNER_CONDITIONS, p.partnerConditions)) return null;
    return {
      id: p.id,
      nickname: p.nickname,
      sport: p.sport,
      level: p.level,
      goal: p.goal,
      style: p.style,
      slots: p.slots,
      district: p.district,
      // 진행 방식이 없던 옛 프로필(작업 21번 이전에 저장한 것)은 오프라인으로 읽는다.
      modes: isListOf(MODES, p.modes) && p.modes.length > 0 ? p.modes : ["오프라인"],
      partnerConditions: p.partnerConditions,
      profileCompletedAt: typeof p.profileCompletedAt === "string" ? p.profileCompletedAt : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * 프로필을 이 닉네임의 저장소에 저장한다.
 * @returns 저장에 성공하면 true
 */
export function saveProfile(profile: Profile): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(profileKey(profile.nickname), JSON.stringify(profile));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(PROFILE_EVENT));
  return true;
}

/**
 * 프로필이 바뀌면 callback을 부른다. (useSyncExternalStore에 넘기는 구독 함수)
 * @returns 구독을 끝내는 함수
 */
export function subscribeProfile(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.endsWith(":profile")) callback();
  };
  window.addEventListener(PROFILE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PROFILE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// ───────────── 보낸 매칭 요청 (닉네임별로 따로 저장) ─────────────
// Plan: 작업 14번 "매칭 요청"

/** 같은 탭 안에서 매칭 요청이 바뀌었음을 알리는 이벤트 이름 */
const REQUESTS_EVENT = "fitpartner:requests-changed";

function requestsKey(nickname: string): string {
  return `fitpartner:user:${encodeURIComponent(nickname)}:requests`;
}

/** 저장된 매칭 요청 원문(JSON 글자). 없거나 저장소를 쓸 수 없으면 null */
export function getRequestsJson(nickname: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(requestsKey(nickname));
  } catch {
    return null;
  }
}

/** 저장된 글자를 매칭 요청 목록으로 바꾼다. 모양이 맞지 않는 항목은 버린다. (저장소 값은 직접 고칠 수 있으므로) */
export function parseRequests(json: string | null): MatchRequest[] {
  if (json === null) return [];
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    const result: MatchRequest[] = [];
    for (const item of data) {
      if (typeof item !== "object" || item === null) continue;
      const r = item as Record<string, unknown>;
      if (
        typeof r.id !== "string" ||
        typeof r.fromNickname !== "string" ||
        typeof r.toProfileId !== "string" ||
        !isOneOf(["대기", "수락", "만료"] as const, r.status) ||
        typeof r.createdAt !== "string" ||
        typeof r.expiresAt !== "string" ||
        Number.isNaN(Date.parse(r.createdAt)) ||
        Number.isNaN(Date.parse(r.expiresAt))
      ) {
        continue;
      }
      result.push({
        id: r.id,
        fromNickname: r.fromNickname,
        toProfileId: r.toProfileId,
        // 만나는 방식이 없던 옛 요청은 오프라인으로 읽는다.
        mode: isOneOf(MODES, r.mode) ? r.mode : "오프라인",
        status: r.status,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        satisfaction: typeof r.satisfaction === "boolean" ? r.satisfaction : undefined,
        programHelpful: typeof r.programHelpful === "boolean" ? r.programHelpful : undefined,
      });
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * 이 닉네임의 매칭 요청 목록 전체를 저장한다.
 * @returns 저장에 성공하면 true
 */
export function saveRequests(nickname: string, requests: MatchRequest[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(requestsKey(nickname), JSON.stringify(requests));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(REQUESTS_EVENT));
  return true;
}

/** 매칭 요청이 바뀌면 callback을 부른다. (useSyncExternalStore에 넘기는 구독 함수) */
export function subscribeRequests(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.endsWith(":requests")) callback();
  };
  window.addEventListener(REQUESTS_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(REQUESTS_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// ───────────── AI 프로그램을 화면에서 본 후보 (닉네임별) ─────────────
// Plan: 작업 15번 "매칭 완료 화면" — AI 프로그램이 화면에 보이지 않은 경우에는 "프로그램 도움 기대도" 문항을 숨기고
//   지표에서 제외해야 해서, 추천 카드에서 프로그램을 실제로 보여준 후보를 기록해 둔다.

const PROGRAM_SEEN_EVENT = "fitpartner:program-seen-changed";

function programSeenKey(nickname: string): string {
  return `fitpartner:user:${encodeURIComponent(nickname)}:program-seen`;
}

/** 저장된 원문(JSON 글자). 없거나 저장소를 쓸 수 없으면 null */
export function getProgramSeenJson(nickname: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(programSeenKey(nickname));
  } catch {
    return null;
  }
}

/** 저장된 글자를 후보 id 목록으로 바꾼다. 글자가 아닌 값은 버린다. */
export function parseProgramSeen(json: string | null): string[] {
  if (json === null) return [];
  try {
    const data: unknown = JSON.parse(json);
    return Array.isArray(data) ? data.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

/** 이 후보의 AI 프로그램을 화면에 보여줬다고 기록한다. (이미 기록돼 있으면 아무것도 하지 않는다) */
export function markProgramSeen(nickname: string, candidateId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const seen = parseProgramSeen(storage.getItem(programSeenKey(nickname)));
    if (seen.includes(candidateId)) return;
    storage.setItem(programSeenKey(nickname), JSON.stringify([...seen, candidateId]));
  } catch {
    return;
  }
  window.dispatchEvent(new Event(PROGRAM_SEEN_EVENT));
}

/** 기록이 바뀌면 callback을 부른다. (useSyncExternalStore에 넘기는 구독 함수) */
export function subscribeProgramSeen(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.endsWith(":program-seen")) callback();
  };
  window.addEventListener(PROGRAM_SEEN_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PROGRAM_SEEN_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// ───────────── 일정 (닉네임별로 따로 저장) ─────────────
// Plan: 작업 18번 "일정 관리"

const SCHEDULES_EVENT = "fitpartner:schedules-changed";

function schedulesKey(nickname: string): string {
  return `fitpartner:user:${encodeURIComponent(nickname)}:schedules`;
}

/** 저장된 일정 원문(JSON 글자). 없거나 저장소를 쓸 수 없으면 null */
export function getSchedulesJson(nickname: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(schedulesKey(nickname));
  } catch {
    return null;
  }
}

function parsePlace(value: unknown): SchedulePlace | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const p = value as Record<string, unknown>;
  if (typeof p.id !== "string" || typeof p.name !== "string" || typeof p.address !== "string") return undefined;
  return { id: p.id, name: p.name, address: p.address };
}

/** 저장된 글자를 일정 목록으로 바꾼다. 모양이 맞지 않는 항목은 버린다. */
export function parseSchedules(json: string | null): Schedule[] {
  if (json === null) return [];
  try {
    const data: unknown = JSON.parse(json);
    if (!Array.isArray(data)) return [];
    const result: Schedule[] = [];
    for (const item of data) {
      if (typeof item !== "object" || item === null) continue;
      const s = item as Record<string, unknown>;
      if (
        typeof s.matchId !== "string" ||
        typeof s.ownerNickname !== "string" ||
        !isOneOf(SLOTS, s.slot) ||
        typeof s.date !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(s.date) ||
        typeof s.myDone !== "boolean" ||
        typeof s.partnerDone !== "boolean"
      ) {
        continue;
      }
      result.push({
        matchId: s.matchId,
        ownerNickname: s.ownerNickname,
        mode: isOneOf(MODES, s.mode) ? s.mode : "오프라인",
        slot: s.slot,
        date: s.date,
        myDone: s.myDone,
        partnerDone: s.partnerDone,
        doneAt: typeof s.doneAt === "string" && !Number.isNaN(Date.parse(s.doneAt)) ? s.doneAt : undefined,
        // 온라인 일정에는 장소가 없다.
        place: s.mode === "온라인" ? undefined : parsePlace(s.place),
      });
    }
    return result;
  } catch {
    return [];
  }
}

/** 이 닉네임의 일정 목록 전체를 저장한다. 성공하면 true */
export function saveSchedules(nickname: string, schedules: Schedule[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(schedulesKey(nickname), JSON.stringify(schedules));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(SCHEDULES_EVENT));
  return true;
}

/** 일정이 바뀌면 callback을 부른다. (useSyncExternalStore에 넘기는 구독 함수) */
export function subscribeSchedules(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.endsWith(":schedules")) callback();
  };
  window.addEventListener(SCHEDULES_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SCHEDULES_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// ───────────── 일정 입력 임시 값 (장소 화면을 다녀오는 동안 보관) ─────────────
// Design Ref: §4.4 — 일정 화면에서 선택 모드로 갈 때 어느 매칭인지(matchId)와 고른 시설은 브라우저 저장소의 임시 값으로 넘긴다.

/** 일정을 등록하던 중 장소 화면에 다녀올 때 남겨 두는 값 */
export interface ScheduleDraft {
  matchId: string;
  slot?: Slot;
  date?: string;
  place?: SchedulePlace;
}

const DRAFT_EVENT = "fitpartner:schedule-draft-changed";

function draftKey(nickname: string): string {
  return `fitpartner:user:${encodeURIComponent(nickname)}:schedule-draft`;
}

/** 저장된 임시 값 원문(JSON 글자). 없거나 저장소를 쓸 수 없으면 null */
export function getScheduleDraftJson(nickname: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(draftKey(nickname));
  } catch {
    return null;
  }
}

/** 저장된 글자를 임시 값으로 바꾼다. 모양이 맞지 않으면 null */
export function parseScheduleDraft(json: string | null): ScheduleDraft | null {
  if (json === null) return null;
  try {
    const d: unknown = JSON.parse(json);
    if (typeof d !== "object" || d === null) return null;
    const r = d as Record<string, unknown>;
    if (typeof r.matchId !== "string") return null;
    return {
      matchId: r.matchId,
      slot: isOneOf(SLOTS, r.slot) ? r.slot : undefined,
      date: typeof r.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : undefined,
      place: parsePlace(r.place),
    };
  } catch {
    return null;
  }
}

/** 임시 값을 저장하거나(null이면 지운다) 한다. */
export function saveScheduleDraft(nickname: string, draft: ScheduleDraft | null): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    if (draft === null) storage.removeItem(draftKey(nickname));
    else storage.setItem(draftKey(nickname), JSON.stringify(draft));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(DRAFT_EVENT));
  return true;
}

/** 임시 값이 바뀌면 callback을 부른다. */
export function subscribeScheduleDraft(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.endsWith(":schedule-draft")) callback();
  };
  window.addEventListener(DRAFT_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(DRAFT_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// ───────────── 이 브라우저의 모든 닉네임 기록 (지표 합산용) ─────────────
// Design Ref: §3.7 지표 — 이 브라우저에 저장된 모든 닉네임의 기록을 합산해 보여준다.
// Plan: 작업 19번 "지표 기록"

const USER_KEY_PATTERN = /^fitpartner:user:([^:]+):(profile|requests|schedules)$/;

/**
 * 모든 닉네임의 프로필·요청·일정 원문을 하나의 글자로 모은다. (닉네임 순서로 정렬해서, 기록이 같으면 항상 같은 글자가 나온다)
 * 저장소를 쓸 수 없으면 null
 */
export function getAllUsersSnapshot(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const grouped: Record<string, Record<string, string>> = {};
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      const match = key ? USER_KEY_PATTERN.exec(key) : null;
      if (!key || !match) continue;
      const value = storage.getItem(key);
      if (value !== null) (grouped[match[1]] ??= {})[match[2]] = value;
    }
    return JSON.stringify(Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))));
  } catch {
    return null;
  }
}

/** 모아 둔 글자를 닉네임별 기록 목록으로 바꾼다. */
export function parseAllUsers(snapshot: string | null): UserRecord[] {
  if (snapshot === null) return [];
  try {
    const data: unknown = JSON.parse(snapshot);
    if (typeof data !== "object" || data === null) return [];
    return Object.entries(data as Record<string, Record<string, string>>).map(([encoded, raw]) => ({
      nickname: decodeURIComponent(encoded),
      profile: parseProfile(raw.profile ?? null),
      requests: parseRequests(raw.requests ?? null),
      schedules: parseSchedules(raw.schedules ?? null),
    }));
  } catch {
    return [];
  }
}

/** 프로필·요청·일정 중 하나라도 바뀌면 callback을 부른다. */
export function subscribeAllUsers(callback: () => void): () => void {
  const stops = [subscribeProfile(callback), subscribeRequests(callback), subscribeSchedules(callback)];
  return () => stops.forEach((stop) => stop());
}

// ───────────── 모임과 모임 참여 신청 (v0.8, 작업 25번) ─────────────
// 내가 만든 모임은 이 브라우저의 모든 닉네임이 함께 보도록 한 곳에 두고, 참여 신청은 닉네임별로 저장한다.

const GROUPS_KEY = "fitpartner:groups";
const GROUPS_EVENT = "fitpartner:groups-changed";

/** 저장된 모임 원문(JSON 글자). 없거나 저장소를 쓸 수 없으면 null */
export function getGroupsJson(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(GROUPS_KEY);
  } catch {
    return null;
  }
}

/** 저장된 글자를 모임 목록으로 바꾼다. (저장소 값은 직접 고칠 수 있으므로 올바른 모임만 남긴다) */
export function parseGroups(json: string | null): Group[] {
  if (json === null) return [];
  try {
    return sanitizeGroups(JSON.parse(json));
  } catch {
    return [];
  }
}

/** 모임 목록 전체를 저장한다. 성공하면 true */
export function saveGroups(groups: Group[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(GROUPS_KEY, JSON.stringify(groups));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(GROUPS_EVENT));
  return true;
}

/** 모임이 바뀌면 callback을 부른다. */
export function subscribeGroups(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === GROUPS_KEY) callback();
  };
  window.addEventListener(GROUPS_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(GROUPS_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

const GROUP_JOINS_EVENT = "fitpartner:group-joins-changed";

function groupJoinsKey(nickname: string): string {
  return `fitpartner:user:${encodeURIComponent(nickname)}:group-joins`;
}

/** 이 닉네임의 참여 신청 원문(JSON 글자). 없거나 저장소를 쓸 수 없으면 null */
export function getGroupJoinsJson(nickname: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(groupJoinsKey(nickname));
  } catch {
    return null;
  }
}

/** 저장된 글자를 참여 신청 목록으로 바꾼다. */
export function parseGroupJoins(json: string | null): GroupJoin[] {
  if (json === null) return [];
  try {
    return sanitizeGroupJoins(JSON.parse(json));
  } catch {
    return [];
  }
}

/** 이 닉네임의 참여 신청 목록 전체를 저장한다. 성공하면 true */
export function saveGroupJoins(nickname: string, joins: GroupJoin[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(groupJoinsKey(nickname), JSON.stringify(joins));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(GROUP_JOINS_EVENT));
  return true;
}

/** 이 브라우저의 모든 닉네임의 참여 신청 원문을 하나의 글자로 모은다. (정원 계산용, 닉네임 순서로 정렬) */
export function getAllGroupJoinsSnapshot(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raws: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && /^fitpartner:user:[^:]+:group-joins$/.test(key)) raws.push(`${key}\u0000${storage.getItem(key) ?? ""}`);
    }
    return JSON.stringify(raws.sort());
  } catch {
    return null;
  }
}

/** 모아 둔 글자를 참여 신청 목록으로 바꾼다. */
export function parseAllGroupJoins(snapshot: string | null): GroupJoin[] {
  if (snapshot === null) return [];
  try {
    const raws: unknown = JSON.parse(snapshot);
    if (!Array.isArray(raws)) return [];
    return raws.flatMap((raw) => (typeof raw === "string" ? parseGroupJoins(raw.split("\u0000")[1] ?? null) : []));
  } catch {
    return [];
  }
}

/** 참여 신청이 바뀌면 callback을 부른다. */
export function subscribeGroupJoins(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.endsWith(":group-joins")) callback();
  };
  window.addEventListener(GROUP_JOINS_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(GROUP_JOINS_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// ───────────── 온라인 모임 채팅방 (이 브라우저의 모든 닉네임이 같은 방을 본다) ─────────────

const CHAT_EVENT = "fitpartner:chat-changed";

function chatKey(groupId: string): string {
  return `fitpartner:chat:${encodeURIComponent(groupId)}`;
}

/** 저장된 채팅 글 원문(JSON 글자). 없거나 저장소를 쓸 수 없으면 null */
export function getChatJson(groupId: string): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(chatKey(groupId));
  } catch {
    return null;
  }
}

/** 저장된 글자를 채팅 글 목록으로 바꾼다. (저장소 값은 직접 고칠 수 있으므로 올바른 글만 남긴다) */
export function parseChat(json: string | null): ChatMessage[] {
  if (json === null) return [];
  try {
    return sanitizeMessages(JSON.parse(json));
  } catch {
    return [];
  }
}

/** 한 모임의 채팅 글 전체를 저장한다. 성공하면 true */
export function saveChat(groupId: string, messages: ChatMessage[]): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(chatKey(groupId), JSON.stringify(messages));
  } catch {
    return false;
  }
  window.dispatchEvent(new Event(CHAT_EVENT));
  return true;
}

/** 채팅 글이 바뀌면 callback을 부른다. */
export function subscribeChat(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key.startsWith("fitpartner:chat:")) callback();
  };
  window.addEventListener(CHAT_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHAT_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

// ───────────── 내 기록 지우기 (공용 PC 대비) ─────────────

/**
 * 이 닉네임의 기록을 이 브라우저에서 모두 지운다: 프로필·요청·일정·임시 값·참여 신청, 내가 만든 모임,
 * 내가 보낸 채팅 글, 현재 닉네임. 다른 닉네임의 기록과 가상 데이터는 건드리지 않는다. 성공하면 true
 */
export function clearUserData(nickname: string): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    const prefix = `fitpartner:user:${encodeURIComponent(nickname)}:`;
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));

    // 내가 만든 모임과 내가 보낸 채팅 글
    const groups = parseGroups(storage.getItem(GROUPS_KEY));
    const mine = groups.filter((g) => g.hostNickname === nickname);
    storage.setItem(GROUPS_KEY, JSON.stringify(groups.filter((g) => g.hostNickname !== nickname)));
    const chatKeys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith("fitpartner:chat:")) chatKeys.push(key);
    }
    for (const key of chatKeys) {
      const kept = parseChat(storage.getItem(key)).filter((m) => m.virtual || m.sender !== nickname);
      if (kept.length === 0) storage.removeItem(key);
      else storage.setItem(key, JSON.stringify(kept));
    }
    // 내가 만든 모임의 채팅방은 통째로 지운다.
    mine.forEach((g) => storage.removeItem(chatKey(g.id)));

    if (storage.getItem(NICKNAME_KEY) === nickname) storage.removeItem(NICKNAME_KEY);
  } catch {
    return false;
  }
  for (const name of [
    NICKNAME_EVENT,
    PROFILE_EVENT,
    REQUESTS_EVENT,
    PROGRAM_SEEN_EVENT,
    SCHEDULES_EVENT,
    DRAFT_EVENT,
    GROUPS_EVENT,
    GROUP_JOINS_EVENT,
    CHAT_EVENT,
  ]) {
    window.dispatchEvent(new Event(name));
  }
  return true;
}
