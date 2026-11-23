// Design Ref: §3.6 일정 관리 — 시간대를 고르고 날짜를 정해 일정 등록, 장소는 선택 사항, "운동 완료" 체크(내 쪽·상대 쪽 각각)
// Design Ref: §5 Schedule — 일정을 등록한 사용자(ownerNickname), 완료 체크 시각(doneAt, 2주 안 완료 계산용)
// Plan: 작업 18번 "일정 관리"
//
// 화면 없이 계산만 하는 코드라서, 같은 입력이면 항상 같은 결과가 나온다.
import type { Schedule, SchedulePlace, Slot } from "./options";

/** 날짜 글자(YYYY-MM-DD)를 실제 달력 날짜로 읽는다. 형식이 틀리거나 없는 날짜(예: 2월 30일)면 null */
function parseDate(date: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const parsed = new Date(year, month - 1, day);
  const isSame = parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
  return isSame ? parsed : null;
}

/** 오늘 날짜를 "YYYY-MM-DD" 글자로 (이 컴퓨터의 시간대 기준) */
export function todayString(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 시간대의 "평일/주말"이 그 날짜의 요일과 맞는지 (예: "평일 저녁"은 월~금 날짜만) */
export function slotMatchesDate(slot: Slot, date: string): boolean {
  const parsed = parseDate(date);
  if (!parsed) return false;
  const isWeekend = parsed.getDay() === 0 || parsed.getDay() === 6;
  return slot.startsWith("주말") ? isWeekend : !isWeekend;
}

export type CreateScheduleResult = { ok: true; schedule: Schedule } | { ok: false; message: string };

/**
 * 일정을 만든다.
 * @param allowedSlots 두 사람이 함께 가능한 시간대 (이 안에서만 고를 수 있다)
 * @param existing 이미 등록된 일정들 (같은 매칭에는 하나만 등록한다)
 */
export function createSchedule(
  input: { matchId: string; ownerNickname: string; slot: Slot | null; date: string; place?: SchedulePlace },
  allowedSlots: readonly Slot[],
  existing: readonly Schedule[],
  today: string,
): CreateScheduleResult {
  const { matchId, ownerNickname, slot, date, place } = input;
  if (existing.some((s) => s.matchId === matchId)) return { ok: false, message: "이미 일정을 등록한 매칭이에요." };
  if (!slot || !allowedSlots.includes(slot)) return { ok: false, message: "함께 가능한 시간대를 골라 주세요." };
  if (!parseDate(date)) return { ok: false, message: "날짜를 골라 주세요." };
  if (date < today) return { ok: false, message: "오늘 이후의 날짜를 골라 주세요." };
  if (!slotMatchesDate(slot, date)) {
    const kind = slot.startsWith("주말") ? "주말" : "평일";
    return { ok: false, message: `"${slot}"은 ${kind} 날짜만 고를 수 있어요.` };
  }
  return {
    ok: true,
    schedule: { matchId, ownerNickname, slot, date, myDone: false, partnerDone: false, ...(place ? { place } : {}) },
  };
}

/** 두 사람이 모두 운동 완료를 체크했는지 */
export function isCompleted(schedule: Pick<Schedule, "myDone" | "partnerDone">): boolean {
  return schedule.myDone && schedule.partnerDone;
}

/**
 * 내 쪽 또는 상대 쪽의 "운동 완료"를 체크하거나 푼다.
 * 완료 시각(doneAt)은 두 쪽이 모두 체크된 순간에 남기고, 하나라도 풀리면 지운다. (2주 안 완료 계산용)
 */
export function setDone(schedule: Schedule, who: "me" | "partner", done: boolean, nowIso: string): Schedule {
  const next: Schedule = { ...schedule, [who === "me" ? "myDone" : "partnerDone"]: done };
  const { doneAt: previous, ...withoutDoneAt } = next;
  if (!isCompleted(next)) return withoutDoneAt;
  return { ...withoutDoneAt, doneAt: previous ?? nowIso };
}
