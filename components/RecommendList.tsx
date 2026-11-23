"use client";

// Design Ref: §3.3 추천 결과 — 점수 안내 문구 1줄, 카드(닉네임·적합도 점수·일치 조건·배지), 최대 5개, 후보가 없으면 안내 문구
// Design Ref: §7 API 명세 — 저장된 프로필을 POST /api/recommend 로 보내 점수 높은 순 목록을 받는다. (AI 없음)
// Plan: 작업 9번 "추천 결과 화면(AI 없이 먼저)"
// Plan: 작업 13번 "추천 결과 화면에 AI 결과 연결" — 카드의 AI 분석 펼침은 AnalysisPanel 이 맡는다.
// Plan: 작업 14번 "매칭 요청" — 카드의 [매칭 요청] 버튼: 대기 중인 요청이 3명이면 비활성, 이미 요청한 사람은 "요청함"
import Link from "next/link";
import { useEffect, useState } from "react";
import type { MatchRequest, Mode, Profile } from "@/lib/options";
import { judgeSkillGap } from "@/lib/skill-gap";
import { activeRequestTo, createRequest, MAX_PENDING_REQUESTS, pendingCount } from "@/lib/match";
import { getRequestsJson, parseRequests, saveRequests } from "@/lib/store";
import { useNickname } from "@/lib/use-nickname";
import AnalysisPanel from "./AnalysisPanel";
import { useProfile } from "@/lib/use-profile";
import { useNow, useRequests } from "@/lib/use-requests";

/** /api/recommend 가 돌려주는 후보 한 명 */
interface RecommendItem {
  profile: Profile;
  score: number;
  matchedConditions: string[];
  levelGap: number;
  /** 만나는 방식 (작업 22번) */
  meetMode: Mode;
  isReference: boolean;
}

/** 어떤 프로필로 요청한 결과인지(key)와 그 결과를 함께 들고 있어서, 프로필이 바뀌면 "불러오는 중"으로 돌아간다. */
type Loaded = { key: string; items: RecommendItem[] } | { key: string; error: string };

export default function RecommendList() {
  const nickname = useNickname();
  const profile = useProfile(nickname ?? null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const requests = useRequests(nickname ?? null);
  // 3초 뒤 수락·남은 시간처럼 시간이 지나면 달라지는 상태를 다시 계산하려고 현재 시각을 받는다.
  const now = useNow();

  const key = profile ? JSON.stringify(profile) : null;

  useEffect(() => {
    if (key === null) return;
    const controller = new AbortController();
    fetch("/api/recommend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: key,
      signal: controller.signal,
    })
      .then(async (response) => {
        const data: unknown = await response.json();
        if (!response.ok) {
          const message =
            typeof data === "object" && data !== null && "message" in data && typeof data.message === "string"
              ? data.message
              : "추천을 불러오지 못했어요.";
          setLoaded({ key, error: message });
          return;
        }
        setLoaded({ key, items: data as RecommendItem[] });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setLoaded({ key, error: "추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
      });
    return () => controller.abort();
  }, [key]);

  // 서버가 만든 첫 화면에서는 아직 브라우저 저장소를 모르므로 아무것도 그리지 않는다.
  if (nickname === undefined || profile === undefined || requests === undefined) return null;

  if (nickname === null) {
    return <GuideBox text="먼저 닉네임을 정해 주세요." href="/" button="닉네임 정하러 가기" />;
  }
  if (profile === null) {
    return <GuideBox text="아직 프로필이 없어요. 프로필을 입력하면 파트너를 추천해 드려요." href="/profile" button="프로필 입력하러 가기" />;
  }

  const current = loaded?.key === key ? loaded : null;
  if (current === null) {
    return <p className="text-zinc-600 dark:text-zinc-400">추천 파트너를 찾는 중이에요…</p>;
  }
  if ("error" in current) {
    return (
      <p role="alert" className="text-red-600 dark:text-red-400">
        {current.error}
      </p>
    );
  }

  const { items } = current;
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
        <p className="text-zinc-700 dark:text-zinc-300">맞는 파트너가 없어요. 조건을 바꿔 보세요.</p>
        <Link
          href="/profile"
          className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
        >
          프로필 바꾸러 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        적합도 점수는 참고용이며 매칭 성공을 보장하지 않습니다.
      </p>
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          // 내 프로필이 바뀌면 카드를 새로 만들어, 이전 프로필로 받은 AI 분석이 남지 않게 한다.
          <RecommendCard key={`${key}:${item.profile.id}`} item={item} me={profile} requests={requests} now={now} />
        ))}
      </ul>
    </div>
  );
}

function GuideBox({ text, href, button }: { text: string; href: string; button: string }) {
  return (
    <div className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
      <p className="text-zinc-700 dark:text-zinc-300">{text}</p>
      <Link
        href={href}
        className="mt-3 inline-block rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700"
      >
        {button}
      </Link>
    </div>
  );
}

function RecommendCard({
  item,
  me,
  requests,
  now,
}: {
  item: RecommendItem;
  me: Profile;
  requests: MatchRequest[];
  now: number;
}) {
  const { badge } = judgeSkillGap(me, item.profile);
  const [error, setError] = useState("");
  const alreadyRequested = activeRequestTo(requests, item.profile.id, now) !== undefined;
  const tooMany = !alreadyRequested && pendingCount(requests, now) >= MAX_PENDING_REQUESTS;

  function handleRequest() {
    // 화면에 보이는 목록이 아니라 저장소의 최신 목록을 기준으로 다시 확인한다. (다른 탭에서 보냈을 수 있으므로)
    const latest = parseRequests(getRequestsJson(me.nickname));
    const result = createRequest(me, item.profile.id, latest, Date.now(), item.meetMode);
    if (!result.ok) {
      setError(result.reason === "too-many-pending" ? "대기 중인 요청이 3명이에요." : "이미 요청한 사람이에요.");
      return;
    }
    if (!saveRequests(me.nickname, [...latest, result.request])) {
      setError("이 브라우저에서는 요청을 저장할 수 없어요. 브라우저의 저장소 설정을 확인해 주세요.");
      return;
    }
    setError("");
  }

  return (
    <li className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{item.profile.nickname}</span>
        <span className="text-zinc-700 dark:text-zinc-300">적합도 {item.score}점</span>
        {badge ? <Badge text={badge} tone="green" /> : null}
        <Badge text={item.meetMode} tone="sky" />
        {item.isReference ? <Badge text="참고용 후보" tone="amber" /> : null}
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        일치 조건: {item.matchedConditions.join(" · ")}
      </p>
      <AnalysisPanel me={me} candidateId={item.profile.id} />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleRequest}
          disabled={alreadyRequested || tooMany}
          className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 dark:disabled:bg-zinc-800"
        >
          {alreadyRequested ? "요청함" : "매칭 요청"}
        </button>
        {alreadyRequested ? (
          <Link href="/matches" className="text-sm text-emerald-700 hover:underline dark:text-emerald-400">
            보낸 요청 보기
          </Link>
        ) : null}
        {tooMany ? (
          <span className="text-sm text-amber-700 dark:text-amber-400">
            대기 중인 요청이 {MAX_PENDING_REQUESTS}명이에요. 수락되거나 만료되면 다시 보낼 수 있어요.
          </span>
        ) : null}
        {error ? (
          <span role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function Badge({ text, tone }: { text: string; tone: "green" | "amber" | "sky" }) {
  const color =
    tone === "green"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : tone === "sky"
        ? "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"
        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{text}</span>;
}
