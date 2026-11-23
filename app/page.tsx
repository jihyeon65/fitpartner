// Design Ref: §3.1 로그인 — 뼈대만 만든다. 닉네임 입력과 [시작하기]는 PLAN 작업 4번에서 만든다.
import PagePlaceholder from "@/components/PagePlaceholder";

export default function Home() {
  return (
    <PagePlaceholder
      title="핏파트너"
      summary="AI가 잘 맞는 운동 파트너를 찾고, 함께 운동할 방법까지 안내해 드려요."
      planTask="작업 4번"
      willShow={[
        "닉네임 입력칸 1개 (이메일·비밀번호는 받지 않아요)",
        "닉네임이 비어 있으면 눌리지 않는 [시작하기] 버튼",
      ]}
    />
  );
}
