"use client";

// Design Ref: §12.5 화면 — /groups: 모임 찾기(추천 모임 카드·[참여 신청]), 모임 만들기(선택형), 내 모임(만든 모임·참여 신청 상태)
//   모임에는 AI 분석을 붙이지 않고 점수와 일치 조건만 보여준다. (§12.4) 점수 안내 문구는 항상 보여준다.
// Plan: 작업 25번 "모임 화면" — 모임 일정과 "운동 완료"는 작업 26번에서 이어서 만든다.
import { canChat } from "@/lib/chat";
import GroupChat from "./GroupChat";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  buildSeedGroups,
  createGroup,
  createJoin,
  groupTitle,
  isHostedBy,
  joinStatus,
  pendingJoinCount,
  seatsTaken,
  virtualMemberIds,
  MAX_PENDING_JOINS,
  type GroupRecommendation,
} from "@/lib/groups";
import { formatRemaining } from "@/lib/match";
import {
  DISTRICTS,
  FACILITY_SPORTS,
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
  type Place,
  type Profile,
  type SchedulePlace,
} from "@/lib/options";
import { VIRTUAL_PROFILES } from "@/lib/profiles";
import { todayString } from "@/lib/schedule";
import {
  getAllGroupJoinsSnapshot,
  getGroupJoinsJson,
  getGroupsJson,
  parseAllGroupJoins,
  parseGroupJoins,
  parseGroups,
  saveGroupJoins,
  saveGroups,
} from "@/lib/store";
import { useNickname } from "@/lib/use-nickname";
import { useProfile } from "@/lib/use-profile";
import { useAllGroupJoins, useMyGroupJoins, useNow, useUserGroups } from "@/lib/use-requests";
import { SingleChoice } from "./ChoiceGroup";

type Tab = "find" | "create" | "mine";
const TAB_LABEL: Record<Tab, string> = { find: "모임 찾기", create: "모임 만들기", mine: "내 모임" };

