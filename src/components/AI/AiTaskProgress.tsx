import { useCallback, useEffect, useRef, useState } from 'react';

/** 请求进行中时约每 100ms 更新；结束时保留最后一次计时时长（便于展示「本次用时」）。 */
export function useRequestStopwatch(isActive: boolean): number {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!isActive) return;
    const t0 = performance.now();
    setElapsedMs(0);
    const id = window.setInterval(() => {
      setElapsedMs(Math.round(performance.now() - t0));
    }, 100);
    return () => {
      clearInterval(id);
      setElapsedMs(Math.round(performance.now() - t0));
    };
  }, [isActive]);

  return elapsedMs;
}

export function formatAiElapsed(ms: number): string {
  const s = ms / 1000;
  if (!Number.isFinite(s) || s < 0) return '0.0 秒';
  if (s < 60) return `${s.toFixed(1)} 秒`;
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m} 分 ${r.toFixed(0)} 秒`;
}

/** 单行计时角标：进行中带脉搏点，结束时仍可显示冻结时长 */
export function AiElapsedRow({
  running,
  elapsedMs,
  className = '',
}: {
  running: boolean;
  elapsedMs: number;
  className?: string;
}) {
  return (
    <div
      className={`mt-2 flex items-center gap-2 border-t border-outline-variant/15 pt-2 text-xs sm:text-[13px] ${className}`}
      role="timer"
      aria-live="polite"
      aria-atomic="true"
      aria-label={running ? `已等待 ${formatAiElapsed(elapsedMs)}` : `本次请求用时 ${formatAiElapsed(elapsedMs)}`}
    >
      <span className="material-symbols-outlined text-[18px] leading-none text-primary">schedule</span>
      {running ? (
        <span className="flex items-center gap-2 font-semibold text-primary">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          已用时
          <span className="font-mono text-sm font-bold tabular-nums tracking-tight text-on-surface">{formatAiElapsed(elapsedMs)}</span>
        </span>
      ) : (
        <span className="font-semibold text-on-surface-variant">
          本次用时
          <span className="ml-1.5 font-mono text-sm font-bold tabular-nums text-on-surface">{formatAiElapsed(elapsedMs)}</span>
        </span>
      )}
    </div>
  );
}

/**
 * 流式大模型调用：区分「连接/首包」与「正文输出」，避免用户误以为卡住。
 */
export type AiStreamPhase = 'idle' | 'connecting' | 'streaming' | 'done';

export function useAiStreamPhase() {
  const [phase, setPhase] = useState<AiStreamPhase>('idle');
  const firstRef = useRef(false);

  const start = useCallback(() => {
    firstRef.current = false;
    setPhase('connecting');
  }, []);

  const onFirstChunk = useCallback(() => {
    if (!firstRef.current) {
      firstRef.current = true;
      setPhase('streaming');
    }
  }, []);

  const finish = useCallback(() => {
    setPhase('done');
  }, []);

  const reset = useCallback(() => {
    firstRef.current = false;
    setPhase('idle');
  }, []);

  return { phase, start, onFirstChunk, finish, reset };
}

/**
 * 通用 AI 任务进度条：让用户始终知道当前处于哪一步（就绪 / 进行中 / 已完成）。
 */
export type AiTaskProgressProps = {
  steps: string[];
  /** 当前进行中的步骤下标（0-based）。其之前的步骤显示为已完成。 */
  activeIndex: number;
  /** 为 true 时全部步骤显示为已完成（如整段任务成功结束）。 */
  allComplete?: boolean;
  /** 辅助说明，显示在步骤下方；同时用于 aria-live 朗读。 */
  helperText?: string;
  className?: string;
  /** 为 true 时在底部显示请求耗时（适用于调用大模型等异步任务）。 */
  showElapsed?: boolean;
  /**
   * `vertical`：固定纵向时间线，适合窄侧栏（避免横向步骤换行挤压）。
   * `horizontal`：宽屏横向串联（大屏表单上方等场景）。
   * 默认 `responsive`：小屏纵向，sm+ 横向。
   */
  layout?: 'responsive' | 'vertical' | 'horizontal';
};

function stepBadge(done: boolean, current: boolean, index: number) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done
          ? 'bg-success/20 text-success'
          : current
            ? 'bg-primary text-white shadow-sm shadow-primary/15'
            : 'bg-surface-container-high text-on-surface-variant'
      }`}
      aria-hidden
    >
      {done ? '✓' : index + 1}
    </span>
  );
}

