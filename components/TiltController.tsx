"use client";

// 디자인: 화면 어디서든 class="tilt"인 카드 위로 마우스를 움직이면 카드가 3D로 기울고 빛이 번진다.
// 카드마다 이벤트를 따로 달지 않고, 문서 전체에서 한 번만 듣는다. 마우스가 아닌 입력(터치)이나
// "움직임 줄이기" 설정에서는 아무것도 하지 않는다.
import { useEffect } from "react";

const MAX_TILT_DEG = 6;
/** 이보다 키가 큰 카드(AI 분석을 펼친 카드 등)는 읽는 동안 흔들리지 않게 기울이지 않는다. */
const MAX_TILT_HEIGHT = 440;

export default function TiltController() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current: HTMLElement | null = null;

    function reset(el: HTMLElement) {
      el.classList.remove("is-tilting");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--glare", "0");
    }

    function onMove(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      const target = event.target instanceof Element ? event.target.closest<HTMLElement>(".tilt") : null;
      if (current && current !== target) {
        reset(current);
        current = null;
      }
      if (!target) return;
      const rect = target.getBoundingClientRect();
      if (rect.height > MAX_TILT_HEIGHT) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      target.classList.add("is-tilting");
      target.style.setProperty("--ry", `${((x - 0.5) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
      target.style.setProperty("--rx", `${((0.5 - y) * 2 * MAX_TILT_DEG).toFixed(2)}deg`);
      target.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
      target.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
      target.style.setProperty("--glare", "1");
      current = target;
    }

    function onLeave() {
      if (current) reset(current);
      current = null;
    }

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      if (current) reset(current);
    };
  }, []);

  return null;
}
