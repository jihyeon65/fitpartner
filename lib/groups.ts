// Design Ref: §12.3~12.4 모임 데이터·추천·참여 규칙 (v0.9, 1대다수 모임)
//   - 추천: 모임의 조건을 "모임 대표 프로필"로 만들어 기존 거르기·점수 코드를 그대로 재사용한다.
//   - 참여 신청: 정원이 남아 있을 때만, 동시에 "대기"인 신청은 최대 3개. 가상 호스트는 1대1과 같은 규칙(3초 뒤 참여, 대기 프로필은 대기)
//   - 내가 만든 모임: 3초마다 조건에 맞는 가상 프로필 1명이 참여한다. 시각으로 계산해서 화면을 닫았다 열어도 같은 결과가 나온다.
//   - AI 분석은 모임에 붙이지 않는다. 점수와 일치 조건만 보여준다.
// Plan: 작업 24번 "모임 데이터와 추천(코드)"
//
// 화면 없이 계산만 하는 코드라서, 같은 입력이면 항상 같은 결과가 나온다.
import { matchMeetMode } from "./filter";
import { AUTO_ACCEPT_DELAY_MS, EXPIRE_MINUTES, MAX_PENDING_REQUESTS } from "./match";
import {
  DISTRICTS,
  GOALS,
  GROUP_CAPACITIES,
  LEVELS,
  MODES,
  SLOTS,
  SPORTS,
  STYLES,
  type Group,
  type GroupCapacity,
  type GroupJoin,
  type Mode,
  type Profile,
} from "./options";
import { NON_ACCEPTING_PROFILE_IDS, VIRTUAL_PROFILES } from "./profiles";
import { recommend } from "./score";
import { slotMatchesDate, todayString } from "./schedule";

/** 모임 참여 신청이 동시에 "대기"일 수 있는 최대 개수 (1대1 요청과 따로 센다) */
export const MAX_PENDING_JOINS = MAX_PENDING_REQUESTS;

/** 모임 제목은 자유 입력이 아니라 선택값으로 자동으로 만든다. */
export function groupTitle(group: Pick<Group, "sport" | "slot" | "mode">): string {
  return `${group.sport} ${group.slot} ${group.mode} 모임`;
}

/** 내가 만든 모임인지 (호스트가 이 사용자의 프로필 id이거나 닉네임이 같은 경우) */
export function isHostedBy(group: Pick<Group, "hostId" | "hostNickname">, me: Pick<Profile, "id" | "nickname">): boolean {
  return group.hostId === me.id || group.hostNickname === me.nickname;
}

// ───────────── 가상 모임 ─────────────

/** 오늘부터 2일 뒤 이후로, 시간대(평일/주말)에 맞는 가장 가까운 날짜 */
function nextDateFor(slot: Group["slot"], nowMs: number): string {
  for (let offset = 2; offset < 12; offset += 1) {
    const date = todayString(new Date(nowMs + offset * 24 * 60 * 60 * 1000));
    if (slotMatchesDate(slot, date)) return date;
  }
  return todayString(new Date(nowMs + 2 * 24 * 60 * 60 * 1000));
}

/**
 * 가상 모임 6개. 날짜는 "지금 기준 며칠 뒤"로 정해서 항상 앞으로 올 날짜가 된다.
 *  - 호스트는 가상 프로필이고, 모임 조건은 호스트의 프로필과 맞춘다.
 *  - 모임 5번의 호스트(virtual-04)는 매칭을 수락하지 않는 "대기" 프로필이라 참여 신청이 대기로 남는다.
 *  - 모임 2번은 이미 정원이 차 있어서 추천에서 빠지는 것을 시험할 수 있다.
 */
