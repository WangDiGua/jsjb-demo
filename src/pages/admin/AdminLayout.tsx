import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Outlet, useNavigate, useLocation, NavLink } from 'react-router-dom';
import { appealService, notificationService, ROLE_LABELS, canUseLeaderWorkbench } from '@/mock';
import { useAppStore } from '@/store';
import { usePreferencesStore } from '@/store/preferencesStore';
import ScrollToTop from '@/components/shell/ScrollToTop';
import PageOutletTransition from '@/components/shell/PageOutletTransition';

type NavDef = { key: string; icon: string; label: string; end?: boolean; badge?: number };

function navActive(pathname: string, key: string, end?: boolean) {
  if (end) return pathname === key;
  return pathname === key || pathname.startsWith(`${key}/`);
}

function SidebarNavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavDef;
  pathname: string;
  onNavigate: () => void;
}) {
  const active = navActive(pathname, item.key, item.end);
  return (
    <NavLink
      to={item.key}
      end={item.end}
      onClick={onNavigate}
      className={`admin-sidebar-nav-item group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-colors duration-150 ${
        active
          ? 'bg-primary/[0.12] text-primary shadow-[inset_0_0_0_1px_rgb(var(--tw-color-primary)/0.18)] dark:bg-primary/20 dark:text-primary dark:shadow-[inset_0_0_0_1px_rgb(var(--tw-color-primary)/0.28)]'
          : 'text-on-surface-variant hover:bg-surface-container-high/90 hover:text-on-surface dark:hover:bg-surface-container-high/70'
      }`}
    >
      <span
        className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 rounded-r-full transition-opacity ${
          active ? 'bg-primary opacity-100' : 'opacity-0 group-hover:opacity-40'
        }`}
        aria-hidden
      />
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
          active
            ? 'bg-primary text-white shadow-sm shadow-primary/25'
            : 'bg-surface-container-high text-on-surface-variant group-hover:bg-surface-container group-hover:text-on-surface dark:bg-surface-container dark:text-on-surface-variant'
        }`}
      >
        <span
          className="material-symbols-outlined text-[20px] leading-none"
          style={{ fontVariationSettings: active ? "'FILL' 0, 'wght' 500" : "'FILL' 0, 'wght' 400" }}
        >
          {item.icon}
        </span>
      </span>
      <span className="min-w-0 flex-1 truncate font-body tracking-tight">{item.label}</span>
      {item.badge != null && item.badge > 0 ? (
        <span className="ml-1 shrink-0 rounded-md bg-primary px-1.5 py-0.5 text-center text-[10px] font-bold tabular-nums text-white shadow-sm">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      ) : null}
    </NavLink>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="admin-sidebar-section">
      <div className="mb-2 flex items-center gap-2 px-1 pt-1">
        <span className="h-px min-w-[12px] flex-1 bg-gradient-to-r from-transparent to-outline-variant/40" aria-hidden />
        <span className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-on-surface-variant/55">{title}</span>
        <span className="h-px min-w-[12px] flex-1 bg-gradient-to-l from-transparent to-outline-variant/40" aria-hidden />
      </div>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

const extDefs: NavDef[] = [
  { key: '/admin/forms', icon: 'edit_note', label: '填报页面' },
  { key: '/admin/workflow', icon: 'schema', label: '业务流程' },
  { key: '/admin/roles', icon: 'supervised_user_circle', label: '业务角色' },
  { key: '/admin/dept-showcase', icon: 'storefront', label: '部门风采管理' },
  { key: '/admin/abnormal-users', icon: 'person_alert', label: '异常用户' },
  { key: '/admin/notices-admin', icon: 'campaign', label: '公告管理' },
  { key: '/admin/ui-config', icon: 'palette', label: '界面管理' },
  { key: '/admin/system', icon: 'tune', label: '系统管理' },
  { key: '/admin/scheduler', icon: 'schedule', label: '调度管理' },
  { key: '/admin/knowledge', icon: 'menu_book', label: '知识库' },
  { key: '/admin/robots', icon: 'smart_toy', label: '机器人' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const [pendingCount, setPendingCount] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);
  const [leaderDeskBadge, setLeaderDeskBadge] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const load = () => {
      if (!currentUser) return;
      void appealService.getPendingCountForViewer(currentUser).then(setPendingCount);
      void notificationService.unreadCount(currentUser.id).then(setMsgUnread);
      if (canUseLeaderWorkbench(currentUser.role)) {
        void appealService.getLeaderDeskTabCounts(currentUser).then((c) => {
          setLeaderDeskBadge(c.pending_instruct + c.pending_supervise);
        });
      } else {
        setLeaderDeskBadge(0);
      }
    };
    load();
    window.addEventListener('jsjb-mock-updated', load);
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener('jsjb-mock-updated', load);
      window.removeEventListener('focus', load);
    };
  }, [currentUser]);

  const coreItems: NavDef[] = useMemo(() => {
    const items: NavDef[] = [
      { key: '/admin/dashboard', icon: 'dashboard', label: '数据概览', end: true },
      { key: '/admin/appeals', icon: 'gavel', label: '诉求管理', badge: pendingCount },
    ];
    if (currentUser && canUseLeaderWorkbench(currentUser.role)) {
      items.push({
        key: '/admin/leader-desk',
        icon: 'assignment_ind',
        label: '领导工作台',
        badge: leaderDeskBadge,
      });
    }
    items.push(
      { key: '/admin/departments', icon: 'domain', label: '部门管理' },
      { key: '/admin/types', icon: 'category', label: '问题类型' },
    );
    return items;
  }, [pendingCount, leaderDeskBadge, currentUser]);

  const coreItems2: NavDef[] = useMemo(
    () => [
      { key: '/admin/statistics', icon: 'bar_chart', label: '数据统计' },
      { key: '/admin/weekly-report', icon: 'description', label: '周报生成' },
      { key: '/admin/settings', icon: 'settings', label: '系统设置' },
    ],
    [],
  );

  const closeMobile = () => setMobileNavOpen(false);
  const openPreferences = usePreferencesStore((s) => s.openPreferences);

  return (
    <div className="admin-app min-h-screen bg-surface font-body text-on-surface">
      <ScrollToTop />
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/25 md:hidden"
          aria-label="关闭菜单"
          onClick={closeMobile}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-full max-w-[min(100vw,20rem)] flex-col border-r border-outline-variant/60 bg-gradient-to-b from-surface-container-low via-surface-container-low to-surface-container/95 shadow-[6px_0_24px_-8px_rgba(15,23,42,0.12)] backdrop-blur-sm transition-[transform] duration-200 dark:border-outline-variant/50 dark:from-surface-container-low dark:via-surface-container-low dark:to-surface-container-low/95 dark:shadow-[6px_0_24px_-8px_rgba(0,0,0,0.35) md:max-w-none md:w-64 md:translate-x-0 lg:w-[272px] ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-outline-variant/40 px-4 pb-4 pt-5 dark:border-outline-variant/35">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/75 text-white shadow-md shadow-primary/25 ring-1 ring-white/20">
            <span className="material-symbols-outlined text-[22px] leading-none" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>
              admin_panel_settings
            </span>
          </div>
          <div className="min-w-0">
            <h1 className="font-headline text-base font-extrabold leading-tight tracking-tight text-primary dark:text-primary">
              兰途接诉即办
            </h1>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-on-surface-variant/65">管理终端</p>
          </div>
        </div>

        <nav className="admin-sidebar-scroll flex-1 space-y-4 overflow-y-auto px-3 pb-4 pt-4">
          <SidebarSection title="工作台">
            {coreItems.map((item) => (
              <SidebarNavLink key={item.key} item={item} pathname={pathname} onNavigate={closeMobile} />
            ))}
            {coreItems2.map((item) => (
              <SidebarNavLink key={item.key} item={item} pathname={pathname} onNavigate={closeMobile} />
            ))}
          </SidebarSection>

          <SidebarSection title="扩展">
            {extDefs.map((item) => (
              <SidebarNavLink key={item.key} item={item} pathname={pathname} onNavigate={closeMobile} />
            ))}
          </SidebarSection>
        </nav>

        <div className="mt-auto shrink-0 space-y-3 border-t border-outline-variant/50 bg-surface-container-low/80 px-3 pb-5 pt-4 backdrop-blur-md dark:border-outline-variant/40 dark:bg-surface-container-low/90">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-outline-variant/70 bg-surface-container-lowest/90 py-2.5 text-[13px] font-semibold text-on-surface shadow-sm transition-colors hover:border-primary/25 hover:bg-surface-container-high/80 dark:border-outline-variant/60 dark:bg-surface-container-low dark:hover:bg-surface-container-high"
            onClick={() => {
              openPreferences();
              closeMobile();
            }}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">tune</span>
            个性化设置
          </button>
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/35 bg-surface-container-lowest/60 px-3 py-2.5 dark:border-outline-variant/30 dark:bg-surface-container-lowest/40">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/12 font-headline text-sm font-bold text-primary ring-2 ring-primary/15 dark:bg-primary/18">
              {currentUser?.nickname?.slice(0, 1) ?? '管'}
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="truncate text-[13px] font-bold text-on-surface">{currentUser?.nickname ?? '未登录'}</p>
              <p className="mt-0.5 truncate text-[11px] text-on-surface-variant">
                {currentUser ? ROLE_LABELS[currentUser.role] : ''}
                {msgUnread > 0 ? ` · 消息 ${msgUnread}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.06] py-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-primary/[0.11] dark:border-primary/25 dark:bg-primary/10 dark:hover:bg-primary/[0.18]"
            onClick={() => {
              logout();
              navigate('/admin/login');
            }}
          >
            <span className="material-symbols-outlined text-[20px] leading-none">logout</span>
            退出登录
          </button>
        </div>
      </aside>

      <div className="md:ml-64 lg:ml-[272px]">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-outline-variant/30 bg-surface/90 px-4 py-3 backdrop-blur-md md:hidden">
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-outline-variant/40 bg-surface-container-lowest text-on-surface shadow-sm dark:bg-surface-container-low"
            aria-label="打开菜单"
            onClick={() => setMobileNavOpen(true)}
          >
            <span className="material-symbols-outlined">menu</span>
          </button>
          <span className="font-headline text-sm font-bold text-on-surface">管理终端</span>
        </header>

        <div className="p-6 md:p-8">
          <div className="mx-auto max-w-[var(--layout-max,1600px)]">
            <PageOutletTransition>
              <Outlet />
            </PageOutletTransition>
          </div>
        </div>
      </div>
    </div>
  );
}