export function AiTaskProgress({
  steps,
  activeIndex,
  allComplete = false,
  helperText,
  className = '',
  showElapsed = false,
  layout = 'responsive',
}: AiTaskProgressProps) {
  const clampedActive = Math.max(0, Math.min(activeIndex, Math.max(0, steps.length - 1)));
  const elapsedActive = showElapsed && !allComplete && activeIndex >= 0;
  const elapsedMs = useRequestStopwatch(elapsedActive);

  const verticalTimeline = (
    <ol className="m-0 flex list-none flex-col p-0">
      {steps.map((label, i) => {
        const done = allComplete || i < clampedActive;
        const current = !allComplete && i === clampedActive;
        return (
          <li key={label} className="relative flex gap-3 pb-4 last:pb-0">
            {i < steps.length - 1 ? (
              <span
                className="absolute left-[11px] top-7 bottom-0 w-px bg-outline-variant/30 dark:bg-outline-variant/25"
                aria-hidden
              />
            ) : null}
            <div className="relative z-[1] flex shrink-0 flex-col items-center pt-0.5">{stepBadge(done, current, i)}</div>
            <div
              className={`min-w-0 flex-1 rounded-lg px-2 py-1.5 ${
                current
                  ? 'bg-primary/[0.07] ring-1 ring-primary/20 dark:bg-primary/10'
                  : done
                    ? 'bg-success/[0.06]'
                    : ''
              }`}
            >
              <span
                className={`text-xs font-semibold leading-snug sm:text-[13px] ${current ? 'text-primary' : done ? 'text-on-surface' : 'text-on-surface-variant'}`}
              >
                {label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );

  const horizontalRow = (
    <ol className="m-0 flex list-none flex-row flex-wrap items-center gap-1 p-0">
      {steps.map((label, i) => {
        const done = allComplete || i < clampedActive;
        const current = !allComplete && i === clampedActive;
        return (
          <li key={label} className="flex min-w-0 items-center gap-1">
            <div
              className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 ${
                current
                  ? 'bg-primary/12 ring-1 ring-primary/25'
                  : done
                    ? 'bg-success/8 text-on-surface'
                    : 'text-on-surface-variant/80'
              }`}
            >
              {stepBadge(done, current, i)}
              <span className={`text-xs font-semibold leading-tight sm:text-[13px] ${current ? 'text-primary' : ''}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 ? <span className="h-px w-4 shrink-0 bg-outline-variant/40" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );

  const responsiveRow = (
    <ol className="m-0 flex list-none flex-col gap-2 p-0 sm:flex-row sm:flex-wrap sm:items-center sm:gap-1">
      {steps.map((label, i) => {
        const done = allComplete || i < clampedActive;
        const current = !allComplete && i === clampedActive;
        return (
          <li key={label} className="flex min-w-0 items-center gap-1 sm:contents">
            <div
              className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 sm:inline-flex sm:max-w-none ${
                current
                  ? 'bg-primary/12 ring-1 ring-primary/25'
                  : done
                    ? 'bg-success/8 text-on-surface'
                    : 'text-on-surface-variant/80'
              }`}
            >
              {stepBadge(done, current, i)}
              <span className={`text-xs font-semibold leading-tight sm:text-[13px] ${current ? 'text-primary' : ''}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 ? (
              <span className="hidden h-px w-4 shrink-0 bg-outline-variant/40 sm:block" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );

  return (
    <div
      className={`rounded-xl border border-outline-variant/20 bg-surface-container-lowest/80 px-3 py-3 sm:px-4 ${className}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      {helperText ? (
        <p className="mb-3 text-xs font-medium leading-relaxed text-on-surface sm:text-[13px]">{helperText}</p>
      ) : null}
      {layout === 'vertical' ? verticalTimeline : null}
      {layout === 'horizontal' ? horizontalRow : null}
      {layout === 'responsive' ? responsiveRow : null}
      {showElapsed ? <AiElapsedRow running={elapsedActive} elapsedMs={elapsedMs} /> : null}
    </div>
  );
}
