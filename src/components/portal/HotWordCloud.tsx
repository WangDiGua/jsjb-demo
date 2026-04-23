/** 诉求热点词可视化：按频次分级字号与字重（管理端统计 / 原智能助理页复用） */

export default function HotWordCloud({ items }: { items: { word: string; count: number }[] }) {
  const palette = [
    'text-primary',
    'text-secondary',
    'text-[#1c5343] dark:text-emerald-200',
    'text-[#5f4b32] dark:text-stone-200',
    'text-[#9b762d] dark:text-amber-200',
    'text-[#123f66] dark:text-blue-200',
  ];

  if (!items.length) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-outline-variant/35 bg-surface-container-low/40">
        <p className="text-sm text-on-surface-variant">暂无统计数据</p>
      </div>
    );
  }

  const counts = items.map((i) => i.count);
  const max = Math.max(...counts);
  const min = Math.min(...counts);
  const range = max - min || 1;
  const sorted = [...items].sort((a, b) => b.count - a.count);

  return (
    <div className="relative min-h-[240px] overflow-hidden rounded-2xl border border-outline-variant/45 bg-surface-container-lowest shadow-sm dark:border-outline-variant/40">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.55] dark:opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 85% 70% at 18% 25%, rgb(var(--tw-color-primary) / 0.14), transparent 55%), radial-gradient(ellipse 70% 55% at 82% 72%, rgb(var(--tw-color-secondary) / 0.12), transparent 50%), radial-gradient(ellipse 50% 40% at 50% 88%, rgb(var(--tw-color-primary) / 0.06), transparent 45%)',
        }}
        aria-hidden
      />
      <div className="relative px-4 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-baseline justify-center gap-x-1 gap-y-6 sm:gap-x-2 sm:gap-y-8 [align-content:center]">
          {sorted.map((w, i) => {
            const t = (w.count - min) / range;
            const fontPx = Math.round(15 + t * 34);
            const fontW = 550 + Math.round(t * 350);
            const rot = ((i * 13 + w.word.length * 3) % 15) - 7;
            const color = palette[i % palette.length] ?? 'text-primary';
            const z = Math.round(10 + t * 20);
            return (
              <span
                key={w.word}
                className="group inline-flex cursor-default flex-col items-center px-1.5 text-center leading-none tracking-tight"
                style={{ transform: `rotate(${rot}deg) translateZ(0)`, zIndex: z }}
                title={`「${w.word}」在统计中出现 ${w.count} 次`}
              >
                <span
                  className={`max-w-[10rem] transition-transform duration-200 group-hover:scale-110 ${color} drop-shadow-[0_1px_1px_rgb(0_0_0_/0.06)] dark:drop-shadow-[0_1px_2px_rgb(0_0_0_/0.25)]`}
                  style={{ fontSize: `${fontPx}px`, fontWeight: fontW, lineHeight: 1.05 }}
                >
                  {w.word}
                </span>
                <span className="mt-1.5 rounded-full bg-surface/95 px-2 py-0.5 text-[10px] font-bold tabular-nums text-on-surface-variant shadow-sm ring-1 ring-outline-variant/25 backdrop-blur-sm dark:bg-surface-container/95">
                  {w.count}
                </span>
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
