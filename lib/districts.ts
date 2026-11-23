// Design Ref: §3.5 지도·시설 검색, §5 데이터 모델 — 구마다 지도 중심 좌표 1개를 적어 둔다.
// 지도는 고른 구의 중심에 맞춰 보이고, 시설 샘플 좌표도 이 값 근처로 정한다.
// Plan: 작업 1번 "공통 선택지와 데이터 타입 정의" (구 중심 좌표 포함)
//
// 개인정보 원칙: 지도와 시설 검색에는 사용자의 정확한 주소나 현재 위치(GPS)를 쓰지 않고,
// 이 구 중심 좌표만 쓴다. (PRD 7번)
import type { District } from "./options";

/** 위도·경도 (WGS84) */
export interface DistrictCenter {
  lat: number;
  lng: number;
}

/** 구 중심 좌표 (구청 부근의 대략적인 값, 지도 중심용이라 정확한 위치는 필요 없다) */
export const DISTRICT_CENTERS: Record<District, DistrictCenter> = {
  대덕구: { lat: 36.3467, lng: 127.4156 },
  중구: { lat: 36.3256, lng: 127.4213 },
  유성구: { lat: 36.3622, lng: 127.3563 },
};
