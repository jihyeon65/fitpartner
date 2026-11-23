// Design Ref: §5 저장 위치 — 가상 프로필은 서버 코드 안(lib/profiles.ts)에 둔다.
// Design Ref: §10 시연용 데이터 — 러닝·배드민턴·헬스 고르게, 실력 1~2단계 40% 이상,
//   시연에서 쓰는 조합(종목·구·시간)은 필수 조건을 통과하는 후보가 5명 이상 나오도록 구성한다.
// Plan: 작업 3번 "가상 프로필 20명 데이터 만들기", 작업 21번 "확장 기초"(진행 방식 필드), 작업 22번(맨몸운동 5명 추가로 25명, 진행 방식 배정)
//
// 모두 실제 사람이 아닌 가상 데이터이고, 이름·연락처 같은 개인정보는 없다. (PRD 7번)
//
// 구성 요약
//  - 종목: 배드민턴 7 · 헬스 7 · 러닝 6 · 맨몸운동 5 (맨몸운동은 작업 22번에서 추가)
//  - 구: 유성구 7 · 중구 6 · 대덕구 7
//  - 실력: 처음 20명은 1~2단계 11명(55%), 맨몸운동 5명 중 3명이 1~2단계 → 25명 중 14명(56%)
//  - 시연 조합(모두 "평일 저녁"이 겹쳐서 필수 조건을 통과하는 후보가 5명씩 있다)
//      배드민턴·유성구 5명 / 헬스·중구 5명 / 러닝·대덕구 5명
import type { Mode, Profile } from "./options";

/** 진행 방식을 뺀 가상 프로필 원본. (진행 방식은 아래 VIRTUAL_PROFILES 에서 붙인다) */
const BASE_PROFILES: Omit<Profile, "modes">[] = [
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

  // ── 맨몸운동 (5, v0.8 추가: 시설이 없는 종목이라 온라인 매칭이 중심이다) ──
  {
    id: "virtual-21", nickname: "홈트시작", sport: "맨몸운동", level: 1, goal: "다이어트",
    style: "느긋하게", slots: ["평일 저녁", "평일 아침"], district: "중구", partnerConditions: [],
  },
  {
    id: "virtual-22", nickname: "거실운동러", sport: "맨몸운동", level: 2, goal: "친목",
    style: "꾸준히", slots: ["평일 저녁", "주말 오전"], district: "대덕구", partnerConditions: [],
  },
  {
    id: "virtual-23", nickname: "플랭크챌린저", sport: "맨몸운동", level: 3, goal: "체력",
    style: "도전적으로", slots: ["평일 저녁", "주말 오전"], district: "유성구", partnerConditions: [],
  },
  {
    id: "virtual-24", nickname: "맨몸스쿼트", sport: "맨몸운동", level: 2, goal: "다이어트",
    style: "꾸준히", slots: ["평일 저녁", "주말 오후"], district: "중구", partnerConditions: [],
  },
  {
    id: "virtual-25", nickname: "풀업도전", sport: "맨몸운동", level: 4, goal: "체력",
    style: "도전적으로", slots: ["평일 저녁"], district: "대덕구", partnerConditions: [],
  },
];

/**
 * 가상 프로필마다 가능한 진행 방식 (DESIGN 12.1: 오프라인만 10명·온라인만 5명·둘 다 10명).
 * 기존 시연 조합(배드민턴·유성구 / 헬스·중구 / 러닝·대덕구)의 후보 5명은 오프라인이나 둘 다라서,
 * 오프라인 사용자가 예전처럼 5명씩 추천받을 수 있다. 맨몸운동은 온라인 중심이다.
 */
const MODES_BY_ID: Record<string, Mode[]> = {
  "virtual-01": ["오프라인", "온라인"], "virtual-02": ["오프라인"], "virtual-03": ["오프라인"],
  "virtual-04": ["오프라인", "온라인"], "virtual-05": ["오프라인"], "virtual-06": ["온라인"],
  "virtual-07": ["오프라인", "온라인"], "virtual-08": ["오프라인"], "virtual-09": ["오프라인", "온라인"],
  "virtual-10": ["오프라인"], "virtual-11": ["오프라인", "온라인"], "virtual-12": ["오프라인"],
  "virtual-13": ["온라인"], "virtual-14": ["오프라인"], "virtual-15": ["오프라인"],
  "virtual-16": ["오프라인", "온라인"], "virtual-17": ["오프라인"], "virtual-18": ["오프라인"],
  "virtual-19": ["오프라인", "온라인"], "virtual-20": ["온라인"],
  "virtual-21": ["온라인"], "virtual-22": ["온라인"], "virtual-23": ["오프라인", "온라인"],
  "virtual-24": ["오프라인", "온라인"], "virtual-25": ["오프라인", "온라인"],
};

/** 가상 프로필 전체 25명 (기존 20명 + 맨몸운동 5명). */
export const VIRTUAL_PROFILES: Profile[] = BASE_PROFILES.map((profile) => ({
  ...profile,
  modes: MODES_BY_ID[profile.id] ?? ["오프라인"],
}));

/**
 * 매칭 요청을 받아도 수락하지 않고 "대기"로 남겨 두는 가상 프로필 5명.
 * (만료와 동시 요청 3명 제한을 시연에서 확인하려는 용도. PRD 6번, 작업 14번에서 사용)
 * 나머지는 요청 3초 뒤 자동으로 수락한다.
 */
export const NON_ACCEPTING_PROFILE_IDS = [
  "virtual-04",
  "virtual-09",
  "virtual-13",
  "virtual-16",
  "virtual-19",
] as const;
