"use client";

// Design Ref: §3.5 지도·시설 검색 — 종목·구를 고르고(기본값은 내 프로필), 지도 마커와 시설 목록, 시설 상세, 안내 문구를 보여준다.
//   조건에 맞는 시설이 없으면 "이 조건의 시설을 찾지 못했어요", 불러오기에 실패하면 "시설 정보를 불러오지 못했어요…"
//   (다른 기능은 정상). 지도 그림 실패 시 "지도를 불러오지 못했어요"만 보이고 목록은 그대로. "시설 정보는 샘플 데이터입니다" 안내.
// Design Ref: §4.4 시설 검색 흐름 — 브라우저 → /api/places?sport=…&district=…
// Design Ref: §3.5 — 메뉴의 "장소"로 열면 보기만 가능하고, 일정 화면의 "장소 고르기"로 열면(?pick=매칭) 선택 모드가 되어 "일정 장소로 선택" 버튼이 보인다.
// Plan: 작업 17번 "지도·시설 검색 화면(N2)", 작업 18번 "일정 관리"(일정 장소로 선택)
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DISTRICTS, FACILITY_SPORTS, type District, type FacilitySport, type Place } from "@/lib/options";
import { getScheduleDraftJson, parseScheduleDraft, saveScheduleDraft } from "@/lib/store";
import { useNickname } from "@/lib/use-nickname";
import { useProfile } from "@/lib/use-profile";
import { SingleChoice } from "./ChoiceGroup";

// Leaflet은 브라우저에서만 동작하므로 서버 렌더링을 끄고 불러온다.
const PlacesMap = dynamic(() => import("./PlacesMap"), {
  ssr: false,
  loading: () => <div className="h-80 w-full animate-pulse rounded-lg bg-zinc-200 md:h-[28rem] dark:bg-zinc-800" />,
});

/** 어떤 조건으로 요청한 결과인지(key)와 그 결과를 함께 들고 있어서, 조건이 바뀌면 "불러오는 중"으로 돌아간다. */
type Loaded = { key: string; places: Place[] } | { key: string; error: string };

export default function PlacesExplorer() {
  const router = useRouter();
  const pickMatchId = useSearchParams().get("pick");
  const nickname = useNickname();
  const profile = useProfile(nickname ?? null);

  // null이면 아직 직접 고르지 않은 상태라서 내 프로필의 값(없으면 첫 선택지)을 쓴다.
  const [pickedSport, setPickedSport] = useState<FacilitySport | null>(null);
  const [pickedDistrict, setPickedDistrict] = useState<District | null>(null);
  // 내 종목이 맨몸운동처럼 시설이 없는 종목이면 첫 선택지(러닝)로 시작한다.
  const profileSport = FACILITY_SPORTS.find((item) => item === profile?.sport);
  const sport: FacilitySport = pickedSport ?? profileSport ?? FACILITY_SPORTS[0];
  const district: District = pickedDistrict ?? profile?.district ?? DISTRICTS[0];

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const key = `${sport}|${district}`;

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/places?${new URLSearchParams({ sport, district })}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("failed");
        setLoaded({ key, places: (await response.json()) as Place[] });
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setLoaded({ key, error: "시설 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요." });
      });
    return () => controller.abort();
  }, [key, sport, district]);

  // 서버가 만든 첫 화면에서는 아직 브라우저 저장소(프로필)를 모르므로 아무것도 그리지 않는다.
  if (nickname === undefined || profile === undefined) return null;

  const current = loaded?.key === key ? loaded : null;
  const places = current && "places" in current ? current.places : [];
  const selected = places.find((place) => place.id === selectedId);

  /** 선택 모드: 고른 시설을 임시 값에 담아 두고 일정 화면으로 돌아간다. */
  function pickForSchedule(place: Place) {
    if (!pickMatchId || !nickname) return;
    const before = parseScheduleDraft(getScheduleDraftJson(nickname));
    const base = before?.matchId === pickMatchId ? before : { matchId: pickMatchId };
    saveScheduleDraft(nickname, { ...base, place: { id: place.id, name: place.name, address: place.address } });
    router.push(`/schedule?match=${encodeURIComponent(pickMatchId)}`);
  }

  function changeSport(next: FacilitySport) {
    setPickedSport(next);
    setSelectedId(null);
  }
  function changeDistrict(next: District) {
    setPickedDistrict(next);
    setSelectedId(null);
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-zinc-600 dark:text-zinc-400">시설 정보는 샘플 데이터입니다.</p>

      <div className="flex flex-col gap-4 sm:flex-row sm:gap-8">
        <SingleChoice legend="종목" options={FACILITY_SPORTS} value={sport} onChange={(next) => next && changeSport(next)} />
        <SingleChoice legend="구" options={DISTRICTS} value={district} onChange={(next) => next && changeDistrict(next)} />
      </div>

      {current === null ? <p className="text-zinc-600 dark:text-zinc-400">시설을 찾는 중이에요…</p> : null}
      {current && "error" in current ? (
        <p role="alert" className="text-red-600 dark:text-red-400">
          {current.error}
        </p>
      ) : null}
      {current && "places" in current && places.length === 0 ? (
        <p className="text-zinc-700 dark:text-zinc-300">이 조건의 시설을 찾지 못했어요.</p>
      ) : null}

      {current && "places" in current && places.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-[3fr_2fr]">
          <div className="flex flex-col gap-2">
            {mapFailed ? (
              <p role="alert" className="rounded-lg border border-dashed border-zinc-300 p-4 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
                지도를 불러오지 못했어요.
              </p>
            ) : (
              <PlacesMap
                district={district}
                places={places}
                selectedId={selectedId}
                onSelect={setSelectedId}
                onTileError={() => setMapFailed(true)}
              />
            )}
            <p className="text-xs text-zinc-500 dark:text-zinc-400">© OpenStreetMap contributors</p>
          </div>

          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {places.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(place.id)}
                    aria-pressed={place.id === selectedId}
                    className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                      place.id === selectedId
                        ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950"
                        : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <span className="font-medium text-zinc-900 dark:text-zinc-50">{place.name}</span>
                    <span className="text-zinc-600 dark:text-zinc-400"> · {place.sports.join(", ")}</span>
                    {place.lat === undefined || place.lng === undefined ? (
                      <span className="ml-1 text-xs text-zinc-500">(지도에 표시되지 않아요)</span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>

            {selected ? (
              <div className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">{selected.name}</h3>
                <p className="mt-1 text-zinc-700 dark:text-zinc-300">{selected.address}</p>
                <p className="text-zinc-700 dark:text-zinc-300">종목: {selected.sports.join(", ")}</p>
                <Link href="/recommend" className="mt-2 inline-block text-emerald-700 hover:underline dark:text-emerald-400">
                  추천 파트너 보러 가기
                </Link>
                {pickMatchId ? (
                  <button
                    type="button"
                    onClick={() => pickForSchedule(selected)}
                    className="mt-3 block rounded-md bg-emerald-600 px-3 py-1.5 font-medium text-white hover:bg-emerald-700"
                  >
                    일정 장소로 선택
                  </button>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">목록이나 지도의 마커를 누르면 시설 정보를 보여줘요.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
