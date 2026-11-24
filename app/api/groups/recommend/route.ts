// Design Ref: §12.6 API — POST /api/groups/recommend: 내 프로필과 내가 만든 모임·참여 신청을 받아 가상 모임과 합쳐 거르기·점수 → 최대 5개
//   요청의 모임·참여 신청 값은 모두 선택지와 맞는지 검사하고 맞지 않는 것은 버린다. (AI는 쓰지 않는다)
// Plan: 작업 25번 "모임 화면"
import { buildSeedGroups, recommendGroups, sanitizeGroupJoins, sanitizeGroups } from "@/lib/groups";
import { rateLimit } from "@/lib/rate-limit";
import { checkProfileInput } from "@/lib/validate-profile";

/** 한 번에 받는 모임·참여 신청의 최대 개수 (넘으면 거절해서 계산이 오래 걸리는 요청을 막는다) */
const MAX_GROUPS = 100;
const MAX_JOINS = 500;

export async function POST(request: Request) {
  const limited = rateLimit(request, "groups-recommend", 120, 60_000);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "요청 내용을 읽지 못했어요." }, { status: 400 });
  }
  const { me: meInput, groups, joins } = (typeof body === "object" && body !== null ? body : {}) as {
    me?: unknown;
    groups?: unknown;
    joins?: unknown;
  };

  const me = checkProfileInput(meInput);
  if (!me.ok) {
    return Response.json({ message: `${me.missing.join(", ")}을 선택해 주세요.` }, { status: 400 });
  }

  if ((Array.isArray(groups) && groups.length > MAX_GROUPS) || (Array.isArray(joins) && joins.length > MAX_JOINS)) {
    return Response.json({ message: "보낸 모임이나 신청이 너무 많아요." }, { status: 400 });
  }

  const nowMs = Date.now();
  // 가상 모임과 이 브라우저 사용자가 만든 모임을 합친다. (id가 겹치면 가상 모임을 우선한다)
  const seeds = buildSeedGroups(nowMs);
  const userGroups = sanitizeGroups(groups).filter((g) => !seeds.some((s) => s.id === g.id));
  const allJoins = sanitizeGroupJoins(joins);
  const myJoins = allJoins.filter((j) => j.fromNickname === me.profile.nickname);

  return Response.json(recommendGroups(me.profile, [...seeds, ...userGroups], myJoins, allJoins, nowMs));
}
