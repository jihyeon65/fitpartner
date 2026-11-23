"use client";

// Design Ref: §3.2 프로필 입력 — 종목·실력·목적·성향·가능 시간·희망 지역·파트너 조건(선택)을 고르고 [추천 받기]
//   - 파트너 조건을 뺀 항목이 비면 "OO을 선택해 주세요" 안내를 보이고 [추천 받기]를 비활성으로 둔다.
//   - [추천 받기]를 처음 누른 시각을 profileCompletedAt에 남긴다. (탐색 시간 측정용, 이후 다시 눌러도 바꾸지 않는다)
// Design Ref: §5 저장 위치 — 프로필은 브라우저 저장소에 닉네임별로 저장한다.
// Plan: 작업 5번 "프로필 입력 화면", 작업 21번 "확장 기초"(진행 방식 선택 추가, 종목에 맨몸운동 추가)
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  DISTRICTS,
  GOALS,
  LEVELS,
  MODES,
  PARTNER_CONDITIONS,
  SLOTS,
  SPORTS,
  STYLES,
  type District,
  type Goal,
  type Level,
  type Mode,
  type PartnerCondition,
  type Profile,
  type Slot,
  type Sport,
  type Style,
} from "@/lib/options";
import { saveProfile } from "@/lib/store";
import { useNickname } from "@/lib/use-nickname";
import { useProfile } from "@/lib/use-profile";
import { MultiChoice, SingleChoice } from "./ChoiceGroup";

/** 화면에서 고르는 중인 값. 아직 고르지 않은 항목은 null(또는 빈 목록)이다. */
type FormState = {
  sport: Sport | null;
  level: Level | null;
  goal: Goal | null;
  style: Style | null;
  slots: Slot[];
  district: District | null;
  modes: Mode[];
  partnerConditions: PartnerCondition[];
};

const EMPTY_FORM: FormState = {
  sport: null,
  level: null,
  goal: null,
  style: null,
  slots: [],
  district: null,
  modes: [],
  partnerConditions: [],
};

function formFromProfile(profile: Profile | null | undefined): FormState {
  if (!profile) return EMPTY_FORM;
  return {
    sport: profile.sport,
    level: profile.level,
    goal: profile.goal,
    style: profile.style,
    slots: profile.slots,
    district: profile.district,
    modes: profile.modes,
    partnerConditions: profile.partnerConditions,
  };
}

export default function ProfileForm() {
  const router = useRouter();
  const nickname = useNickname();
  const saved = useProfile(nickname ?? null);

  // draft가 null이면 아직 직접 고르지 않은 상태라서 저장된 프로필을 보여준다.
  const [draft, setDraft] = useState<FormState | null>(null);
  const [error, setError] = useState("");

  // 서버가 만든 첫 화면에서는 아직 닉네임을 모르므로 아무것도 그리지 않는다.
  if (nickname === undefined) return null;

  // 닉네임이 없으면 프로필을 저장할 곳이 없다.
  if (nickname === null) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
        <p className="text-zinc-700 dark:text-zinc-300">먼저 닉네임을 정해 주세요. 프로필은 닉네임별로 저장돼요.</p>
        <Link
          href="/"
          className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
        >
          닉네임 정하러 가기
        </Link>
      </div>
    );
  }

  // 위에서 닉네임이 있는 경우만 남겼으므로 여기서부터는 글자다. (아래 함수 안에서도 글자로 쓰려고 따로 담아 둔다)
  const currentNickname: string = nickname;
  const form = draft ?? formFromProfile(saved);
  const update = (patch: Partial<FormState>) => {
    setDraft({ ...form, ...patch });
    setError("");
  };

  // 파트너 조건을 뺀 항목 중 아직 고르지 않은 것
  const missing = [
    form.sport === null ? "종목" : null,
    form.level === null ? "실력" : null,
    form.goal === null ? "목적" : null,
    form.style === null ? "성향" : null,
    form.slots.length === 0 ? "가능 시간" : null,
    form.district === null ? "희망 지역" : null,
    form.modes.length === 0 ? "진행 방식" : null,
  ].filter((name): name is string => name !== null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { sport, level, goal, style, district } = form;
    if (missing.length > 0 || !sport || !level || !goal || !style || !district) return;

    const profile: Profile = {
      id: `user:${currentNickname}`,
      nickname: currentNickname,
      sport,
      level,
      goal,
      style,
      slots: form.slots,
      district,
      modes: form.modes,
      partnerConditions: form.partnerConditions,
      // 처음 눌렀을 때의 시각을 그대로 유지한다.
      profileCompletedAt: saved?.profileCompletedAt ?? new Date().toISOString(),
    };

    if (!saveProfile(profile)) {
      setError("이 브라우저에서는 프로필을 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
      return;
    }
    router.push("/recommend");
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-6">
      <SingleChoice
        legend="① 종목"
        options={SPORTS}
        value={form.sport}
        onChange={(sport) => update({ sport })}
      />
      <SingleChoice
        legend="② 실력"
        hint="1이 가장 낮고 5가 가장 높아요."
        options={LEVELS}
        getLabel={(level) => `${level}단계`}
        value={form.level}
        onChange={(level) => update({ level })}
      />
      <SingleChoice
        legend="③ 목적"
        options={GOALS}
        value={form.goal}
        onChange={(goal) => update({ goal })}
      />
      <SingleChoice
        legend="④ 성향"
        options={STYLES}
        value={form.style}
        onChange={(style) => update({ style })}
      />
      <MultiChoice
        legend="⑤ 가능 시간"
        hint="가능한 시간을 모두 골라 주세요."
        options={SLOTS}
        values={form.slots}
        onChange={(slots) => update({ slots })}
      />
      <SingleChoice
        legend="⑥ 희망 지역"
        options={DISTRICTS}
        value={form.district}
        onChange={(district) => update({ district })}
      />
      <MultiChoice
        legend="⑦ 진행 방식"
        hint="온라인을 고르면 다른 구에 사는 사람과도 매칭될 수 있어요. 둘 다 골라도 돼요."
        options={MODES}
        values={form.modes}
        onChange={(modes) => update({ modes })}
      />
      <MultiChoice
        legend="⑧ 파트너 조건 (선택)"
        hint="고르지 않아도 돼요."
        options={PARTNER_CONDITIONS}
        values={form.partnerConditions}
        onChange={(partnerConditions) => update({ partnerConditions })}
      />

      <div className="flex flex-col gap-2">
        {missing.length > 0 ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">{missing.join(", ")}을 선택해 주세요.</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={missing.length > 0}
          className="w-fit rounded-md bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-500"
        >
          추천 받기
        </button>
      </div>
    </form>
  );
}
