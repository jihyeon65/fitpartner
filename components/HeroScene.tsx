"use client";

// 디자인: 첫 화면의 3D 장면. 서비스가 실제로 보여주는 것(추천 카드·온라인 모임·시설 위치)을 깊이가 다른 세 장의 카드로 겹쳐 놓고,
// 마우스를 따라 장면 전체가 기울어지며 카드마다 앞뒤 깊이(translateZ)가 달라 시차가 생긴다. 등장 효과는 이 화면에서만 한 번 쓴다.
import { useRef } from "react";

export default function HeroScene() {
  const stage = useRef<HTMLDivElement>(null);

  function onMove(event: React.PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !stage.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    stage.current.style.setProperty("--sry", `${(x * 26).toFixed(1)}deg`);
    stage.current.style.setProperty("--srx", `${(-y * 20).toFixed(1)}deg`);
  }
  function onLeave() {
    stage.current?.style.removeProperty("--sry");
    stage.current?.style.removeProperty("--srx");
  }

  return (
    <div
      className="scene relative mx-auto h-[22rem] w-full max-w-md select-none sm:h-[26rem]"
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      aria-hidden="true"
    >
      <div ref={stage} className="scene-stage">
        {/* 뒤: 지도 시설 카드 */}
        <div
          className="scene-layer surface w-60 rounded-2xl border p-4"
          style={{ left: "2%", top: "44%", transform: "translateZ(20px)", ["--d" as string]: "0.1s" }}
        >
          <div className="mb-3 h-20 rounded-xl bg-[radial-gradient(circle_at_30%_30%,#a7f3d0,transparent_55%),linear-gradient(135deg,#d1fae5,#bae6fd)] dark:bg-[radial-gradient(circle_at_30%_30%,#065f46,transparent_55%),linear-gradient(135deg,#064e3b,#0c4a6e)]" />
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">랠리 체육관</p>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">배드민턴 · 유성구</p>
        </div>

        {/* 가운데: 추천 카드 */}
        <div
          className="scene-layer surface w-64 rounded-2xl border p-5"
          style={{ left: "26%", top: "4%", transform: "translateZ(80px)", ["--d" as string]: "0.25s" }}
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-emerald-600 text-lg font-bold text-white">셔</span>
            <div>
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">셔틀콕러버</p>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">배드민턴 · 평일 저녁</p>
            </div>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">적합도</span>
            <span className="text-3xl font-extrabold tracking-tight text-emerald-700 dark:text-emerald-400">
              65<span className="text-base font-semibold">점</span>
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-emerald-500 to-sky-400" />
          </div>
        </div>

        {/* 앞: 온라인 모임 카드 */}
        <div
          className="scene-layer surface w-56 rounded-2xl border p-4"
          style={{ right: "0%", top: "58%", transform: "translateZ(150px)", ["--d" as string]: "0.4s" }}
        >
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-300">온라인</span>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">4/6명</span>
          </div>
          <p className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">맨몸운동 평일 저녁 모임</p>
          <div className="mt-3 flex -space-x-2">
            {["bg-emerald-500", "bg-sky-500", "bg-amber-500", "bg-rose-400"].map((c) => (
              <span key={c} className={`h-7 w-7 rounded-full border-2 border-white ${c} dark:border-zinc-900`} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
