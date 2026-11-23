// Design Ref: §3.2 프로필 입력 — 화면에서 이 닉네임의 저장된 프로필을 읽는 훅
// Plan: 작업 5번 "프로필 입력 화면"
import { useMemo, useSyncExternalStore } from "react";
import type { Profile } from "./options";
import { getProfileJson, parseProfile, subscribeProfile } from "./store";

/**
 * 이 닉네임으로 저장된 프로필을 돌려준다.
 *  - Profile: 저장된 프로필
 *  - null: 저장된 프로필이 없음 (또는 저장된 값이 선택지와 맞지 않음)
 *  - undefined: 서버에서 만든 첫 화면이라 아직 브라우저 저장소를 읽기 전
 */
export function useProfile(nickname: string | null): Profile | null | undefined {
  const json = useSyncExternalStore(
    subscribeProfile,
    () => (nickname === null ? null : getProfileJson(nickname)),
    () => undefined,
  );
  return useMemo(() => (json === undefined ? undefined : parseProfile(json)), [json]);
}
