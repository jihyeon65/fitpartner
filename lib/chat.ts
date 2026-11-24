// Design Ref: §12.5 화면 확장 — 온라인 모임의 "앱 안 소통": 참여가 확정된 온라인 모임마다 글 채팅방 하나
// Plan: 사용자 요청(온라인 모임 앱 안 소통) — 서버·DB가 없어서 글은 이 브라우저에만 저장하고, 가상 참여자는 정해 둔 인사말로 답한다. (시연용)
//   (PRD·DESIGN의 "모임 채팅 비범위"는 이 요청으로 온라인 모임에 한해 풀었다. 오프라인 모임·1대1에는 채팅이 없다.)
//
// 화면 없이 계산만 하는 코드라서, 같은 입력이면 항상 같은 결과가 나온다. (답글의 "보일 시각"은 저장해 두고 시각만 비교한다.)
import { isHostedBy, joinStatus, virtualMemberIds } from "./groups";
import type { Group, GroupJoin, Profile } from "./options";
import { VIRTUAL_PROFILES } from "./profiles";

/** 한 번에 보낼 수 있는 글자 수 */
export const MAX_MESSAGE_LENGTH = 200;
/** 방마다 보관하는 최대 글 수 (넘으면 오래된 글부터 지운다) */
export const MAX_MESSAGES = 100;
/** 가상 참여자가 답하기까지의 시간(밀리초) */
export const REPLY_DELAY_MS = 2000;

/** 처음 들어오면 항상 맨 위에 보이는 안내 (저장하지 않는 고정 문구) */
export const CHAT_NOTICE = "온라인 모임 채팅방이에요. 연락처·계정 등 개인정보는 함부로 공유하지 마세요.";

export interface ChatMessage {
  id: string;
  groupId: string;
  /** 보낸 사람 닉네임 */
  sender: string;
  /** 가상 참여자가 보낸 글인지 */
  virtual: boolean;
  text: string;
  /** 이 시각이 지나야 화면에 보인다. (가상 참여자의 답글은 보낸 글보다 조금 뒤) */
  createdAt: string;
}

/** 이 모임의 채팅방에 들어갈 수 있는지: 온라인 모임이고, 내가 호스트이거나 참여가 확정된 경우 */
export function canChat(
  group: Group,
  me: Pick<Profile, "id" | "nickname">,
  myJoins: readonly GroupJoin[],
  nowMs: number,
): boolean {
  if (group.mode !== "온라인") return false;
  if (isHostedBy(group, me)) return true;
  return myJoins.some((j) => j.groupId === group.id && joinStatus(j, group, nowMs) === "참여");
}

/** 지금 보이는 글만 (보일 시각이 지난 글), 오래된 순서 */
export function visibleMessages(messages: readonly ChatMessage[], nowMs: number): ChatMessage[] {
  return messages
    .filter((m) => Date.parse(m.createdAt) <= nowMs)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
}

/** 가상 참여자의 답글 후보 (건강·효과를 약속하거나 개인정보를 묻는 말은 넣지 않는다) */
export const VIRTUAL_REPLIES = [
  "안녕하세요! 이번 모임 기대돼요 🙂",
  "저도 참여해요. 편한 운동복이면 충분할 것 같아요.",
  "시간 맞춰서 들어올게요!",
  "처음이라 조금 떨리지만 같이 해봐요.",
  "시작 전에 스트레칭부터 하면 좋겠어요.",
  "좋은 생각이에요, 저도 그렇게 할게요.",
] as const;

/** 가상 참여자 닉네임들: 가상 호스트(있으면)와 가상 참여자 */
function virtualVoices(group: Group, allJoins: readonly GroupJoin[], nowMs: number): string[] {
  const names: string[] = [];
  const host = VIRTUAL_PROFILES.find((p) => p.id === group.hostId);
  if (host) names.push(host.nickname);
  for (const id of virtualMemberIds(group, allJoins, nowMs)) {
    const name = VIRTUAL_PROFILES.find((p) => p.id === id)?.nickname;
    if (name) names.push(name);
  }
  return names;
}

export type SendResult = { ok: true; messages: ChatMessage[] } | { ok: false; message: string };

/**
 * 글을 보낸다. 내 글과, 가상 참여자가 있으면 2초 뒤에 보일 답글 하나를 더한 새 목록을 돌려준다.
 * @param existing 지금 저장된 이 방의 글 전체 (보일 시각이 아직 안 된 글 포함)
 */
export function sendMessage(
  me: Pick<Profile, "nickname">,
  group: Group,
  existing: readonly ChatMessage[],
  allJoins: readonly GroupJoin[],
  text: string,
  nowMs: number,
): SendResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: false, message: "보낼 글을 입력해 주세요." };
  if (trimmed.length > MAX_MESSAGE_LENGTH) return { ok: false, message: `글은 ${MAX_MESSAGE_LENGTH}자까지 보낼 수 있어요.` };

  const mine: ChatMessage = {
    id: `msg-${nowMs}-${Math.random().toString(36).slice(2, 8)}`,
    groupId: group.id,
    sender: me.nickname,
    virtual: false,
    text: trimmed,
    createdAt: new Date(nowMs).toISOString(),
  };
  const added = [mine];

  const voices = virtualVoices(group, allJoins, nowMs);
  if (voices.length > 0) {
    const repliesSoFar = existing.filter((m) => m.virtual).length;
    added.push({
      id: `msg-${nowMs}-r${Math.random().toString(36).slice(2, 8)}`,
      groupId: group.id,
      sender: voices[repliesSoFar % voices.length],
      virtual: true,
      text: VIRTUAL_REPLIES[repliesSoFar % VIRTUAL_REPLIES.length],
      createdAt: new Date(nowMs + REPLY_DELAY_MS).toISOString(),
    });
  }
  return { ok: true, messages: [...existing, ...added].slice(-MAX_MESSAGES) };
}

/** 바깥에서 온 값(브라우저 저장소)에서 올바른 글만 골라낸다. 길이가 넘는 글은 잘라서 쓰지 않고 버린다. */
export function sanitizeMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) return [];
  const result: ChatMessage[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const m = item as Record<string, unknown>;
    if (
      typeof m.id !== "string" ||
      typeof m.groupId !== "string" ||
      typeof m.sender !== "string" ||
      typeof m.virtual !== "boolean" ||
      typeof m.text !== "string" ||
      m.text.length === 0 ||
      m.text.length > MAX_MESSAGE_LENGTH ||
      typeof m.createdAt !== "string" ||
      Number.isNaN(Date.parse(m.createdAt))
    ) {
      continue;
    }
    result.push({ id: m.id, groupId: m.groupId, sender: m.sender, virtual: m.virtual, text: m.text, createdAt: m.createdAt });
  }
  return result.slice(-MAX_MESSAGES);
}
