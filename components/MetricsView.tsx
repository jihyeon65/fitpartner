"use client";

// Design Ref: §3.7 지표 — 파트너 탐색 시간, 추천 만족도, 프로그램 도움 기대도, 일정 등록률, 운동 완료율, 초보자 비율(가상 프로필 25명 기준)을 숫자로 표시.
//   이 브라우저에 저장된 모든 닉네임의 기록을 합산해 보여준다. (한 브라우저에서 닉네임을 바꿔 가며 시연)
// Plan: 작업 19번 "지표 기록"
import { buildSeedGroups, confirmedJoinTotal } from "@/lib/groups";
import { computeMetrics, type Metric } from "@/lib/metrics";
import { VIRTUAL_PROFILES } from "@/lib/profiles";
import { todayString } from "@/lib/schedule";
import { useAllGroupJoins, useAllUsers, useNow, useUserGroups } from "@/lib/use-requests";
import { useMemo } from "react";

/** 초를 "N분 N초" 글자로 */
function formatSeconds(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes > 0 ? `${minutes}분 ${rest}초` : `${rest}초`;
}

export default function MetricsView() {
  const users = useAllUsers();
  const userGroups = useUserGroups();
  const allJoins = useAllGroupJoins();
  const now = useNow();
  const day = todayString(new Date(now));
  const seeds = useMemo(() => buildSeedGroups(Date.parse(`${day}T12:00:00+09:00`)), [day]);

  // 서버가 만든 첫 화면에서는 아직 브라우저 저장소를 모르므로 아무것도 그리지 않는다.
  if (users === undefined || userGroups === undefined || allJoins === undefined) return null;
  const groupJoins = confirmedJoinTotal(allJoins, [...seeds, ...userGroups], now);

  const metrics = computeMetrics(users, VIRTUAL_PROFILES, now);
  const percentValue = (m: Metric) => (m.value === null ? null : `${m.value}%`);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        이 브라우저에 저장된 모든 닉네임({users.length}명)의 기록을 합산한 값이에요.
      </p>
      <ul className="grid gap-4 sm:grid-cols-2">
        <Card
          title="파트너 탐색 시간"
          value={metrics.searchSeconds.value === null ? null : formatSeconds(metrics.searchSeconds.value)}
          metric={metrics.searchSeconds}
          goal="10분 이내"
          detail={`평균 · ${metrics.searchSeconds.total}명 기준`}
          how="프로필 입력 후 [추천 받기]를 처음 누른 때부터 첫 매칭 요청까지"
        />
        <Card
          title="추천 만족도"
          value={percentValue(metrics.satisfaction)}
          metric={metrics.satisfaction}
          goal="80% 이상"
          detail={`${metrics.satisfaction.count}/${metrics.satisfaction.total}건이 "잘 맞았다"`}
          how={'매칭 완료 화면의 "추천이 잘 맞았나요?" 응답 중 "예"'}
        />
        <Card
          title="프로그램 도움 기대도"
          value={percentValue(metrics.programHelpful)}
          metric={metrics.programHelpful}
          goal="70% 이상"
          detail={`${metrics.programHelpful.count}/${metrics.programHelpful.total}건이 "도움이 될 것 같다"`}
          how="AI 프로그램을 본 경우의 응답만 계산해요"
        />
        <Card
          title="일정 등록률"
          value={percentValue(metrics.scheduleRate)}
          metric={metrics.scheduleRate}
          goal="60% 이상"
          detail={`매칭 완료 ${metrics.scheduleRate.total}건 중 ${metrics.scheduleRate.count}건이 일정 등록`}
          how="2주를 기다릴 수 없어서 일정 등록까지 마친 비율로 확인해요"
        />
        <Card
          title="운동 완료율"
          value={percentValue(metrics.completionRate)}
          metric={metrics.completionRate}
          goal="60% 이상"
          detail={`매칭 완료 ${metrics.completionRate.total}건 중 ${metrics.completionRate.count}건이 2주 안에 완료`}
          how="두 사람 모두 운동 완료를 체크한 매칭이에요"
        />
        <Card
          title="초보자 비율"
          value={percentValue(metrics.beginnerRate)}
          metric={metrics.beginnerRate}
          goal="40% 이상"
          detail={`가상 프로필 ${metrics.beginnerRate.total}명 중 ${metrics.beginnerRate.count}명이 실력 1~2단계`}
          how="가상 프로필 25명 기준이에요"
        />
      </ul>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        참고: 모임 참여 {groupJoins}건 (위 6개 지표는 1대1 매칭만 계산하고, 모임은 넣지 않아요.)
      </p>
    </div>
  );
}

function Card({
  title,
  value,
  metric,
  goal,
  detail,
  how,
}: {
  title: string;
  value: string | null;
  metric: Metric;
  goal: string;
  detail: string;
  how: string;
}) {
  return (
    <li className="surface tilt flex flex-col gap-1 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2>
        {metric.met === null ? null : (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              metric.met
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
            }`}
          >
            {metric.met ? "목표 달성" : "목표 미달"}
          </span>
        )}
      </div>
      {value === null ? (
        <p className="text-2xl font-bold text-zinc-400 dark:text-zinc-600">아직 기록이 없어요</p>
      ) : (
        <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">{value}</p>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">목표 {goal}</p>
      {value === null ? null : <p className="text-sm text-zinc-700 dark:text-zinc-300">{detail}</p>}
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{how}</p>
    </li>
  );
}
