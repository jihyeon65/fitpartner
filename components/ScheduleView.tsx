"use client";

// Design Ref: §3.6 일정 관리 — 두 사람이 겹치는 가능 시간 목록, 시간대·날짜를 정해 일정 등록,
//   장소 고르기 버튼(선택 사항: 장소 화면의 선택 모드에서 시설을 골라 이름·주소를 일정에 저장),
//   등록된 일정마다 "운동 완료" 체크(내 쪽·상대 쪽 각각, 가상 프로필 쪽은 시연자가 대신 체크)
// Design Ref: §4.4 — 어느 매칭인지(matchId)와 고른 시설은 브라우저 저장소의 임시 값으로 장소 화면과 주고받는다.
// Plan: 작업 18번 "일정 관리", 작업 23번(온라인 매칭은 장소 고르기를 숨기고 "온라인"으로 저장)
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { overlappingSlots } from "@/lib/filter";
import { currentStatus } from "@/lib/match";
import type { MatchRequest, Profile, Schedule, SchedulePlace, Slot } from "@/lib/options";
import { VIRTUAL_PROFILES } from "@/lib/profiles";
import { createSchedule, isCompleted, setDone, todayString } from "@/lib/schedule";
import {
  getScheduleDraftJson,
  getSchedulesJson,
  parseScheduleDraft,
  parseSchedules,
  saveScheduleDraft,
  saveSchedules,
} from "@/lib/store";
import { useNickname } from "@/lib/use-nickname";
import { useProfile } from "@/lib/use-profile";
import { useNow, useRequests, useScheduleDraft, useSchedules } from "@/lib/use-requests";
import { SingleChoice } from "./ChoiceGroup";
import GroupScheduleSection from "./GroupScheduleSection";

