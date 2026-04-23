import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { Badge, Dropdown, Popover, message } from 'antd';
import PageOutletTransition from '@/components/shell/PageOutletTransition';
import ScrollToTop from '@/components/shell/ScrollToTop';
import {
  ROLE_LABELS,
  appealService,
  canAccessAdminRoute,
  canUseLeaderWorkbench,
  notificationService,
  type InboxItem,
} from '@/mock';
import { useAppStore } from '@/store';
import { usePreferencesStore } from '@/store/preferencesStore';

type NavDef = { key: string; icon: string; label: string; end?: boolean; badge?: number };
type AdminNavGroupDef = { id: string; label: string; icon: string; items: NavDef[] };

function navActive(pathname: string, key: string, end?: boolean) {
  if (end) return pathname === key;
  return pathname === key || pathname.startsWith(`${key}/`);
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const [pendingCount, setPendingCount] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [leaderDeskBadge, setLeaderDeskBadge] = useState(0);
  const openPreferences = usePreferencesStore((s) => s.openPreferences);

  useEffect(() => {
    const load = () => {
      if (!currentUser) return;
      void appealService.getPendingCountForViewer(currentUser).then(setPendingCount);
      void notificationService.unreadCount(currentUser).then(setMsgUnread);
      void notificationService.list(currentUser).then(setInbox);
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

  const navGroups = useMemo((): AdminNavGroupDef[] => {
    const role = currentUser?.role;
    const allow = (path: string) => (role ? canAccessAdminRoute(role, path) : false);

    const handlingItems: NavDef[] = [
      { key: '/admin/dashboard', icon: 'dashboard', label: '综合看板', end: true },
      { key: '/admin/appeals', icon: 'gavel', label: '诉求受理', badge: pendingCount },
    ];
    if (currentUser && canUseLeaderWorkbench(currentUser.role) && allow('/admin/leader-desk')) {
      handlingItems.push({
        key: '/admin/leader-desk',
        icon: 'assignment_ind',
        label: '领导工作台',
        badge: leaderDeskBadge,
      });
    }

    const raw: AdminNavGroupDef[] = [
      { id: 'handling', label: '受理办理', icon: 'task_alt', items: handlingItems },
      {
        id: 'reports',
        label: '数据研判',
        icon: 'monitoring',
        items: [
          { key: '/admin/statistics', icon: 'bar_chart', label: '数据统计' },
          { key: '/admin/weekly-report', icon: 'description', label: '周报生成' },
        ],
      },
      {
        id: 'master',
        label: '服务资源',
        icon: 'database',
        items: [
          { key: '/admin/departments', icon: 'domain', label: '部门管理' },
          { key: '/admin/dept-showcase', icon: 'storefront', label: '部门风采' },
          { key: '/admin/types', icon: 'category', label: '问题类型' },
        ],
      },
      {
        id: 'flow',
        label: '流程权限',
        icon: 'account_tree',
        items: [
          { key: '/admin/forms', icon: 'edit_note', label: '填报页面' },
          { key: '/admin/workflow', icon: 'schema', label: '业务流程' },
          { key: '/admin/roles', icon: 'supervised_user_circle', label: '业务角色' },
          { key: '/admin/abnormal-users', icon: 'person_alert', label: '异常用户' },
        ],
      },
      {
        id: 'content',
        label: '内容智能',
        icon: 'auto_awesome',
        items: [
          { key: '/admin/notices-admin', icon: 'campaign', label: '公告管理' },
          { key: '/admin/ui-config', icon: 'palette', label: '界面管理' },
          { key: '/admin/knowledge', icon: 'menu_book', label: '知识库' },
          { key: '/admin/robots', icon: 'smart_toy', label: '机器人' },
        ],
      },
      {
        id: 'system',
        label: '系统运维',
        icon: 'dns',
        items: [
          { key: '/admin/settings', icon: 'settings', label: '系统设置' },
          { key: '/admin/system', icon: 'fact_check', label: '操作审计' },
          { key: '/admin/scheduler', icon: 'schedule', label: '调度管理' },
        ],
      },
    ];

    if (!role) return [];
    return raw
      .map((g) => ({ ...g, items: g.items.filter((i) => allow(i.key)) }))
      .filter((g) => g.items.length > 0);
  }, [pendingCount, leaderDeskBadge, currentUser]);

  const selectedNav = (() => {
    for (const g of navGroups) {
      for (const i of g.items) {
        if (navActive(pathname, i.key, i.end)) return { group: g, item: i };
      }
    }
    return null;
  })();

  const userMenu: MenuProps = {
    items: [
      {
        key: 'prefs',
        icon: <span className="material-symbols-outlined text-[18px] leading-none">tune</span>,
        label: '个性化设置',
      },
      {
        key: 'portal',
        icon: <span className="material-symbols-outlined text-[18px] leading-none">home</span>,
        label: '返回用户端',
      },
      { type: 'divider' },
      {
        key: 'logout',
        danger: true,
        icon: <span className="material-symbols-outlined text-[18px] leading-none">logout</span>,
        label: '退出登录',
      },
    ],
    onClick: ({ key }) => {
      if (key === 'prefs') {
        openPreferences();
      } else if (key === 'portal') {
        navigate('/user/home');
      } else if (key === 'logout') {
        logout();
        message.success('已退出登录');
        navigate('/admin/login');
      }
    },
  };

  const openInboxItem = async (item: InboxItem) => {
    if (!currentUser) return;
    try {
      await notificationService.markRead(item.id, currentUser);
      setNotifOpen(false);
      if (item.href) navigate(item.href);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '操作失败');
    }
  };

  const notifPanel = (
    <div
      className="w-[min(22rem,calc(100vw-1.25rem))] overflow-hidden rounded-2xl border border-outline-variant/[0.18] bg-surface shadow-[0_12px_40px_-12px_rgba(15,23,42,0.35)]"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="border-b border-outline-variant/15 px-4 py-3 text-sm font-bold text-on-surface">消息中心</div>
      <div className="max-h-80 overflow-y-auto">
        {inbox.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-on-surface-variant">暂无消息</p>
        ) : (
          inbox.slice(0, 16).map((item) => (
            <button
              key={item.id}
              type="button"
              className="flex w-full flex-col items-stretch gap-0.5 border-b border-outline-variant/10 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-container-low"
              style={{ opacity: item.read ? 0.62 : 1 }}
              onClick={() => void openInboxItem(item)}
            >
              <span className="font-medium text-on-surface">
                {!item.read ? <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" /> : null}
                {item.title}
              </span>
              <span className="text-xs tabular-nums text-on-surface-variant">{item.createTime}</span>
            </button>
          ))
        )}
      </div>
      {inbox.length > 0 ? (
        <button
          type="button"
          className="w-full border-t border-outline-variant/15 bg-surface-container-lowest/40 px-3 py-2.5 text-center text-xs font-semibold text-primary transition-colors hover:bg-surface-container-high/35"
          onClick={() =>
            void notificationService
              .markAllRead(currentUser!)
              .then(() => {
                setNotifOpen(false);
                message.success('已全部标为已读');
              })
              .catch((e) => message.error(e instanceof Error ? e.message : '操作失败'))
          }
        >
          全部已读
        </button>
      ) : null}
    </div>
  );

  const navButton = (item: NavDef) => {
    const active = navActive(pathname, item.key, item.end);
    return (
      <button
        key={item.key}
        type="button"
        className={`admin-nav-item flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-bold ${
          active ? 'admin-nav-item-active' : 'text-on-surface-variant'
        }`}
        onClick={() => navigate(item.key)}
      >
        <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
          {item.icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        {item.badge != null && item.badge > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-black text-white">
            {item.badge > 99 ? '99+' : item.badge}
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="admin-app admin-workbench-shell min-h-screen font-body text-on-surface">
      <ScrollToTop />
      <div className="flex min-h-screen">
        <aside className="admin-side-nav fixed inset-y-0 left-0 z-40 hidden w-72 flex-col px-4 py-5 lg:flex">
          <button type="button" className="mb-6 flex items-center gap-3 rounded-[1.5rem] p-2 text-left" onClick={() => navigate('/admin/dashboard')}>
            <div className="gov-seal-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl">
              <span className="material-symbols-outlined">admin_panel_settings</span>
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-headline text-base font-black text-primary">接诉即办</h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">Workbench Center</p>
            </div>
          </button>

          <div className="admin-sidebar-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="space-y-5">
              {navGroups.map((group) => (
                <section key={group.id}>
                  <div className="mb-2 flex items-center gap-2 px-2 text-[11px] font-black uppercase tracking-[0.12em] text-on-surface-variant/78">
                    <span className="material-symbols-outlined text-[16px]">{group.icon}</span>
                    {group.label}
                  </div>
                  <div className="space-y-1">{group.items.map(navButton)}</div>
                </section>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[1.5rem] border border-outline-variant/35 bg-surface-container-lowest/70 p-3">
            <p className="text-xs font-bold text-on-surface">{currentUser?.nickname ?? '未登录'}</p>
            <p className="mt-1 text-[11px] text-on-surface-variant">{currentUser ? ROLE_LABELS[currentUser.role] : ''}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-72">
          <header className="sticky top-0 z-30 px-4 pt-4 lg:px-6">
            <div className="admin-command-card rounded-[1.6rem] px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary">
                    {selectedNav?.group.label ?? '管理端'}
                  </p>
                  <h2 className="mt-0.5 truncate font-headline text-xl font-black text-on-surface">
                    {selectedNav?.item.label ?? '综合工作台'}
                  </h2>
                </div>

                <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto lg:hidden">
                  {navGroups.flatMap((g) => g.items).map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                        navActive(pathname, item.key, item.end) ? 'bg-primary text-white' : 'bg-surface-container-low text-on-surface-variant'
                      }`}
                      onClick={() => navigate(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="ml-auto flex shrink-0 items-center gap-2">
                  {currentUser ? (
                    <Popover
                      open={notifOpen}
                      onOpenChange={setNotifOpen}
                      trigger={['click']}
                      placement="bottomRight"
                      content={notifPanel}
                    >
                      <button
                        type="button"
                        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-outline-variant/[0.28] bg-surface-container-lowest/70 outline-none transition-colors hover:border-primary/35 hover:bg-surface-container-high/40 focus-visible:ring-2 focus-visible:ring-primary/25"
                        aria-label={msgUnread > 0 ? `站内消息：${msgUnread} 条未读` : '站内消息'}
                      >
                        <Badge count={msgUnread} size="small" offset={[-2, 2]}>
                          <span className="material-symbols-outlined text-[20px] text-on-surface-variant" aria-hidden>
                            notifications
                          </span>
                        </Badge>
                      </button>
                    </Popover>
                  ) : null}
                  <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
                    <button
                      type="button"
                      className="flex shrink-0 items-center gap-2 rounded-2xl border border-outline-variant/[0.28] bg-surface-container-lowest/70 px-2 py-1.5 outline-none transition-colors hover:border-primary/35 hover:bg-surface-container-high/40 focus-visible:ring-2 focus-visible:ring-primary/25 md:px-2.5 md:py-2"
                      aria-haspopup="menu"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-headline text-xs font-bold text-primary md:h-9 md:w-9">
                        {currentUser?.nickname?.slice(0, 1) ?? '管'}
                      </div>
                      <div className="hidden min-w-0 max-w-[10rem] text-left sm:block">
                        <p className="truncate text-[13px] font-bold text-on-surface">{currentUser?.nickname ?? '未登录'}</p>
                        <p className="truncate text-[11px] text-on-surface-variant">{currentUser ? ROLE_LABELS[currentUser.role] : ''}</p>
                      </div>
                      <span className="material-symbols-outlined hidden text-[18px] text-on-surface-variant/70 sm:block" aria-hidden>
                        expand_more
                      </span>
                    </button>
                  </Dropdown>
                </div>
              </div>
            </div>
          </header>

          <main className="p-4 lg:p-6">
            <div className="mx-auto max-w-[var(--layout-max,1600px)]">
              <PageOutletTransition>
                <Outlet />
              </PageOutletTransition>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
