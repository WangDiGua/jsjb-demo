import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { Dropdown, Menu, message } from 'antd';
import { appealService, notificationService, ROLE_LABELS, canUseLeaderWorkbench } from '@/mock';
import { useAppStore } from '@/store';
import { usePreferencesStore } from '@/store/preferencesStore';
import ScrollToTop from '@/components/shell/ScrollToTop';
import PageOutletTransition from '@/components/shell/PageOutletTransition';

type NavDef = { key: string; icon: string; label: string; end?: boolean; badge?: number };

type AdminNavGroupDef = { id: string; label: string; icon: string; items: NavDef[] };

function navActive(pathname: string, key: string, end?: boolean) {
  if (end) return pathname === key;
  return pathname === key || pathname.startsWith(`${key}/`);
}

function buildMenuItems(navGroups: AdminNavGroupDef[]): MenuProps['items'] {
  return navGroups.map((g) => ({
    key: g.id,
    label: g.label,
    icon: (
      <span className="material-symbols-outlined text-[18px] leading-none text-current" aria-hidden>
        {g.icon}
      </span>
    ),
    children: g.items.map((i) => ({
      key: i.key,
      label: (
        <span className="flex min-w-0 items-center gap-2">
          <span className="material-symbols-outlined shrink-0 text-[18px] leading-none text-on-surface-variant" aria-hidden>
            {i.icon}
          </span>
          <span className="min-w-0 flex-1">{i.label}</span>
          {i.badge != null && i.badge > 0 ? (
            <span className="inline-flex h-5 shrink-0 select-none items-center justify-center self-center rounded-md bg-primary/90 px-1.5 text-[10px] font-semibold tabular-nums leading-none text-white whitespace-nowrap">
              {i.badge > 99 ? '99+' : i.badge}
            </span>
          ) : null}
        </span>
      ),
    })),
  }));
}

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const currentUser = useAppStore((s) => s.currentUser);
  const logout = useAppStore((s) => s.logout);
  const [pendingCount, setPendingCount] = useState(0);
  const [msgUnread, setMsgUnread] = useState(0);
  const [leaderDeskBadge, setLeaderDeskBadge] = useState(0);
  const openPreferences = usePreferencesStore((s) => s.openPreferences);

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

  const navGroups = useMemo((): AdminNavGroupDef[] => {
    const handlingItems: NavDef[] = [
      { key: '/admin/dashboard', icon: 'dashboard', label: '数据概览', end: true },
      { key: '/admin/appeals', icon: 'gavel', label: '诉求管理', badge: pendingCount },
    ];
    if (currentUser && canUseLeaderWorkbench(currentUser.role)) {
      handlingItems.push({
        key: '/admin/leader-desk',
        icon: 'assignment_ind',
        label: '领导工作台',
        badge: leaderDeskBadge,
      });
    }
    return [
      { id: 'handling', label: '诉求办理', icon: 'task_alt', items: handlingItems },
      {
        id: 'reports',
        label: '数据与报表',
        icon: 'monitoring',
        items: [
          { key: '/admin/statistics', icon: 'bar_chart', label: '数据统计' },
          { key: '/admin/weekly-report', icon: 'description', label: '周报生成' },
        ],
      },
      {
        id: 'master',
        label: '主数据',
        icon: 'database',
        items: [
          { key: '/admin/departments', icon: 'domain', label: '部门管理' },
          { key: '/admin/dept-showcase', icon: 'storefront', label: '部门风采' },
          { key: '/admin/types', icon: 'category', label: '问题类型' },
        ],
      },
      {
        id: 'flow',
        label: '流程与权限',
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
        label: '内容与智能化',
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
  }, [pendingCount, leaderDeskBadge, currentUser]);

  const menuItems = useMemo(() => buildMenuItems(navGroups), [navGroups]);

  const selectedKey = useMemo(() => {
    for (const g of navGroups) {
      for (const i of g.items) {
        if (navActive(pathname, i.key, i.end)) return i.key;
      }
    }
    return pathname;
  }, [pathname, navGroups]);

  const onMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (typeof key === 'string' && key.startsWith('/')) {
      navigate(key);
    }
  };

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

  return (
    <div className="admin-app min-h-screen bg-surface font-body text-on-surface">
      <ScrollToTop />

      <header className="sticky top-0 z-50 border-b border-outline-variant/[0.16] bg-surface/95 shadow-[0_1px_0_rgb(15_23_42/0.04)] backdrop-blur-md dark:border-outline-variant/20 dark:shadow-[0_1px_0_rgb(0_0_0/0.2)]">
        <div className="mx-auto flex max-w-[var(--layout-max,1600px)] items-center gap-2 px-3 py-1.5 md:gap-3 md:px-4 md:py-2">
          <div className="flex min-w-0 shrink-0 items-center gap-2 md:gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm shadow-primary/20 md:h-10 md:w-10 md:rounded-xl">
              <span className="material-symbols-outlined text-[18px] leading-none md:text-[20px]" style={{ fontVariationSettings: "'FILL' 0, 'wght' 500" }}>
                admin_panel_settings
              </span>
            </div>
            <div className="min-w-0 leading-tight">
              <h1 className="truncate font-headline text-sm font-bold text-primary md:text-[15px]">接诉即办</h1>
              <p className="hidden text-[11px] text-on-surface-variant/80 sm:block">管理终端 · 顶部导航</p>
            </div>
          </div>

          <div className="min-w-0 flex-1 overflow-x-auto [-webkit-overflow-scrolling:touch]">
            <Menu
              mode="horizontal"
              items={menuItems}
              selectedKeys={[selectedKey]}
              onClick={onMenuClick}
              className="admin-top-nav-menu min-w-max flex-nowrap border-0 bg-transparent"
            />
          </div>

          <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
            <button
              type="button"
              className="ml-auto flex shrink-0 items-center gap-2 rounded-lg border border-outline-variant/[0.18] bg-surface-container-lowest/60 px-2 py-1.5 outline-none transition-colors hover:border-outline-variant/35 hover:bg-surface-container-high/40 focus-visible:ring-2 focus-visible:ring-primary/25 dark:border-outline-variant/20 dark:bg-surface-container-lowest/35 md:px-2.5 md:py-2"
              aria-haspopup="menu"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-headline text-xs font-bold text-primary md:h-9 md:w-9 dark:bg-primary/18">
                {currentUser?.nickname?.slice(0, 1) ?? '管'}
              </div>
              <div className="hidden min-w-0 max-w-[10rem] text-left sm:block">
                <p className="truncate text-[13px] font-bold text-on-surface">{currentUser?.nickname ?? '未登录'}</p>
                <p className="truncate text-[11px] text-on-surface-variant">
                  {currentUser ? ROLE_LABELS[currentUser.role] : ''}
                  {msgUnread > 0 ? ` · 消息 ${msgUnread}` : ''}
                </p>
              </div>
              <span className="material-symbols-outlined hidden text-[18px] text-on-surface-variant/70 sm:block" aria-hidden>
                expand_more
              </span>
            </button>
          </Dropdown>
        </div>
      </header>

      <div>
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
