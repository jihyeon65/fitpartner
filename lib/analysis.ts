// Design Ref: §4.2 AI에 보내는 것과 받는 것 — 닉네임 없이 코드 값만 보내고, 받은 답은 서버가 검사·후처리한다.
// PRD 5번 M2 규칙 1~3·9·10 — 입력한 정보만으로 분석, 공통점·차이점 각 1개 이상, 부족하면 단정하지 않고 안내,
//   건강 조언 금지, 참고 안내 문구는 코드가 붙인다.
// Plan: 작업 11번 "AI 성향 분석·추천 이유" — 연습 방식·프로그램·효과는 작업 12번에서 이어서 만든다.
//
// 이 파일은 AI를 직접 부르지 않는다. (호출은 lib/ai.ts) 프롬프트를 만들고, 받은 글자를 검사하는 계산만 한다.
import { z } from "zod";
import type { Profile } from "./options";
import { overlappingSlots } from "./filter";

/** 모든 분석 결과에 코드가 항상 붙이는 참고 안내 문구 (AI는 이 문구를 쓰지 않는다) */
export const ANALYSIS_NOTICE = "참고용이며 개인 상태에 따라 다를 수 있다";

/** 분석 정보가 부족할 때 보여주는 안내 */
export const INSUFFICIENT_MESSAGE = "정보가 부족해 분석이 어렵다";

/** 건강 관련 표현이 나와서 문장을 지웠을 때 보여주는 안내 */
export const HEALTH_CONSULT_MESSAGE = "건강 관련 내용은 전문가와 상담하세요";

/** AI가 "근거로 쓴 입력 항목"으로 말할 수 있는 이름 */
export const BASIS_FIELDS = ["종목", "실력", "목적", "성향", "가능 시간", "희망 지역"] as const;
export type BasisField = (typeof BASIS_FIELDS)[number];

const MAX_ITEMS = 3;
const MAX_TEXT_LENGTH = 120;

/** 진단·치료·재활·식단 같은 건강 조언 표현 (이 표현이 든 문장은 지운다) */
const HEALTH_WORDS = /진단|치료|재활|식단|처방|부상|통증|질병|병원|약물|증상/;

/** AI에게 보내는 내용. 닉네임·아이디 같은 개인 식별 정보는 넣지 않는다. */
export interface AnalysisInput {
  나: PublicFields;
  상대: PublicFields;
}
interface PublicFields {
  종목: string;
  실력: string;
  목적: string;
  성향: string;
  "가능 시간": string[];
  "희망 지역": string;
}

function publicFields(p: Profile): PublicFields {
  return {
    종목: p.sport,
    실력: `${p.level}단계 (1이 가장 낮고 5가 가장 높음)`,
    목적: p.goal,
    성향: p.style,
    "가능 시간": p.slots,
    "희망 지역": p.district,
  };
}

/** 두 사람의 코드 값만 모아 AI에게 보낼 내용을 만든다. */
export function buildAnalysisInput(me: Profile, candidate: Profile): AnalysisInput {
  return { 나: publicFields(me), 상대: publicFields(candidate) };
}

/** AI에게 주는 지시문 */
export const ANALYSIS_INSTRUCTIONS = `너는 운동 파트너 매칭 서비스의 분석 도우미야. 아래 "나"와 "상대"의 입력 정보만으로 두 사람이 파트너로 맞는 이유(공통점)와 서로 다른 부분(차이점)을 한국어로 쉽게 설명해.

규칙:
- 입력에 있는 정보(${BASIS_FIELDS.join(", ")})만 근거로 쓰고, 없는 내용(나이·성별·체형·건강 상태 등)은 절대 추측하지 마.
- 공통점과 차이점을 반드시 나눠서 각각 1~${MAX_ITEMS}개 써. 근거가 부족하면 억지로 만들지 말고 해당 목록을 비워.
- 사람을 단정하지 말고 "~할 수 있어요", "~한 편이에요"처럼 부드럽게 써. 한 문장은 ${MAX_TEXT_LENGTH}자 이내.
- 질병·부상·통증의 진단, 치료, 재활, 식단에 대한 말은 하지 마.
- 각 항목마다 근거로 쓴 입력 항목 이름을 basis 목록에 넣어. 이름은 ${BASIS_FIELDS.join(", ")} 중에서만 골라.
- 아래 JSON 형식으로만 답하고, 다른 글자는 쓰지 마.
{"commonalities":[{"text":"...","basis":["목적"]}],"differences":[{"text":"...","basis":["실력"]}]}`;