export function buildSeedGroups(nowMs: number): Group[] {
  const createdAt = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
  const seed = (
    n: number,
    hostId: string,
    mode: Mode,
    slot: Group["slot"],
    capacity: GroupCapacity,
    members: string[],
  ): Group => {
    const host = VIRTUAL_PROFILES.find((p) => p.id === hostId);
    if (!host) throw new Error(`가상 호스트를 찾지 못했어요: ${hostId}`);
    return {
      id: `group-seed-${n}`,
      hostId,
      hostNickname: host.nickname,
      sport: host.sport,
      mode,
      district: host.district,
      slot,
      date: nextDateFor(slot, nowMs),
      level: host.level,
      goal: host.goal,
      style: host.style,
      capacity,
      createdAt,
      members,
    };
  };
  return [
    seed(1, "virtual-01", "오프라인", "평일 저녁", 4, ["virtual-02"]),
    seed(2, "virtual-10", "오프라인", "평일 저녁", 3, ["virtual-08", "virtual-11"]),
    seed(3, "virtual-18", "오프라인", "주말 오전", 5, ["virtual-15"]),
    seed(4, "virtual-23", "온라인", "평일 저녁", 6, ["virtual-22", "virtual-21"]),
    seed(5, "virtual-04", "온라인", "평일 저녁", 4, []),
    seed(6, "virtual-24", "오프라인", "주말 오후", 4, []),
  ];
}

// ───────────── 정원·참여자 계산 ─────────────

/** 모임에 맞는 가상 프로필 (종목·시간대·진행 방식이 맞고 대기 프로필이 아님). 내가 만든 모임의 자동 참여자 후보다. */
function eligibleVirtualMembers(group: Group): Profile[] {
  const slotless = { modes: [group.mode], district: group.district };
  return VIRTUAL_PROFILES.filter(
    (p) =>
      p.id !== group.hostId &&
      p.sport === group.sport &&
      p.slots.includes(group.slot) &&
      !(NON_ACCEPTING_PROFILE_IDS as readonly string[]).includes(p.id) &&
      matchMeetMode(slotless, p) === group.mode,
  ).sort((a, b) => a.id.localeCompare(b.id));
}

/** 이 모임에 "참여" 상태인 이 브라우저 사용자 수 (호스트·가상 참여자는 포함하지 않는다) */
function confirmedJoinCount(group: Group, joins: readonly GroupJoin[], nowMs: number): number {
  return joins.filter((j) => j.groupId === group.id && joinStatus(j, group, nowMs) === "참여").length;
}

/**
 * 지금 시각의 가상 참여자 프로필 id 목록.
 *  - 가상 호스트의 모임: 정해 둔 members 그대로
 *  - 내가 만든 모임: 만든 뒤 3초마다 조건에 맞는 가상 프로필 1명씩 (정원이 남는 만큼)
 */
export function virtualMemberIds(group: Group, joins: readonly GroupJoin[], nowMs: number): string[] {
  const room = Math.max(0, group.capacity - 1 - confirmedJoinCount(group, joins, nowMs));
  if (VIRTUAL_PROFILES.some((p) => p.id === group.hostId)) return group.members.slice(0, room);
  const joined = Math.max(0, Math.floor((nowMs - Date.parse(group.createdAt)) / AUTO_ACCEPT_DELAY_MS));
  return eligibleVirtualMembers(group)
    .slice(0, Math.min(joined, room))
    .map((p) => p.id);
}

/** 지금 차 있는 자리 수 (호스트 1 + 가상 참여자 + "참여" 상태인 사용자) */
export function seatsTaken(group: Group, joins: readonly GroupJoin[], nowMs: number): number {
  return 1 + virtualMemberIds(group, joins, nowMs).length + confirmedJoinCount(group, joins, nowMs);
}

/** 남은 자리 수 */
export function seatsLeft(group: Group, joins: readonly GroupJoin[], nowMs: number): number {
  return Math.max(0, group.capacity - seatsTaken(group, joins, nowMs));
}

// ───────────── 참여 신청 ─────────────

/** 모임의 호스트가 신청을 자동으로 받아 주는지. (대기 프로필이 호스트인 모임만 받지 않는다) */
function hostAccepts(group: Group): boolean {
  return !(NON_ACCEPTING_PROFILE_IDS as readonly string[]).includes(group.hostId);
}

/** 지금 시각 기준 참여 신청 상태 (참여 → 만료 → 대기 순서로 판단) */
export function joinStatus(join: GroupJoin, group: Group, nowMs: number): GroupJoin["status"] {
  if (join.status === "참여") return "참여";
  if (hostAccepts(group) && nowMs >= Date.parse(join.createdAt) + AUTO_ACCEPT_DELAY_MS) return "참여";
  if (nowMs >= Date.parse(join.expiresAt)) return "만료";
  return "대기";
}

