// Design Ref: §3.7 지표 — 파트너 탐색 시간, 추천 만족도, 프로그램 도움 기대도, 일정 등록률, 운동 완료율, 초보자 비율(가상 프로필 20명 기준)
// PRD 3번 성공 기준·측정 방법 — 실습에서는 한 브라우저에 저장된 모든 닉네임의 기록을 합산해 보여준다.
// Plan: 작업 19번 "지표 기록"
//
// 화면 없이 계산만 하는 코드라서, 같은 입력이면 항상 같은 결과가 나온다.
import { currentStatus } from "./match";
import type { MatchRequest, Profile, Schedule } from "./options";
import { isCompleted } from "./schedule";

/** 한 닉네임이 이 브라우저에 남긴 기록 */
export interface UserRecord {
  nickname: string;
  profile: Profile | null;
  requests: MatchRequest[];
  schedules: Schedule[];
}

/** "2주 안에 운동 완료" 기준 (밀리초) */
export const COMPLETION_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/** 지표 하나: 값과 계산에 쓴 숫자, 목표 */
export interface Metric {
  /** 계산할 자료가 없으면 null */
  value: number | null;
  /** 비율 지표의 분자 (조건을 만족한 건수). 시간 지표는 null */
  count: number | null;
  /** 계산에 쓴 전체 건수 (응답 수, 매칭 수, 사용자 수 등) */
  total: number;
  /** 목표값. 비율은 % 이상, 탐색 시간은 초 이하 */
  target: number;
  /** 목표를 달성했는지. 계산할 자료가 없으면 null */
  met: boolean | null;
}

export interface Metrics {
  /** 파트너 탐색 시간 평균 (초) — 프로필 입력 완료(추천 받기 처음 누름)~첫 매칭 요청 */
  searchSeconds: Metric;
  /** 추천 만족도 (%) — "추천이 잘 맞았나요?"에 응답한 요청 중 "예" */
  satisfaction: Metric;
  /** 프로그램 도움 기대도 (%) — "프로그램이 도움이 될 것 같나요?"에 응답한 요청 중 "예" */
  programHelpful: Metric;
  /** 일정 등록률 (%) — 수락된 매칭 중 일정을 등록한 비율 */
  scheduleRate: Metric;
  /** 운동 완료율 (%) — 수락된 매칭 중 매칭 후 2주 안에 두 사람 모두 운동 완료를 체크한 비율 */
  completionRate: Metric;
  /** 초보자 비율 (%) — 가상 프로필 중 실력 1~2단계 */
  beginnerRate: Metric;
}

/** 목표 (PRD 3번 성공 기준) */
export const TARGETS = {
  searchSeconds: 10 * 60,
  satisfaction: 80,
  programHelpful: 70,
  scheduleRate: 60,
  completionRate: 60,
  beginnerRate: 40,
} as const;

/** 실력 1~2단계는 운동 초보자 */
const BEGINNER_MAX_LEVEL = 2;

function percent(count: number, total: number): number | null {
  return total === 0 ? null : Math.round((count / total) * 1000) / 10;
}

function ratioMetric(count: number, total: number, target: number): Metric {
  const value = percent(count, total);
  return { value, count, total, target, met: value === null ? null : value >= target };
}

/** 사용자들의 기록과 가상 프로필로 지표 6개를 계산한다. */
export function computeMetrics(users: readonly UserRecord[], virtualProfiles: readonly Profile[], nowMs: number): Metrics {
  // 1) 파트너 탐색 시간: 사용자마다 "처음 추천 받기를 누른 시각 → 가장 먼저 보낸 요청 시각"을 구해 평균낸다.
  const seconds: number[] = [];
  for (const user of users) {
    const completedAt = user.profile?.profileCompletedAt;
    if (!completedAt || user.requests.length === 0) continue;
    const firstRequest = Math.min(...user.requests.map((r) => Date.parse(r.createdAt)));
    const diff = (firstRequest - Date.parse(completedAt)) / 1000;
    if (Number.isFinite(diff) && diff >= 0) seconds.push(diff);
  }
  const avg = seconds.length === 0 ? null : Math.round(seconds.reduce((a, b) => a + b, 0) / seconds.length);
  const searchSeconds: Metric = {
    value: avg,
    count: null,
    total: seconds.length,
    target: TARGETS.searchSeconds,
    met: avg === null ? null : avg <= TARGETS.searchSeconds,
  };

  const allRequests = users.flatMap((u) => u.requests);

  // 2~3) 만족도·도움 기대도: 응답한 요청만 센다. (프로그램을 보지 않아 문항이 숨겨진 요청은 응답이 비어 있어 자동으로 빠진다)
  const satisfactionAnswers = allRequests.filter((r) => r.satisfaction !== undefined);
  const helpfulAnswers = allRequests.filter((r) => r.programHelpful !== undefined);
  const satisfaction = ratioMetric(
    satisfactionAnswers.filter((r) => r.satisfaction === true).length,
    satisfactionAnswers.length,
    TARGETS.satisfaction,
  );
  const programHelpful = ratioMetric(
    helpfulAnswers.filter((r) => r.programHelpful === true).length,
    helpfulAnswers.length,
    TARGETS.programHelpful,
  );

  // 4~5) 일정 등록률·운동 완료율: 수락된 매칭(매칭 완료)을 기준으로 센다.
  let accepted = 0;
  let withSchedule = 0;
  let completedInTwoWeeks = 0;
  for (const user of users) {
    for (const request of user.requests) {
      if (currentStatus(request, nowMs) !== "수락") continue;
      accepted += 1;
      const schedule = user.schedules.find((s) => s.matchId === request.id);
      if (!schedule) continue;
      withSchedule += 1;
      if (isCompleted(schedule) && schedule.doneAt) {
        const elapsed = Date.parse(schedule.doneAt) - Date.parse(request.createdAt);
        if (elapsed <= COMPLETION_WINDOW_MS) completedInTwoWeeks += 1;
      }
    }
  }

  // 6) 초보자 비율: 가상 프로필 20명 기준
  const beginners = virtualProfiles.filter((p) => p.level <= BEGINNER_MAX_LEVEL).length;

  return {
    searchSeconds,
    satisfaction,
    programHelpful,
    scheduleRate: ratioMetric(withSchedule, accepted, TARGETS.scheduleRate),
    completionRate: ratioMetric(completedInTwoWeeks, accepted, TARGETS.completionRate),
    beginnerRate: ratioMetric(beginners, virtualProfiles.length, TARGETS.beginnerRate),
  };
}
