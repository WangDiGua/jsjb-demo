import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

export type MobileSubPageScaffoldProps = {
  title: string;
  /** 默认 true；Tab 根页（如服务大厅）可设为 false */
  showBack?: boolean;
  /** 未传时等同 `navigate(-1)` */
  onBack?: () => void;
  right?: ReactNode;
  children: ReactNode;
  /** 内容区额外 class（默认含 px-4） */
  contentClassName?: string;
};

/**
 * 移动端子页统一顶栏：安全区、返回、标题、可选右侧操作。
 * 水平留白由本组件承担；外层 MobileLayout 不应再包一层 px-4。
 */
export default function MobileSubPageScaffold({
  title,
  showBack = true,
  onBack,
  right,
  children,
  contentClassName = '',
}: MobileSubPageScaffoldProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    navigate(-1);
  };

  return (
    <div className="min-h-full bg-surface font-body text-on-surface">
      <header className="sticky top-0 z-40 border-b border-outline-variant/20 bg-surface/92 backdrop-blur-xl m-portal-glass-header dark:border-outline-variant/25">
        <div className="flex min-h-[3.5rem] max-w-full items-center gap-2 pb-1.5 pl-[max(0.5rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))] pt-0.5">
          {showBack ? (
            <button
              type="button"
              className="m-portal-tap-clear flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-on-surface transition-colors active:bg-surface-container-high"
              aria-label="返回"
              onClick={handleBack}
            >
              <span className="material-symbols-outlined text-[24px] leading-none">arrow_back</span>
            </button>
          ) : (
            <span className="w-1 shrink-0" aria-hidden />
          )}
          <h1 className="min-w-0 flex-1 truncate text-center font-headline text-base font-bold text-on-surface">
            {title}
          </h1>
          <div className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-end">{right ?? <span className="w-[44px]" aria-hidden />}</div>
        </div>
      </header>
      <div
        className={`pb-6 pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))] ${contentClassName}`}
      >
        {children}
      </div>
    </div>
  );
}
