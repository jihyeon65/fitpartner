// Design Ref: §5 데이터 모델 — 선택지와 타입을 이 파일 한 곳에 모은다.
// 화면(프로필 입력)과 서버 코드(필터·점수 계산)가 같은 선택지를 쓰도록 하기 위함이다.
// Plan: 작업 1번 "공통 선택지와 데이터 타입 정의", 작업 21번 "확장 기초"(맨몸운동·진행 방식)

// ───────────── 선택지 (모두 선택형, 자유 입력란 없음) ─────────────
// `as const`로 적어 두면 값 목록과 타입을 한 번에 만들 수 있다.

/** 지원 종목 (PRD 6번: 러닝·배드민턴·헬스·맨몸운동 4개로 한정. 맨몸운동은 v0.8에서 추가) */
export const SPORTS = ["러닝", "배드민턴", "헬스", "맨몸운동"] as const;

/** 운동 시설(지도·시설 검색)이 있는 종목. 맨몸운동은 시설이 없어서 뺀다. (DESIGN 12.1) */
export const FACILITY_SPORTS = ["러닝", "배드민턴", "헬스"] as const;

/** 진행 방식 (v0.8, DESIGN 12.2). 프로필에서는 복수 선택한다. */
export const MODES = ["오프라인", "온라인"] as const;

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

/** 모임 정원(호스트 포함) 선택지 (v0.8, DESIGN 12.3) */
export const GROUP_CAPACITIES = [3, 4, 5, 6] as const;

/** 파트너 조건 (선택 사항) */
export const PARTNER_CONDITIONS = ["비슷한 실력만 보기", "같은 운동 목적만 보기"] as const;

// ───────────── 선택지에서 만든 타입 ─────────────

export type Sport = (typeof SPORTS)[number];
export type FacilitySport = (typeof FACILITY_SPORTS)[number];
export type Mode = (typeof MODES)[number];
export type GroupCapacity = (typeof GROUP_CAPACITIES)[number];
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
  /** 진행 방식 (1개 이상). 온라인을 고르면 같은 구가 아니어도 매칭될 수 있다. */
  modes: Mode[];
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
  /** 만나는 방식 (작업 23번). 옛 요청에 없으면 오프라인으로 읽는다. */
  mode: Mode;
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
  /** 만나는 방식 (작업 23번). 온라인이면 장소 없이 저장한다. */
  mode: Mode;
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

// ───────────── 1대다수 모임 (v0.8, DESIGN 12.3, 작업 24번) ─────────────

/** 모임. 제목은 자유 입력이 아니라 "{종목} {시간대} {진행 방식} 모임"으로 자동으로 만든다. */
export interface Group {
  id: string;
  /** 모임을 연 사람의 프로필 id (가상 프로필 또는 "user:닉네임") */
  hostId: string;
  hostNickname: string;
  sport: Sport;
  /** 오프라인이면 district가 의미 있다. 온라인이면 구는 참고용이다. */
  mode: Mode;
  district: District;
  /** 모임 시간대 (하나) */
  slot: Slot;
  /** 모임 날짜 YYYY-MM-DD */
  date: string;
  /** 모임이 맞는 실력 단계 */
  level: Level;
  goal: Goal;
  style: Style;
  /** 호스트를 포함한 정원 */
  capacity: GroupCapacity;
  createdAt: string;
  /** 호스트를 뺀 가상 참여자 프로필 id. (내가 만든 모임은 시각에 따라 자동으로 늘어난다 — lib/groups.ts) */
  members: string[];
  /** 내가 만든 모임에서 호스트(나)의 "운동 완료" 체크. 참여자의 체크는 GroupJoin.done에 둔다. */
  hostDone?: boolean;
}

/** 내가 낸 모임 참여 신청 */
export interface GroupJoin {
  id: string;
  groupId: string;
  fromNickname: string;
  status: "대기" | "참여" | "만료";
  createdAt: string;
  expiresAt: string;
  /** 모임 일정의 "운동 완료" (내 쪽) */
  done?: boolean;
}
