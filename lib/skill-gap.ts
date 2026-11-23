// Design Ref: §4.1.1 점수 계산식 — "비슷한 실력"은 실력 차이 0~1단계
// PRD 5번 M2 — 0~1단계는 "비슷한 실력 매칭"으로 표시하고 우선 추천,
//   2단계 이상 차이 나면 서로에게 적합한 연습 방식을 제안한다. (규칙 7: 연습 방식 1개 이상 반드시 제시)
// Plan: 작업 8번 "실력 차이 판정"
//
// 실력 차이에 관한 기준은 이 파일 한 곳에서만 정한다.
// (필수 조건 거르기 lib/filter.ts, 점수 계산 lib/score.ts, 이후 AI 분석이 모두 이 기준을 가져다 쓴다)
import type { Profile } from "./options";

/** "비슷한 실력"으로 보는 실력 차이의 최대값 (0~1단계) */
export const SIMILAR_LEVEL_MAX_GAP = 1;

/** 화면에 붙이는 "비슷한 실력" 배지 글자 */
export const SIMILAR_LEVEL_BADGE = "비슷한 실력 매칭";

/** 두 사람의 실력 차이(단계). 항상 0 이상이다. */
export function levelGap(a: Pick<Profile, "level">, b: Pick<Profile, "level">): number {
  return Math.abs(a.level - b.level);
}

/** 실력 차이가 0~1단계인지 (비슷한 실력인지) */
export function isSimilarLevel(a: Pick<Profile, "level">, b: Pick<Profile, "level">): boolean {
  return levelGap(a, b) <= SIMILAR_LEVEL_MAX_GAP;
}

/** 두 사람의 실력 차이 판정 결과 */
export interface SkillGapJudgement {
  /** 실력 차이 (단계) */
  gap: number;
  /** 0~1단계면 true → "비슷한 실력 매칭" 배지를 붙이고 우선 추천한다. */
  isSimilar: boolean;
  /** 2단계 이상이면 true → 서로에게 적합한 연습 방식을 1개 이상 제안해야 한다. */
  needsPracticeAdvice: boolean;
  /** 비슷한 실력일 때 화면에 붙이는 배지 글자. 그렇지 않으면 null */
  badge: string | null;
  /** 실력이 더 높은 쪽. 같으면 null (연습 방식 제안에서 "누가 누구에게 맞추는지" 정할 때 쓴다) */
  higher: "me" | "partner" | null;
}

/** 나와 상대의 실력 차이를 판정한다. */
export function judgeSkillGap(me: Pick<Profile, "level">, partner: Pick<Profile, "level">): SkillGapJudgement {
  const gap = levelGap(me, partner);
  const isSimilar = gap <= SIMILAR_LEVEL_MAX_GAP;
  return {
    gap,
    isSimilar,
    needsPracticeAdvice: !isSimilar,
    badge: isSimilar ? SIMILAR_LEVEL_BADGE : null,
    higher: me.level === partner.level ? null : me.level > partner.level ? "me" : "partner",
  };
}