const itemSchema = z.object({
  text: z.string(),
  basis: z.array(z.string()),
});

/** AI가 돌려줘야 하는 형식 */
const responseSchema = z.object({
  commonalities: z.array(itemSchema),
  differences: z.array(itemSchema),
});

/** 화면에 보여주는 설명 한 줄 */
export interface ReasonItem {
  text: string;
  basis: BasisField[];
}

export interface Reasons {
  commonalities: ReasonItem[];
  differences: ReasonItem[];
}

export type AnalysisResult =
  | { status: "ok"; reasons: Reasons; notice: string; consult?: string }
  | { status: "insufficient"; message: string };

function isBasisField(value: string): value is BasisField {
  return (BASIS_FIELDS as readonly string[]).includes(value);
}

/** 두 사람의 입력에서 실제로 같은 항목과 다른 항목을 코드가 직접 가려낸다. */
export function compareFields(me: Profile, candidate: Profile): { same: Set<BasisField>; different: Set<BasisField> } {
  const same = new Set<BasisField>();
  const different = new Set<BasisField>();
  const put = (field: BasisField, isSame: boolean) => (isSame ? same : different).add(field);

  put("종목", me.sport === candidate.sport);
  put("실력", me.level === candidate.level);
  put("목적", me.goal === candidate.goal);
  put("성향", me.style === candidate.style);
  put("희망 지역", me.district === candidate.district);

  // 가능 시간은 겹치는 시간대가 있으면 공통점, 한쪽에만 있는 시간대가 있으면 차이점이 될 수 있다.
  if (overlappingSlots(me, candidate).length > 0) same.add("가능 시간");
  const onlyOneSide =
    me.slots.some((s) => !candidate.slots.includes(s)) || candidate.slots.some((s) => !me.slots.includes(s));
  if (onlyOneSide) different.add("가능 시간");
  return { same, different };
}

/** 글자 앞뒤의 ```json 표시를 떼고 JSON으로 읽는다. 읽지 못하면 null */
function readJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

/**
 * AI가 준 글자를 검사·후처리해서 화면에 보여줄 결과로 만든다.
 *  - 형식이 다르면 → 정보 부족 안내
 *  - 근거 항목이 없거나, 실제 입력과 맞지 않는 항목(공통점인데 서로 다른 값 등)은 삭제
 *  - 건강 조언 표현이 든 문장은 삭제하고 "전문가와 상담하세요" 안내를 붙임
 *  - 공통점·차이점이 각각 1개 미만이면 → 정보 부족 안내
 *  - 참고 안내 문구는 코드가 항상 붙임
 */
export function checkAnalysis(rawText: string, me: Profile, candidate: Profile): AnalysisResult {
  const insufficient: AnalysisResult = { status: "insufficient", message: INSUFFICIENT_MESSAGE };
  const parsed = responseSchema.safeParse(readJson(rawText));
  if (!parsed.success) return insufficient;

  const { same, different } = compareFields(me, candidate);
  let removedHealth = false;

  const clean = (items: z.infer<typeof itemSchema>[], allowed: Set<BasisField>): ReasonItem[] => {
    const result: ReasonItem[] = [];
    for (const item of items) {
      const text = item.text.trim();
      const basis = item.basis.filter(isBasisField);
      // 근거 이름이 하나라도 입력과 맞지 않거나(모르는 이름), 근거가 없으면 삭제
      if (!text || basis.length === 0 || basis.length !== item.basis.length) continue;
      // 공통점은 실제로 같은 항목, 차이점은 실제로 다른 항목만 근거로 인정
      if (!basis.every((field) => allowed.has(field))) continue;
      if (HEALTH_WORDS.test(text)) {
        removedHealth = true;
        continue;
      }
      result.push({ text: text.slice(0, MAX_TEXT_LENGTH), basis });
      if (result.length === MAX_ITEMS) break;
    }
    return result;
  };

  const commonalities = clean(parsed.data.commonalities, same);
  const differences = clean(parsed.data.differences, different);
  if (commonalities.length < 1 || differences.length < 1) return insufficient;

  return {
    status: "ok",
    reasons: { commonalities, differences },
    notice: ANALYSIS_NOTICE,
    ...(removedHealth ? { consult: HEALTH_CONSULT_MESSAGE } : {}),
  };
}
