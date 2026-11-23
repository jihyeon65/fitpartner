// Design Ref: §5 데이터 모델 — 선택지와 타입을 이 파일 한 곳에 모은다.
// 화면(프로필 입력)과 서버 코드(필터·점수 계산)가 같은 선택지를 쓰도록 하기 위함이다.
// Plan: 작업 1번 "공통 선택지와 데이터 타입 정의"

// ───────────── 선택지 (모두 선택형, 자유 입력란 없음) ─────────────
// `as const`로 적어 두면 값 목록과 타입을 한 번에 만들 수 있다.

/** 지원 종목 (PRD 6번: 러닝·배드민턴·헬스 3개로 한정) */
export const SPORTS = ["러닝", "배드민턴", "헬스"] as const;

/** 실력 5단계 (1이 가장 낮음) */
export const LEVELS = [1, 2, 3, 4, 5] as const;

/** 운동 목적 */
export const GOALS = ["다이어트", "체력", "친목"] as const;

/** 운동 성향 (제안 예시: 구현 중 확정) */
export const STYLES = ["느긋하게", "꾸준히", "도전적으로"] as const;

/** 가능 시간 4개 묶음 (제안 예시: 구현 중 확정) */
export const SLOTS = ["평일 아침", "평일 저녁", "주말 오전", "주말 오후"] as const;

/** 희망 지역 (대전광역시의 3개 구로 한정) */
export const DISTRICTS = ["대덕구", "중구", "유성구"] as const;

/** 파트너 조건 (선택 사항) */
export const PARTNER_CONDITIONS = ["비슷한 실력만 보기", "같은 운동 목적만 보기"] as const;

// ───────────── 선택지에서 만든 타입 ─────────────

export type Sport = (typeof SPORTS)[number];
export type Level = (typeof LEVELS)[number];
export type Goal = (typeof GOALS)[number];
export type Style = (typeof STYLES)[number];
export type Slot = (typeof SLOTS)[number];
export type District = (typeof DISTRICTS)[number];
export type PartnerCondition = (typeof PARTNER_CONDITIONS)[number];

// ───────────── 데이터 모양 ─────────────

/** 사용자·가상 프로필. 이름·연락처 등 개인정보 항목은 두지 않는다. (PRD 7번) */
export interface Profile {
  id: string;
  nickname: string;
  sport: Sport;
  level: Level;
  goal: Goal;
  style: Style;
  /** 가능 시간 (여러 개 선택) */
  slots: Slot[];
  /** 희망 지역 (구 단위) */
  district: District;
  partnerConditions: PartnerCondition[];
  /** [추천 받기]를 처음 누른 시각 (탐색 시간 측정용) */
  profileCompletedAt?: string;
}

/** 매칭 요청 */
export interface MatchRequest {
  id: string;
  /** 요청한 사용자 (닉네임별 지표용) */
  fromNickname: string;
  toProfileId: string;
  status: "대기" | "수락" | "만료";
  createdAt: string;
  expiresAt: string;
  /** "추천이 잘 맞았나요?" */
  satisfaction?: boolean;
  /** "추천된 프로그램이 도움이 될 것 같나요?" */
  programHelpful?: boolean;
}

/** 운동 시설 (지금은 샘플 데이터, 나중에 공공데이터로 교체해도 같은 모양을 쓴다) */
export interface Place {
  id: string;
  name: string;
  /** 시설 주소 (공개 정보) */
  address: string;
  /** 시설이 해당하는 종목들 (한 시설이 여러 종목일 수 있음) */
  sports: Sport[];
  district: District;
  /** 좌표가 없는 시설은 목록에만 표시하므로 비어 있을 수 있다. */
  lat?: number;
  lng?: number;
}

/** 일정에 저장하는 운동 장소 (선택 사항) */
export interface SchedulePlace {
  id: string;
  name: string;
  address: string;
}

/** 일정 */
export interface Schedule {
  matchId: string;
  /** 일정을 등록한 사용자 (닉네임별 지표용) */
  ownerNickname: string;
  slot: Slot;
  /** 실제 운동 날짜 */
  date: string;
  /** 내 쪽 운동 완료 */
  myDone: boolean;
  /** 상대 쪽 운동 완료 (가상 프로필은 시연자가 체크) */
  partnerDone: boolean;
  /** 완료 체크 시각 (2주 안 완료 계산용) */
  doneAt?: string;
  place?: SchedulePlace;
}