/** 이 모임에 이미 낸 신청 중 아직 유효한(대기·참여) 것. 만료된 신청은 다시 낼 수 있으므로 제외한다. */
export function activeJoinTo(
  joins: readonly GroupJoin[],
  group: Group,
  nowMs: number,
): GroupJoin | undefined {
  return joins.find((j) => j.groupId === group.id && joinStatus(j, group, nowMs) !== "만료");
}

/** 지금 "대기" 상태인 내 참여 신청 수 (모임을 찾지 못하는 신청은 세지 않는다) */
export function pendingJoinCount(myJoins: readonly GroupJoin[], groups: readonly Group[], nowMs: number): number {
  return myJoins.filter((j) => {
    const group = groups.find((g) => g.id === j.groupId);
    return group !== undefined && joinStatus(j, group, nowMs) === "대기";
  }).length;
}

export type CreateJoinResult =
  | { ok: true; join: GroupJoin }
  | { ok: false; reason: "own-group" | "already-joined" | "full" | "past" | "too-many-pending" };

/**
 * 모임 참여 신청을 만든다.
 * @param myJoins 내 신청 전부, @param allJoins 이 브라우저의 모든 닉네임의 신청(정원 계산용)
 */
export function createJoin(
  me: Pick<Profile, "id" | "nickname">,
  group: Group,
  groups: readonly Group[],
  myJoins: readonly GroupJoin[],
  allJoins: readonly GroupJoin[],
  nowMs: number,
): CreateJoinResult {
  if (isHostedBy(group, me)) return { ok: false, reason: "own-group" };
  if (activeJoinTo(myJoins, group, nowMs)) return { ok: false, reason: "already-joined" };
  if (group.date < todayString(new Date(nowMs))) return { ok: false, reason: "past" };
  if (seatsLeft(group, allJoins, nowMs) <= 0) return { ok: false, reason: "full" };
  if (pendingJoinCount(myJoins, groups, nowMs) >= MAX_PENDING_JOINS) return { ok: false, reason: "too-many-pending" };
  return {
    ok: true,
    join: {
      id: `join-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
      groupId: group.id,
      fromNickname: me.nickname,
      status: "대기",
      createdAt: new Date(nowMs).toISOString(),
      expiresAt: new Date(nowMs + EXPIRE_MINUTES * 60_000).toISOString(),
    },
  };
}

// ───────────── 모임 만들기 ─────────────

export type CreateGroupResult = { ok: true; group: Group } | { ok: false; message: string };

function isOneOf<T extends readonly (string | number)[]>(list: T, value: unknown): value is T[number] {
  return (list as readonly unknown[]).includes(value);
}

/** 모임 만들기 입력 (모두 선택형, 자유 입력란 없음) */
export interface GroupInput {
  sport: unknown;
  mode: unknown;
  district: unknown;
  slot: unknown;
  date: unknown;
  level: unknown;
  goal: unknown;
  style: unknown;
  capacity: unknown;
}

/** 모임을 만든다. 선택지 밖의 값, 지난 날짜, 시간대와 맞지 않는 요일은 거절한다. */
export function createGroup(input: GroupInput, host: Pick<Profile, "id" | "nickname">, nowMs: number): CreateGroupResult {
  const { sport, mode, district, slot, date, level, goal, style, capacity } = input;
  if (!isOneOf(SPORTS, sport)) return { ok: false, message: "종목을 선택해 주세요." };
  if (!isOneOf(MODES, mode)) return { ok: false, message: "진행 방식을 선택해 주세요." };
  if (!isOneOf(DISTRICTS, district)) return { ok: false, message: "구를 선택해 주세요." };
  if (!isOneOf(SLOTS, slot)) return { ok: false, message: "시간대를 선택해 주세요." };
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "날짜를 골라 주세요." };
  if (!isOneOf(LEVELS, level)) return { ok: false, message: "실력을 선택해 주세요." };
  if (!isOneOf(GOALS, goal)) return { ok: false, message: "목적을 선택해 주세요." };
  if (!isOneOf(STYLES, style)) return { ok: false, message: "성향을 선택해 주세요." };
  if (!isOneOf(GROUP_CAPACITIES, capacity)) return { ok: false, message: "정원을 선택해 주세요." };
  if (date < todayString(new Date(nowMs))) return { ok: false, message: "오늘 이후의 날짜를 골라 주세요." };
  if (!slotMatchesDate(slot, date)) {
    const kind = slot.startsWith("주말") ? "주말" : "평일";
    return { ok: false, message: `"${slot}"은 ${kind} 날짜만 고를 수 있어요.` };
  }
  return {
    ok: true,
    group: {
      id: `group-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
      hostId: host.id,
      hostNickname: host.nickname,
      sport,
      mode,
      district,
      slot,
      date,
      level,
      goal,
      style,
      capacity,
      createdAt: new Date(nowMs).toISOString(),
      members: [],
    },
  };
}

