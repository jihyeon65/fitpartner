// Design Ref: §4.1.1 점수 계산식 — 필수 조건을 통과한 후보에게만 점수를 매기고, 코드가 아래 식으로 계산한다.
//   가능 시간 겹침 30 · 실력 근접도 25 · 운동 목적 일치 25 · 성향 일치 20 (합계 100점)
// Design Ref: §4.1 추천 흐름 — 60점 이상만 추천, 없으면 점수 기준만 낮춰 "참고용 후보"로 표시, 점수 높은 순 최대 5명
// PRD 5번 M1 규칙 6·7 — 점수는 AI가 아니라 코드가 계산한다.
// Plan: 작업 7번 "적합도 점수 계산"
//
// 화면 없이 계산만 하는 코드라서, 같은 입력이면 항상 같은 결과가 나온다.
import { filterCandidates, matchMeetMode, overlappingSlots } from "./filter";
import type { Mode, Profile } from "./options";
// 실력 차이(단계)를 구하는 기준은 작업 8번에서 만든 lib/skill-gap.ts 한 곳에서만 정한다.
import { levelGap } from "./skill-gap";

/** 이 점수 이상인 후보만 추천한다. */
export const RECOMMEND_MIN_SCORE = 60;

/** 한 번에 보여주는 추천 후보의 최대 인원 */
export const MAX_RECOMMENDATIONS = 5;

/** 항목별 만점 (합계 100점) */
export const SCORE_WEIGHTS = { time: 30, level: 25, goal: 25, style: 20 } as const;

/** 실력 차이 0·1·2단계일 때의 실력 근접도 점수. 3단계 이상 차이 나면 0점이다. */
const LEVEL_GAP_SCORES = [25, 18, 10] as const;

/** 겹치는 시간대 1개마다 10점, 3개 이상이면 30점 (만점) */
const POINTS_PER_OVERLAPPING_SLOT = 10;

/** 항목별 점수 */
export interface ScoreBreakdown {
  time: number;
  level: number;
  goal: number;
  style: number;
  total: number;
}

/** 추천 후보 한 명의 결과 */
export interface Recommendation {
  profile: Profile;
  /** 적합도 점수 (0~100) */
  score: number;
  /** 항목별 점수 */
  breakdown: ScoreBreakdown;
  /** 일치한 조건 (예: "종목", "시간 2개", "실력 비슷함", "목적") */
  matchedConditions: string[];
  /** 실력 차이 (단계) */
  levelGap: number;
  /** 만나는 방식 (오프라인이면 같은 구, 온라인이면 구 상관없음) */
  meetMode: Mode;
  /** 60점 이상인 후보가 없어서 점수 기준을 낮춰 보여주는 "참고용 후보"인지 */
  isReference: boolean;
}

/** 후보 한 명의 점수를 항목별로 계산한다. (필수 조건을 통과한 후보에게 쓰는 것을 전제로 한다) */
export function scoreCandidate(me: Profile, candidate: Profile): ScoreBreakdown {
  const overlap = overlappingSlots(me, candidate).length;
  const time = Math.min(overlap * POINTS_PER_OVERLAPPING_SLOT, SCORE_WEIGHTS.time);
  const level = LEVEL_GAP_SCORES[levelGap(me, candidate)] ?? 0;
  const goal = me.goal === candidate.goal ? SCORE_WEIGHTS.goal : 0;
  const style = me.style === candidate.style ? SCORE_WEIGHTS.style : 0;
  return { time, level, goal, style, total: time + level + goal + style };
}

/** 화면에 보여줄 "일치한 조건" 목록을 만든다. */
function matchedConditionsOf(me: Profile, candidate: Profile): string[] {
  const matched = ["종목"];
  const overlap = overlappingSlots(me, candidate).length;
  if (overlap > 0) matched.push(`시간 ${overlap}개`);
  const gap = levelGap(me, candidate);
  if (gap === 0) matched.push("실력 같음");
  else if (gap === 1) matched.push("실력 비슷함");
  if (me.goal === candidate.goal) matched.push("목적");
  if (me.style === candidate.style) matched.push("성향");
  return matched;
}

/**
 * 후보들 중 내 필수 조건을 통과한 후보에게 점수를 매겨 추천 목록을 만든다.
 *  - 60점 이상인 후보가 있으면 그 후보만, 점수 높은 순으로 최대 5명
 *  - 60점 이상인 후보가 없으면 필수 조건은 그대로 두고 점수 기준만 낮춰, 가장 가까운 후보를 최대 5명 ("참고용 후보")
 *  - 점수가 같으면 실력 차이가 작은 쪽을 앞에 둔다. 그래도 같으면 후보의 원래 순서를 지킨다.
 *  - 필수 조건을 통과한 후보가 없으면 빈 목록
 */
export function recommend(me: Profile, candidates: readonly Profile[]): Recommendation[] {
  const scored = filterCandidates(me, candidates)
    .map((profile) => {
      const breakdown = scoreCandidate(me, profile);
      return {
        profile,
        score: breakdown.total,
        breakdown,
        matchedConditions: matchedConditionsOf(me, profile),
        levelGap: levelGap(me, profile),
        // 필수 조건을 통과한 후보라서 항상 값이 있다.
        meetMode: matchMeetMode(me, profile) ?? "오프라인",
      };
    })
    // 정렬은 원래 순서를 지키는 안정 정렬이라, 점수와 실력 차이가 같으면 후보의 원래 순서가 남는다.
    .sort((a, b) => b.score - a.score || a.levelGap - b.levelGap);

  const recommended = scored.filter((item) => item.score >= RECOMMEND_MIN_SCORE);
  const isReference = recommended.length === 0;
  return (isReference ? scored : recommended)
    .slice(0, MAX_RECOMMENDATIONS)
    .map((item) => ({ ...item, isReference }));
}
