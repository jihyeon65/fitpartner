// Design Ref: §3 화면 구성 — 각 화면의 뼈대(제목과 "여기에 무엇이 보일지" 안내)
// Plan: 작업 2번 "기본 화면 틀" — 실제 내용은 PLAN의 해당 작업에서 채운다.

type Props = {
  /** 화면 제목 */
  title: string;
  /** 화면이 하는 일 한 줄 */
  summary: string;
  /** DESIGN 3번 화면 구성에서 가져온, 앞으로 이 자리에 보일 것들 */
  willShow: string[];
  /** 이 화면을 실제로 만드는 PLAN 작업 번호 */
  planTask: string;
};

export default function PagePlaceholder({ title, summary, willShow, planTask }: Props) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{title}</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">{summary}</p>
      </div>

      <div className="rounded-lg border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          준비 중인 화면이에요 · PLAN {planTask}에서 만들어요
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
          {willShow.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