/** 바깥에서 온 값(브라우저 저장소·요청 본문)에서 올바른 모임만 골라낸다. 모양이 맞지 않는 항목은 버린다. */
export function sanitizeGroups(value: unknown): Group[] {
  if (!Array.isArray(value)) return [];
  const result: Group[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const g = item as Record<string, unknown>;
    if (
      typeof g.id !== "string" ||
      typeof g.hostId !== "string" ||
      typeof g.hostNickname !== "string" ||
      typeof g.createdAt !== "string" ||
      Number.isNaN(Date.parse(g.createdAt))
    ) {
      continue;
    }
    const made = createGroup(
      { sport: g.sport, mode: g.mode, district: g.district, slot: g.slot, date: g.date, level: g.level, goal: g.goal, style: g.style, capacity: g.capacity },
      { id: g.hostId, nickname: g.hostNickname },
      // 저장돼 있던 모임은 이미 지난 날짜일 수도 있으므로, 날짜의 "지난 날짜" 검사가 걸리지 않게 아주 오래전 시각으로 만든다.
      0,
    );
    if (!made.ok) continue;
    result.push({ ...made.group, id: g.id, createdAt: g.createdAt, members: [] });
  }
  return result;
}

// ───────────── 모임 추천 ─────────────

/** 추천 모임 한 개의 결과 */
export interface GroupRecommendation {
  group: Group;
  /** 적합도 점수. 모임은 시간대가 1개라 시간 점수가 최대 10점이어서 만점은 80점이다. */
  score: number;
  matchedConditions: string[];
  meetMode: Mode;
  /** 60점 이상인 모임이 없어서 점수 기준을 낮춰 보여주는 "참고용" 모임인지 */
  isReference: boolean;
  seatsLeft: number;
  seatsTaken: number;
}

/** 모임의 조건을 "모임 대표 프로필"로 바꿔 기존 거르기·점수 코드를 재사용한다. */
export function groupAsProfile(group: Group): Profile {
  return {
    id: group.id,
    nickname: group.hostNickname,
    sport: group.sport,
    level: group.level,
    goal: group.goal,
    style: group.style,
    slots: [group.slot],
    district: group.district,
    modes: [group.mode],
    partnerConditions: [],
  };
}

/**
 * 나에게 맞는 모임을 점수 높은 순으로 최대 5개 추천한다.
 * 내가 만든 모임, 이미 신청했거나 참여한 모임, 정원이 찬 모임, 지난 날짜 모임은 제외한다.
 * 60점 이상만, 없으면 "참고용"(isReference). 필수 조건(종목·진행 방식 호환·시간대 겹침·파트너 조건)은 1대1과 같다.
 */
export function recommendGroups(
  me: Profile,
  groups: readonly Group[],
  myJoins: readonly GroupJoin[],
  allJoins: readonly GroupJoin[],
  nowMs: number,
): GroupRecommendation[] {
  const today = todayString(new Date(nowMs));
  const available = groups.filter(
    (g) =>
      !isHostedBy(g, me) &&
      g.date >= today &&
      !activeJoinTo(myJoins, g, nowMs) &&
      seatsLeft(g, allJoins, nowMs) > 0,
  );
  return recommend(me, available.map(groupAsProfile)).flatMap((item) => {
    const group = available.find((g) => g.id === item.profile.id);
    if (!group) return [];
    return [
      {
        group,
        score: item.score,
        matchedConditions: item.matchedConditions,
        meetMode: item.meetMode,
        isReference: item.isReference,
        seatsLeft: seatsLeft(group, allJoins, nowMs),
        seatsTaken: seatsTaken(group, allJoins, nowMs),
      },
    ];
  });
}