export default function GroupsView() {
  const nickname = useNickname();
  const profile = useProfile(nickname ?? null);
  const userGroups = useUserGroups();
  const myJoins = useMyGroupJoins(nickname ?? null);
  const allJoins = useAllGroupJoins();
  const now = useNow();
  const [tab, setTab] = useState<Tab>("find");

  // 가상 모임은 날짜가 "오늘 기준"이라, 하루에 한 번만 다시 만든다. (1초마다 바뀌는 now로 매번 만들지 않는다)
  const day = todayString(new Date(now));
  const seeds = useMemo(() => buildSeedGroups(Date.parse(`${day}T12:00:00+09:00`)), [day]);

  // 서버가 만든 첫 화면에서는 아직 브라우저 저장소를 모르므로 아무것도 그리지 않는다.
  if (nickname === undefined || profile === undefined || userGroups === undefined || myJoins === undefined || allJoins === undefined) {
    return null;
  }
  if (nickname === null) return <Guide text="먼저 닉네임을 정해 주세요." href="/" button="닉네임 정하러 가기" />;
  if (profile === null) {
    return <Guide text="아직 프로필이 없어요. 프로필을 입력하면 맞는 모임을 추천해 드려요." href="/profile" button="프로필 입력하러 가기" />;
  }

  const groups = [...seeds, ...userGroups];
  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" className="flex flex-wrap gap-2">
        {(Object.keys(TAB_LABEL) as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full border px-4 py-1.5 text-sm ${
              tab === key
                ? "border-emerald-600 bg-emerald-600 font-medium text-white"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            }`}
          >
            {TAB_LABEL[key]}
          </button>
        ))}
      </div>

      {tab === "find" ? (
        <FindGroups me={profile} userGroups={userGroups} groups={groups} myJoins={myJoins} allJoins={allJoins} now={now} />
      ) : null}
      {tab === "create" ? <CreateGroup me={profile} onCreated={() => setTab("mine")} /> : null}
      {tab === "mine" ? <MyGroups me={profile} groups={groups} myJoins={myJoins} allJoins={allJoins} now={now} /> : null}
    </div>
  );
}

// ───────────── 모임 찾기 ─────────────

type Loaded = { key: string; items: GroupRecommendation[] } | { key: string; error: string };

function FindGroups({
  me,
  userGroups,
  groups,
  myJoins,
  allJoins,
  now,
}: {
  me: Profile;
  userGroups: Group[];
  groups: Group[];
  myJoins: GroupJoin[];
  allJoins: GroupJoin[];
  now: number;
}) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  // 프로필·모임·신청이 바뀌면 다시 추천을 받는다.
  const key = JSON.stringify({ me, groups: userGroups, joins: allJoins });
  // 가상 참여자는 시간이 지나면 늘어나므로, 5초마다 같은 조건으로 조용히 다시 받아 인원(n/정원)을 맞춘다.
  // (같은 key의 결과를 바꿔 끼우는 것이라 "불러오는 중"으로 깜빡이지 않는다.)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/groups/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        setLoaded({ key, items: (await response.json()) as GroupRecommendation[] });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setLoaded({ key, error: "모임을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
      });
    return () => controller.abort();
  }, [key, tick]);

  const current = loaded?.key === key ? loaded : null;
  const tooMany = pendingJoinCount(myJoins, groups, now) >= MAX_PENDING_JOINS;

  function handleJoin(group: Group) {
    // 화면에 있는 목록이 아니라 저장소의 최신 값을 기준으로 다시 확인한다. (다른 탭에서 바뀌었을 수 있으므로)
    const latestMine = parseGroupJoins(getGroupJoinsJson(me.nickname));
    const latestAll = parseAllGroupJoins(getAllGroupJoinsSnapshot());
    const latestGroups = [...groups.filter((g) => g.hostId.startsWith("virtual-")), ...parseGroups(getGroupsJson())];
    const result = createJoin(me, group, latestGroups, latestMine, latestAll, new Date().getTime());
    if (!result.ok) {
      const messages = {
        "own-group": "내가 만든 모임이에요.",
        "already-joined": "이미 신청한 모임이에요.",
        full: "정원이 다 찼어요.",
        past: "지난 모임이에요.",
        "too-many-pending": `대기 중인 신청이 ${MAX_PENDING_JOINS}개예요.`,
      } as const;
      setError(messages[result.reason]);
      return;
    }
    if (!saveGroupJoins(me.nickname, [...latestMine, result.join])) {
      setError("이 브라우저에서는 신청을 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
      return;
    }
    setError("");
  }

  if (current === null) return <p className="text-zinc-600 dark:text-zinc-400">맞는 모임을 찾는 중이에요…</p>;
  if ("error" in current) {
    return (
      <p role="alert" className="text-red-600 dark:text-red-400">
        {current.error}
      </p>
    );
  }
  if (current.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
        <p className="text-zinc-700 dark:text-zinc-300">맞는 모임이 없어요. 직접 모임을 만들어 보세요.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">적합도 점수는 참고용이며 매칭 성공을 보장하지 않습니다.</p>
      {current.items[0]?.isRelaxed ? (
        <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          내 조건에 딱 맞는 모임이 없어서, 가장 가까운 모임을 보여드려요. 다른 조건을 확인하고 골라 주세요.
        </p>
      ) : null}
      {tooMany ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          대기 중인 참여 신청이 {MAX_PENDING_JOINS}개예요. 참여가 확정되거나 만료되면 다시 신청할 수 있어요.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <ul className="flex flex-col gap-4">
        {current.items.map((item) => (
          <li key={item.group.id} className="surface rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{groupTitle(item.group)}</span>
              <span className="text-zinc-700 dark:text-zinc-300">적합도 {item.score}점</span>
              <Badge text={item.meetMode} tone="sky" />
              {item.isReference ? <Badge text="참고용 후보" tone="amber" /> : null}
            </div>
            <p className="mt-1 text-sm text-zinc-700 dark:text-zinc-300">
              {item.group.date} · {item.group.slot}
              {item.group.mode === "오프라인" ? ` · ${item.group.district}` : ""}
              {item.group.place ? ` · ${item.group.place.name} (${item.group.place.address})` : ""} · 호스트 {item.group.hostNickname} ·{" "}
              {item.seatsTaken}/{item.group.capacity}명
            </p>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">일치 조건: {item.matchedConditions.length > 0 ? item.matchedConditions.join(" · ") : "없음"}
              {item.isRelaxed && item.differences.length > 0 ? ` · 다른 조건: ${item.differences.join(", ")}` : ""}
            </p>
            <div className="mt-3">
              <button
                type="button"
                onClick={() => handleJoin(item.group)}
                disabled={tooMany}
                className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
              >
                참여 신청
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ───────────── 모임 만들기 ─────────────

function CreateGroup({ me, onCreated }: { me: Profile; onCreated: () => void }) {
  // 처음에는 내 프로필 값으로 채운다. 고르면 그 값으로 바뀐다.
  const [sport, setSport] = useState<(typeof SPORTS)[number]>(me.sport);
  const [mode, setMode] = useState<(typeof MODES)[number]>(me.modes[0] ?? "오프라인");
  const [district, setDistrict] = useState<(typeof DISTRICTS)[number]>(me.district);
  const [slot, setSlot] = useState<(typeof SLOTS)[number]>(me.slots[0] ?? SLOTS[0]);
  const [date, setDate] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>(me.level);
  const [goal, setGoal] = useState<(typeof GOALS)[number]>(me.goal);
  const [style, setStyle] = useState<(typeof STYLES)[number]>(me.style);
  const [capacity, setCapacity] = useState<GroupCapacity>(4);
  const [place, setPlace] = useState<SchedulePlace | null>(null);
  const [error, setError] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createGroup({ sport, mode, district, slot, date, level, goal, style, capacity, place }, me, new Date().getTime());
    if (!result.ok) {
      setError(result.message);
      return;
    }
    // 모든 닉네임이 함께 보는 모임 목록에 더한다. (저장소의 최신 값을 기준으로)
    const latest = parseGroups(getGroupsJson());
    if (!saveGroups([...latest, result.group])) {
      setError("이 브라우저에서는 모임을 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
      return;
    }
    setError("");
    onCreated();
  }

  const clear = <T,>(set: (value: T) => void) => (value: T | null) => {
    if (value !== null) set(value);
    setError("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        모든 항목은 선택해서 정해요. 모임 제목은 선택한 내용으로 자동으로 만들어져요.
      </p>
      <SingleChoice legend="종목" options={SPORTS} value={sport} onChange={(value: (typeof SPORTS)[number] | null) => {
        clear(setSport)(value);
        setPlace(null);
      }} />
      <SingleChoice legend="진행 방식" options={MODES} value={mode} onChange={(value: (typeof MODES)[number] | null) => {
        clear(setMode)(value);
        setPlace(null);
      }} />
      <SingleChoice legend="구" options={DISTRICTS} value={district} onChange={(value: (typeof DISTRICTS)[number] | null) => {
        clear(setDistrict)(value);
        setPlace(null);
      }} />
      {mode === "오프라인" ? <PlacePicker sport={sport} district={district} value={place} onChange={setPlace} /> : null}
      <SingleChoice legend="시간대" options={SLOTS} value={slot} onChange={clear(setSlot)} />
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        모임 날짜
        <input
          type="date"
          value={date}
          min={todayString()}
          onChange={(event) => {
            setDate(event.target.value);
            setError("");
          }}
          className="w-fit rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
      </label>
      <SingleChoice legend="모임에 맞는 실력" options={LEVELS} getLabel={(l) => `${l}단계`} value={level} onChange={clear(setLevel)} />
      <SingleChoice legend="목적" options={GOALS} value={goal} onChange={clear(setGoal)} />
      <SingleChoice legend="성향" options={STYLES} value={style} onChange={clear(setStyle)} />
      <SingleChoice
        legend="정원 (나 포함)"
        options={GROUP_CAPACITIES}
        getLabel={(c) => `${c}명`}
        value={capacity}
        onChange={clear(setCapacity)}
      />
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        className="w-fit rounded-md bg-emerald-600 px-5 py-2 font-medium text-white hover:bg-emerald-700"
      >
        모임 만들기
      </button>
    </form>
  );
}

/** 오프라인 모임의 운동 장소(선택): 고른 종목·구의 시설 목록에서 하나 고른다. 다시 누르면 선택이 풀린다. */
function PlacePicker({
  sport,
  district,
  value,
  onChange,
}: {
  sport: (typeof SPORTS)[number];
  district: (typeof DISTRICTS)[number];
  value: SchedulePlace | null;
  onChange: (place: SchedulePlace | null) => void;
}) {
  const facilitySport = FACILITY_SPORTS.find((s) => s === sport);
  const key = `${facilitySport}|${district}`;
  const [loaded, setLoaded] = useState<{ key: string; places: Place[] } | { key: string; error: true } | null>(null);

  useEffect(() => {
    if (!facilitySport) return;
    const controller = new AbortController();
    fetch(`/api/places?${new URLSearchParams({ sport: facilitySport, district })}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        setLoaded({ key, places: (await response.json()) as Place[] });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setLoaded({ key, error: true });
      });
    return () => controller.abort();
  }, [key, facilitySport, district]);

  if (!facilitySport) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">운동 장소: 이 종목은 시설 정보가 없어서 장소를 고르지 않아도 돼요.</p>;
  }
  const current = loaded?.key === key ? loaded : null;
  if (current === null) return <p className="text-sm text-zinc-500 dark:text-zinc-400">운동 장소 목록을 불러오는 중이에요…</p>;
  if ("error" in current) return <p className="text-sm text-amber-700 dark:text-amber-400">시설 정보를 불러오지 못했어요. 장소 없이도 모임을 만들 수 있어요.</p>;
  if (current.places.length === 0) return <p className="text-sm text-zinc-500 dark:text-zinc-400">이 조건의 시설을 찾지 못했어요. 장소 없이도 모임을 만들 수 있어요.</p>;

  // 종목·구를 바꿔서 목록에 없는 장소가 되면 선택하지 않은 것으로 본다.
  const selected = current.places.find((p) => p.id === value?.id) ?? null;
  return (
    <div className="flex flex-col gap-1">
      <SingleChoice
        legend="운동 장소 (선택)"
        hint={selected ? selected.address : "고르지 않아도 돼요. 시설 정보는 샘플 데이터입니다."}
        options={current.places.map((p) => p.id)}
        getLabel={(id) => current.places.find((p) => p.id === id)?.name ?? id}
        value={selected?.id ?? null}
        onChange={(id) => {
          const place = current.places.find((p) => p.id === id);
          onChange(place ? { id: place.id, name: place.name, address: place.address } : null);
        }}
      />
    </div>
  );
}

