import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { notificationService } from '@/mock';
import { useAppStore } from '@/store';
import ScrollToTop from '@/components/shell/ScrollToTop';
import PageOutletTransition from '@/components/shell/PageOutletTransition';
import PortalFeedbackHost from '@/pages/user/PC/shell/PortalFeedbackHost';

const tabs = [
  { key: '/user/home', label: '首页', icon: 'home' as const },
  { key: '/user/appeal/list', label: '公开', icon: 'forum' as const },
  { key: '/user/appeal/create', label: '提问', icon: 'add_circle' as const },
  { key: '/user/more', label: '服务', icon: 'apps' as const },
  { key: '/user/appeal/my', label: '我的', icon: 'person' as const },
];

const hideTabPattern = /\/user\/(login|register|forgot-password)(\/)?$/;

export default function MobileLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const hideTab = hideTabPattern.test(location.pathname);
  const currentUser = useAppStore((s) => s.currentUser);
  const [myUnread, setMyUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeTab = normalizeTabKey(location.pathname);
  /** 嵌套 iframe 内 env(safe-area-inset-*) 常为 0（如桌面端设备框预览），需保底高度以免内容与装饰性灵动岛/刘海重叠 */
  const embeddedPreview =
    typeof window !== 'undefined' && window.self !== window.top;

  useEffect(() => {
    document.body.classList.add('jsjb-mobile-shell');
    return () => document.body.classList.remove('jsjb-mobile-shell');
  }, []);

  useEffect(() => {
    const load = () => {
      if (currentUser?.id) {
        void notificationService.unreadCount(currentUser).then(setMyUnread);
      } else {
        setMyUnread(0);
      }
    };
    load();
    window.addEventListener('jsjb-mock-updated', load);
    return () => window.removeEventListener('jsjb-mock-updated', load);
  }, [currentUser]);

  return (
    <div className="portal-mobile m-service-hall-bg flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-surface font-body text-on-surface antialiased">
      {/*
        上安全区放在滚动容器外，避免内部 sticky top-0 顶栏贴到刘海/Dynamic Island 下沿。
        viewport-fit=cover 时 env(safe-area-inset-top) 才会生效（见 index.html）。
        iframe 预览：env 常为 0，用 max(..., 3.5rem) 对齐约 iPhone 14 Pro 状态栏+岛区域。
      */}
      <div
        className="flex min-h-0 flex-1 flex-col bg-transparent"
        style={{
          paddingTop: embeddedPreview
            ? 'max(env(safe-area-inset-top, 0px), 3.5rem)'
            : 'max(0px, env(safe-area-inset-top, 0px))',
        }}
      >
        <div
          className="mobile-content m-portal-scroll-y min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
          ref={scrollRef}
          style={{
            paddingBottom: hideTab
              ? 'max(0px, env(safe-area-inset-bottom, 0px))'
              : 'calc(5.75rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <ScrollToTop scrollContainerRef={scrollRef} />
          <PageOutletTransition>
            <Outlet />
          </PageOutletTransition>
        </div>
      </div>

      <PortalFeedbackHost />

      {!hideTab ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-[max(10px,env(safe-area-inset-bottom,0px))] pt-1">
          <nav
            className="m-mobile-tab-bar m-service-dock pointer-events-auto flex h-[3.65rem] w-full max-w-[min(100%,440px)] items-stretch gap-0.5 rounded-[1.45rem] px-1"
            role="tablist"
            aria-label="主导航"
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              const showNotifyDot = tab.key === '/user/appeal/my' && myUnread > 0;
              return (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`m-mobile-tab m-portal-tap-clear relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1rem] py-1 transition-[color,background-color,transform] duration-200 active:scale-[0.97] ${
                    active
                      ? 'bg-primary text-white ring-1 ring-primary/25 shadow-sm'
                      : 'text-on-surface-variant hover:bg-secondary/10'
                  }`}
                  onClick={() => navigate(tab.key)}
                >
                  {showNotifyDot ? (
                    <span className="absolute right-[26%] top-1 h-2 w-2 rounded-full bg-accent shadow-sm ring-2 ring-surface" />
                  ) : null}
                  <span
                    className="material-symbols-outlined text-[20px] leading-none sm:text-[22px]"
                    style={{
                      fontVariationSettings: active
                        ? "'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24"
                        : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
                    }}
                  >
                    {tab.icon}
                  </span>
                  <span className="max-w-[4rem] truncate text-[10px] font-bold tracking-wide">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      ) : null}

    </div>
  );
}

function normalizeTabKey(pathname: string): string {
  if (pathname.startsWith('/user/home')) return '/user/home';
  if (pathname.startsWith('/user/appeal/list') || pathname.startsWith('/user/appeal/detail')) return '/user/appeal/list';
  if (pathname.startsWith('/user/appeal/create')) return '/user/appeal/create';
  if (pathname.startsWith('/user/appeal/my')) return '/user/appeal/my';
  if (pathname.startsWith('/user/more')) return '/user/more';
  if (
    pathname.startsWith('/user/search') ||
    pathname.startsWith('/user/departments') ||
    pathname.startsWith('/user/notice/') ||
    pathname.startsWith('/user/ai-assistant') ||
    pathname.startsWith('/user/integrations')
  ) {
    return '/user/more';
  }
  const match = tabs.find((t) => pathname === t.key || pathname.startsWith(t.key + '/'));
  return match?.key ?? '/user/home';
}
