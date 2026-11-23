// Design Ref: §4.1 추천 흐름 처리 1 — 필수 조건 거르기
//   종목 일치 · 가능 시간 1개 이상 겹침 · 같은 구 · 선택한 파트너 조건
// Design Ref: §4.1.1 점수 계산식 — "비슷한 실력"은 실력 차이 0~1단계, "같은 운동 목적만 보기"는 목적이 같은 후보만 통과
// Plan: 작업 6번 "필수 조건 거르기"
//
// 이 파일은 후보를 걸러내기만 한다. 점수는 작업 7번(lib/score.ts)에서 매긴다.
// 화면 없이 계산만 하는 코드라서, 같은 입력이면 항상 같은 결과가 나온다.
import type { Profile, Slot } from "./options";
// "비슷한 실력"(실력 차이 0~1단계) 기준은 작업 8번에서 만든 lib/skill-gap.ts 한 곳에서만 정한다.
import { isSimilarLevel } from "./skill-gap";

/** 두 사람의 가능 시간 중 겹치는 시간대 (내 가능 시간의 순서를 지킨다) */
export function overlappingSlots(a: Pick<Profile, "slots">, b: Pick<Profile, "slots">): Slot[] {
  return a.slots.filter((slot) => b.slots.includes(slot));
}

/** 한 후보가 내 필수 조건을 모두 통과하는지 확인한다. */
export function passesRequiredConditions(me: Profile, candidate: Profile): boolean {
  // 나 자신은 후보가 될 수 없다.
  if (candidate.id === me.id || candidate.nickname === me.nickname) return false;

  // 필수 조건 1: 운동 종목 일치
  if (candidate.sport !== me.sport) return false;

  // 필수 조건 2: 희망 지역이 같은 구
  if (candidate.district !== me.district) return false;

  // 필수 조건 3: 가능 시간이 1개 이상 겹침
  if (overlappingSlots(me, candidate).length === 0) return false;

  // 사용자가 고른 파트너 조건 (필수 조건에 더해 적용)
  if (me.partnerConditions.includes("비슷한 실력만 보기") && !isSimilarLevel(me, candidate)) {
    return false;
  }
  if (me.partnerConditions.includes("같은 운동 목적만 보기") && candidate.goal !== me.goal) {
    return false;
  }

  return true;
}

/**
 * 후보들 중 내 필수 조건을 모두 통과한 후보만 돌려준다.
 * 후보의 원래 순서는 그대로 두고, 넘겨받은 목록은 바꾸지 않는다.
 */
export function filterCandidates(me: Profile, candidates: readonly Profile[]): Profile[] {
  return candidates.filter((candidate) => passesRequiredConditions(me, candidate));
}
