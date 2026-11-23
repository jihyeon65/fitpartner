// Design Ref: §5 저장 위치 — 가상 프로필 20명은 서버 코드 안(lib/profiles.ts)에 둔다.
// Design Ref: §10 시연용 데이터 — 러닝·배드민턴·헬스 고르게, 실력 1~2단계 40% 이상,
//   시연에서 쓰는 조합(종목·구·시간)은 필수 조건을 통과하는 후보가 5명 이상 나오도록 구성한다.
// Plan: 작업 3번 "가상 프로필 20명 데이터 만들기"
//
// 모두 실제 사람이 아닌 가상 데이터이고, 이름·연락처 같은 개인정보는 없다. (PRD 7번)
//
// 구성 요약
//  - 종목: 배드민턴 7 · 헬스 7 · 러닝 6
//  - 구: 유성구 7 · 중구 6 · 대덕구 7
//  - 실력: 1단계 4 · 2단계 7 · 3단계 4 · 4단계 3 · 5단계 2 → 1~2단계가 11명(55%)
//  - 시연 조합(모두 "평일 저녁"이 겹쳐서 필수 조건을 통과하는 후보가 5명씩 있다)
//      배드민턴·유성구 5명 / 헬스·중구 5명 / 러닝·대덕구 5명
import type { Profile } from "./options";

export const VIRTUAL_PROFILES: Profile[] = [
  // ── 배드민턴 (7) ──
  {
    id: "virtual-01", nickname: "셔틀콕러버", sport: "배드민턴", level: 2, goal: "다이어트",
    style: "꾸준히", slots: ["평일 저녁", "주말 오전"], district: "유성구", partnerConditions: [],
  },
  {
    id: "virtual-02", nickname: "라켓초보", sport: "배드민턴", level: 1, goal: "친목",
    style: "느긋하게", slots: ["평일 저녁"], district: "유성구", partnerConditions: [],
  },
  {
    id: "virtual-03", nickname: "스매시한방", sport: "배드민턴", level: 3, goal: "체력",
    style: "도전적으로", slots: ["평일 저녁", "주말 오후"], district: "유성구", partnerConditions: [],
  },
  {
    id: "virtual-04", nickname: "드롭샷연습생", sport: "배드민턴", level: 2, goal: "친목",
    style: "꾸준히", slots: ["평일 저녁", "평일 아침"], district: "유성구", partnerConditions: [],
  },
  {
    id: "virtual-05", nickname: "클리어마스터", sport: "배드민턴", level: 4, goal: "체력",
    style: "도전적으로", slots: ["평일 저녁", "주말 오전"], district: "유성구", partnerConditions: [],
  },
  {
    id: "virtual-06", nickname: "주말배드민턴", sport: "배드민턴", level: 2, goal: "다이어트",
    style: "느긋하게", slots: ["주말 오전", "주말 오후"], district: "중구", partnerConditions: [],
  },
  {
    id: "virtual-07", nickname: "코트의황제", sport: "배드민턴", level: 5, goal: "친목",
    style: "도전적으로", slots: ["평일 저녁"], district: "대덕구", partnerConditions: [],
  },

  // ── 헬스 (7) ──
  {
    id: "virtual-08", nickname: "헬린이", sport: "헬스", level: 1, goal: "다이어트",
    style: "느긋하게", slots: ["평일 저녁"], district: "중구", partnerConditions: [],
  },
  {
    id: "virtual-09", nickname: "삼대삼백목표", sport: "헬스", level: 2, goal: "다이어트",
    style: "꾸준히", slots: ["평일 저녁", "평일 아침"], district: "중구", partnerConditions: [],
  },
  {
    id: "virtual-10", nickname: "벤치프레스", sport: "헬스", level: 3, goal: "체력",
    style: "꾸준히", slots: ["평일 저녁", "주말 오전"], district: "중구", partnerConditions: [],
  },
  {
    id: "virtual-11", nickname: "운동메이트", sport: "헬스", level: 2, goal: "친목",
    style: "느긋하게", slots: ["평일 저녁", "주말 오후"], district: "중구", partnerConditions: [],
  },
  {
    id: "virtual-12", nickname: "데드리프트왕", sport: "헬스", level: 4, goal: "체력",
    style: "도전적으로", slots: ["평일 저녁"], district: "중구", partnerConditions: [],
  },
  {
    id: "virtual-13", nickname: "홈트졸업생", sport: "헬스", level: 1, goal: "다이어트",
    style: "꾸준히", slots: ["평일 아침", "평일 저녁"], district: "대덕구", partnerConditions: [],
  },
  {
    id: "virtual-14", nickname: "아침헬스", sport: "헬스", level: 3, goal: "다이어트",
    style: "느긋하게", slots: ["주말 오전"], district: "유성구", partnerConditions: [],
  },

  // ── 러닝 (6) ──
  {
    id: "virtual-15", nickname: "천천히러너", sport: "러닝", level: 1, goal: "친목",
    style: "느긋하게", slots: ["평일 저녁", "주말 오전"], district: "대덕구", partnerConditions: [],
  },
  {
    id: "virtual-16", nickname: "오킬로도전", sport: "러닝", level: 2, goal: "다이어트",
    style: "꾸준히", slots: ["평일 저녁"], district: "대덕구", partnerConditions: [],
  },
  {
    id: "virtual-17", nickname: "새벽러닝", sport: "러닝", level: 3, goal: "체력",
    style: "도전적으로", slots: ["평일 저녁", "평일 아침"], district: "대덕구", partnerConditions: [],
  },
  {
    id: "virtual-18", nickname: "공원한바퀴", sport: "러닝", level: 2, goal: "친목",
    style: "꾸준히", slots: ["평일 저녁", "주말 오전"], district: "대덕구", partnerConditions: [],
  },
  {
    id: "virtual-19", nickname: "마라톤준비", sport: "러닝", level: 4, goal: "체력",
    style: "도전적으로", slots: ["평일 저녁"], district: "대덕구", partnerConditions: [],
  },
  {
    id: "virtual-20", nickname: "하프마라토너", sport: "러닝", level: 5, goal: "체력",
    style: "도전적으로", slots: ["주말 오전", "주말 오후"], district: "유성구", partnerConditions: [],
  },
];

/**
 * 매칭 요청을 받아도 수락하지 않고 "대기"로 남겨 두는 가상 프로필 5명.
 * (만료와 동시 요청 3명 제한을 시연에서 확인하려는 용도. PRD 6번, 작업 14번에서 사용)
 * 나머지 15명은 요청 3초 뒤 자동으로 수락한다.
 */
export const NON_ACCEPTING_PROFILE_IDS = [
  "virtual-04",
  "virtual-09",
  "virtual-13",
  "virtual-16",
  "virtual-19",
] as const;