// ───────────── 내 모임 ─────────────

const JOIN_STYLE = {
  대기: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  참여: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  만료: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
} as const;

function MyGroups({
  me,
  groups,
  myJoins,
  allJoins,
  now,
}: {
  me: Profile;
  groups: Group[];
  myJoins: GroupJoin[];
  allJoins: GroupJoin[];
  now: number;
}) {
  const hosted = groups.filter((g) => isHostedBy(g, me));
  const sorted = [...myJoins].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">내가 만든 모임</h2>
        {hosted.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">아직 만든 모임이 없어요. 모임 만들기 탭에서 만들 수 있어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {hosted.map((group) => {
              const names = virtualMemberIds(group, allJoins, now).map(
                (id) => VIRTUAL_PROFILES.find((p) => p.id === id)?.nickname ?? "",
              );
              return (
                <li key={group.id} className="surface rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-50">{groupTitle(group)}</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300">
                    {group.date} · {group.slot}
                    {group.mode === "오프라인" ? ` · ${group.district}` : ""}
                    {group.place ? ` · ${group.place.name} (${group.place.address})` : ""} · {seatsTaken(group, allJoins, now)}/{group.capacity}명
                  </p>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                    참여자: {names.length === 0 ? "아직 없어요" : names.join(", ")}
                  </p>
                  {canChat(group, me, myJoins, now) ? <GroupChat group={group} me={me} allJoins={allJoins} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">참여 신청한 모임</h2>
        {sorted.length === 0 ? (
          <p className="text-zinc-600 dark:text-zinc-400">아직 신청한 모임이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {sorted.map((join) => {
              const group = groups.find((g) => g.id === join.groupId);
              if (!group) return null;
              const status = joinStatus(join, group, now);
              return (
                <li key={join.id} className="surface flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-50">{groupTitle(group)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${JOIN_STYLE[status]}`}>{status}</span>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {group.date} · {group.slot}
                    {group.mode === "오프라인" ? ` · ${group.district}` : " · 온라인"}
                    {group.place ? ` · ${group.place.name} (${group.place.address})` : ""} · 호스트 {group.hostNickname}
                  </span>
                  {status === "대기" ? (
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      만료까지 {formatRemaining(Math.max(0, Date.parse(join.expiresAt) - now))}
                    </span>
                  ) : null}
                  {canChat(group, me, myJoins, now) ? <GroupChat group={group} me={me} allJoins={allJoins} /> : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

// ───────────── 공통 ─────────────

function Badge({ text, tone }: { text: string; tone: "sky" | "amber" }) {
  const color =
    tone === "sky"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{text}</span>;
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
