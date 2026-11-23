// Design Ref: §7 API 명세 — POST /api/recommend 는 필수 항목이 비었거나 선택지 밖의 값이면 400, "OO을 선택해 주세요"
// Plan: 작업 9번 "추천 결과 화면(AI 없이 먼저)"
//
// 요청으로 들어온 값은 믿지 않고 선택지 목록과 맞는지 하나씩 확인한다. (서버·브라우저 어디서든 쓸 수 있는 계산 코드)
import {
  DISTRICTS,
  GOALS,
  LEVELS,
  PARTNER_CONDITIONS,
  SLOTS,
  SPORTS,
  STYLES,
  type Profile,
} from "./options";

export type ProfileCheck = { ok: true; profile: Profile } | { ok: false; missing: string[] };

function isOneOf<T extends readonly (string | number)[]>(list: T, value: unknown): value is T[number] {
  return (list as readonly unknown[]).includes(value);
}

function isListOf<T extends readonly string[]>(list: T, value: unknown): value is T[number][] {
  return Array.isArray(value) && value.every((item) => isOneOf(list, item));
}

/**
 * 요청 본문을 프로필로 바꾼다.
 * 파트너 조건을 뺀 항목이 비었거나 선택지 밖의 값이면, 문제가 있는 항목 이름을 모아서 돌려준다.
 */
export function checkProfileInput(input: unknown): ProfileCheck {
  const p: Record<string, unknown> =
    typeof input === "object" && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : {};

  const missing: string[] = [];
  if (!isOneOf(SPORTS, p.sport)) missing.push("종목");
  if (!isOneOf(LEVELS, p.level)) missing.push("실력");
  if (!isOneOf(GOALS, p.goal)) missing.push("목적");
  if (!isOneOf(STYLES, p.style)) missing.push("성향");
  if (!isListOf(SLOTS, p.slots) || p.slots.length === 0) missing.push("가능 시간");
  if (!isOneOf(DISTRICTS, p.district)) missing.push("희망 지역");

  // 파트너 조건은 선택 항목이다. 없으면 빈 목록으로 보고, 있는데 선택지 밖의 값이면 거절한다.
  const conditions = p.partnerConditions ?? [];
  if (!isListOf(PARTNER_CONDITIONS, conditions)) missing.push("파트너 조건");

  if (
    missing.length > 0 ||
    !isOneOf(SPORTS, p.sport) ||
    !isOneOf(LEVELS, p.level) ||
    !isOneOf(GOALS, p.goal) ||
    !isOneOf(STYLES, p.style) ||
    !isListOf(SLOTS, p.slots) ||
    !isOneOf(DISTRICTS, p.district) ||
    !isListOf(PARTNER_CONDITIONS, conditions)
  ) {
    return { ok: false, missing };
  }

  // 닉네임·id는 추천에서 "나 자신 제외"에만 쓰이므로 글자일 때만 받는다.
  const nickname = typeof p.nickname === "string" ? p.nickname : "";
  return {
    ok: true,
    profile: {
      id: typeof p.id === "string" ? p.id : `user:${nickname}`,
      nickname,
      sport: p.sport,
      level: p.level,
      goal: p.goal,
      style: p.style,
      slots: p.slots,
      district: p.district,
      partnerConditions: conditions,
    },
  };
}
