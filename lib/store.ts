// Design Ref: §5 저장 위치 — 내 프로필·요청·일정·지표는 브라우저 저장소에 닉네임별로 저장한다.
// Plan: 작업 4번 "닉네임만 입력하는 실습용 간단 로그인"에서 이 파일을 만들었고,
//   작업 5번 "프로필 입력 화면"에서 프로필 저장을 추가했다.
//   요청·일정을 저장하는 기능은 이후 작업(14번, 18번 등)에서 이어서 추가한다.
//
// 브라우저 저장소(localStorage)는 사생활 보호 모드나 저장소 차단 상황에서 오류를 낼 수 있어서,
// 모든 읽기·쓰기를 try/catch로 감싸고 실패해도 화면이 깨지지 않게 한다.
// 이 파일의 함수는 브라우저에서만 호출한다. (서버에서 부르면 아무 일도 하지 않고 null을 돌려준다)

import { DISTRICTS, GOALS, LEVELS, PARTNER_CONDITIONS, SLOTS, SPORTS, STYLES, type Profile } from "./options";

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