export default function ScheduleView() {
  const nickname = useNickname();
  const profile = useProfile(nickname ?? null);
  const requests = useRequests(nickname ?? null);
  const schedules = useSchedules(nickname ?? null);
  const draft = useScheduleDraft(nickname ?? null);
  const now = useNow();
  const paramMatch = useSearchParams().get("match");
  const [pickedId, setPickedId] = useState<string | null>(null);

  // 서버가 만든 첫 화면에서는 아직 브라우저 저장소를 모르므로 아무것도 그리지 않는다.
  if (nickname === undefined || profile === undefined || requests === undefined || schedules === undefined || draft === undefined) {
    return null;
  }
  if (nickname === null) return <Guide text="먼저 닉네임을 정해 주세요." href="/" button="닉네임 정하러 가기" />;
  if (profile === null) {
    return <Guide text="아직 프로필이 없어요. 프로필을 입력해야 가능한 시간을 비교할 수 있어요." href="/profile" button="프로필 입력하러 가기" />;
  }

  // 수락된 매칭만 일정을 잡을 수 있다.
  const accepted = requests
    .filter((r) => currentStatus(r, now) === "수락")
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  if (accepted.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <Guide text="수락된 매칭이 아직 없어요. 매칭이 수락되면 여기서 일정을 잡을 수 있어요." href="/matches" button="매칭 보러 가기" />
        <GroupScheduleSection me={profile} />
      </div>
    );
  }

  const selectedId = [pickedId, paramMatch, draft?.matchId].find((id) => id && accepted.some((r) => r.id === id)) ?? null;
  const selected = accepted.find((r) => r.id === selectedId);

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">일정을 잡을 매칭</h2>
        <ul className="flex flex-wrap gap-2">
          {accepted.map((request) => {
            const partner = VIRTUAL_PROFILES.find((p) => p.id === request.toProfileId);
            const selectedNow = request.id === selectedId;
            return (
              <li key={request.id}>
                <button
                  type="button"
                  aria-pressed={selectedNow}
                  onClick={() => setPickedId(request.id)}
                  className={`rounded-full border px-4 py-1.5 text-sm ${
                    selectedNow
                      ? "border-emerald-600 bg-emerald-600 font-medium text-white"
                      : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  {partner?.nickname ?? "알 수 없는 상대"}
                  {schedules.some((s) => s.matchId === request.id) ? " ✓" : ""}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selected ? (
        <MatchSchedule
          key={selected.id}
          me={profile}
          request={selected}
          schedules={schedules}
          draft={draft?.matchId === selected.id ? draft : null}
          onRegistered={() => setPickedId(selected.id)}
        />
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400">위에서 매칭을 고르면 가능한 시간과 일정을 볼 수 있어요.</p>
      )}

      <GroupScheduleSection me={profile} />
    </div>
  );
}

function MatchSchedule({
  me,
  request,
  schedules,
  draft,
  onRegistered,
}: {
  me: Profile;
  request: MatchRequest;
  schedules: Schedule[];
  draft: { slot?: Slot; date?: string; place?: SchedulePlace } | null;
  onRegistered: () => void;
}) {
  const partner = VIRTUAL_PROFILES.find((p) => p.id === request.toProfileId);
  const schedule = schedules.find((s) => s.matchId === request.id);
  if (!partner) return <p className="text-zinc-600 dark:text-zinc-400">상대 정보를 찾지 못했어요.</p>;
  if (schedule) return <ScheduleCard me={me} partner={partner} schedule={schedule} />;
  return <ScheduleForm me={me} partner={partner} request={request} draft={draft} onRegistered={onRegistered} />;
}

function ScheduleForm({
  me,
  partner,
  request,
  draft,
  onRegistered,
}: {
  me: Profile;
  partner: Profile;
  request: MatchRequest;
  draft: { slot?: Slot; date?: string; place?: SchedulePlace } | null;
  onRegistered: () => void;
}) {
  const router = useRouter();
  const common = overlappingSlots(me, partner);
  // 장소 화면을 다녀온 경우에는 그때 남겨 둔 값으로 시작한다.
  const [slot, setSlot] = useState<Slot | null>(draft?.slot ?? null);
  const [date, setDate] = useState(draft?.date ?? "");
  // 고른 장소는 임시 값(저장소)이 기준이다. 장소 화면을 다녀온 뒤 이 화면이 이전 상태 그대로 다시 보일 수 있어서, 처음 값만 믿지 않는다.
  // 온라인 매칭은 장소가 없다. (장소는 오프라인에서만 고른다)
  const online = request.mode === "온라인";
  const place = online ? undefined : draft?.place;
  const [error, setError] = useState("");
  const today = todayString();

  function goPickPlace() {
    // 일정 입력 중이던 값은 장소 화면을 다녀온 뒤에도 남도록 임시 값으로 저장해 둔다.
    saveScheduleDraft(me.nickname, { matchId: request.id, slot: slot ?? undefined, date: date || undefined, place });
    router.push(`/places?pick=${encodeURIComponent(request.id)}`);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // 화면에 있는 목록이 아니라 저장소의 최신 일정을 기준으로 다시 확인한다.
    const latest = parseSchedules(getSchedulesJson(me.nickname));
    const result = createSchedule(
      { matchId: request.id, ownerNickname: me.nickname, mode: request.mode, slot, date, place },
      common,
      latest,
      today,
    );
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (!saveSchedules(me.nickname, [...latest, result.schedule])) {
      setError("이 브라우저에서는 일정을 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
      return;
    }
    // 등록이 끝났으니 임시 값은 지우고, 임시 값이 없어져도 이 매칭이 계속 선택돼 있게 한다.
    onRegistered();
    if (parseScheduleDraft(getScheduleDraftJson(me.nickname))?.matchId === request.id) saveScheduleDraft(me.nickname, null);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{partner.nickname}님과 일정 잡기</h2>

      {common.length === 0 ? (
        <p className="text-amber-700 dark:text-amber-400">두 사람이 함께 가능한 시간이 없어요.</p>
      ) : (
        <SingleChoice
          legend="함께 가능한 시간"
          hint="두 사람의 가능 시간이 겹치는 시간대예요."
          options={common}
          value={slot}
          onChange={(next) => {
            setSlot(next);
            setError("");
          }}
        />
      )}

      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        운동 날짜
        <input
          type="date"
          value={date}
          min={today}
          onChange={(event) => {
            setDate(event.target.value);
            setError("");
          }}
          className="w-fit rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>

      {online ? (
        <p className="rounded-md bg-sky-50 p-3 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-200">
          온라인으로 만나는 매칭이에요. 장소 없이 온라인으로 저장돼요.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">운동 장소 (선택)</span>
          {place ? (
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              {place.name} · {place.address}
            </p>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">장소를 고르지 않아도 일정을 등록할 수 있어요.</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={goPickPlace}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              장소 고르기
            </button>
            {place ? (
              <button
                type="button"
                onClick={() => saveScheduleDraft(me.nickname, { matchId: request.id, slot: slot ?? undefined, date: date || undefined })}
                className="rounded-md px-3 py-1.5 text-sm text-zinc-600 hover:underline dark:text-zinc-400">
                장소 빼기
              </button>
            ) : null}
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={common.length === 0}
        className="w-fit rounded-md bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
      >
        일정 등록
      </button>
    </form>
  );
}

function ScheduleCard({ me, partner, schedule }: { me: Profile; partner: Profile; schedule: Schedule }) {
  const [error, setError] = useState("");

  function toggle(who: "me" | "partner") {
    const latest = parseSchedules(getSchedulesJson(me.nickname));
    const next = latest.map((s) =>
      s.matchId === schedule.matchId ? setDone(s, who, !(who === "me" ? s.myDone : s.partnerDone), new Date().toISOString()) : s,
    );
    setError(saveSchedules(me.nickname, next) ? "" : "이 브라우저에서는 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
  }

  return (
    <div className="flex max-w-2xl flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{partner.nickname}님과의 일정</h2>
      <p className="text-zinc-800 dark:text-zinc-200">
        {schedule.date} · {schedule.slot}
      </p>
      <p className="text-sm text-zinc-700 dark:text-zinc-300">
        {schedule.mode === "온라인"
          ? "방식: 온라인 (각자 있는 곳에서 화상·메신저로 함께 운동해요)"
          : `장소: ${schedule.place ? `${schedule.place.name} · ${schedule.place.address}` : "정하지 않았어요"}`}
      </p>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">운동 완료</span>
        <div className="flex flex-wrap gap-2">
          <DoneButton label="내 운동 완료" done={schedule.myDone} onClick={() => toggle("me")} />
          <DoneButton label={`${partner.nickname} 운동 완료`} done={schedule.partnerDone} onClick={() => toggle("partner")} />
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">가상 프로필인 상대 쪽은 시연하는 분이 대신 체크해요.</p>
      </div>

      {isCompleted(schedule) ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">두 사람 모두 운동을 마쳤어요. 🎉</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function DoneButton({ label, done, onClick }: { label: string; done: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={done}
      onClick={onClick}
      className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
        done
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      }`}
    >
      {done ? "✓ " : ""}
      {label}
    </button>
  );
}

function Guide({ text, href, button }: { text: string; href: string; button: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
      <p className="text-zinc-700 dark:text-zinc-300">{text}</p>
      <Link href={href} className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
        {button}
      </Link>
    </div>
  );
}
