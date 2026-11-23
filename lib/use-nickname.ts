// Design Ref: §3.1 로그인, §3 헤더 — 화면에서 현재 닉네임을 읽는 훅
// Plan: 작업 4번 "닉네임만 입력하는 실습용 간단 로그인"
import { useSyncExternalStore } from "react";
import { getNickname, subscribeNickname } from "./store";

/**
 * 현재 닉네임을 돌려준다.
 *  - 문자열: 저장된 닉네임
 *  - null: 아직 닉네임이 없음
 *  - undefined: 서버에서 만든 첫 화면이라 아직 브라우저 저장소를 읽기 전
 *    (화면 깜빡임을 줄이려고 "없음"과 구분한다)
 */
export function useNickname(): string | null | undefined {
  return useSyncExternalStore(subscribeNickname, getNickname, () => undefined);
}
