import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { canAccessAdmin } from '@/mock';
import { notificationService } from '@/mock/services';
import { PortalButton, PortalIconButton } from '../ui';
import { usePortalInbox } from './usePortalInbox';
import { usePreferencesStore } from '@/store/preferencesStore';

function NavPill({ to, end, children }: { to: string; end?: boolean; children: React.ReactNode }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        isActive
          ? 'rounded-full bg-primary/10 px-5 py-2 text-sm font-semibold text-primary'
          : 'rounded-full px-5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5 dark:hover:bg-on-surface/10'
      }
    >
      {children}
    </NavLink>
  );
}

export default function PortalHeader() {
  const navigate = useNavigate();
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const logout = useAppStore((s) => s.logout);
  const { inbox, unread, refreshInbox, openInboxItem, currentUser } = usePortalInbox();
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const openPreferences = usePreferencesStore((s) => s.openPreferences);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/30 glass-panel">
      <nav className="mx-auto flex h-20 max-w-[var(--layout-max,1600px)] items-center justify-between px-[var(--layout-px,2rem)]">
        <Link to="/user/home" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-headline text-lg font-extrabold tracking-tight text-primary">兰途接诉即办</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">校园共治门户</span>
          </div>
        </Link>

        <div className="hidden items-center space-x-1 font-semibold lg:flex">
          <NavPill to="/user/home" end>
            共治首页
          </NavPill>
          <NavPill to="/user/departments">服务大厅</NavPill>
          <NavPill to="/user/appeal/list">诉求公开</NavPill>
          <NavPill to="/user/search">效能看板</NavPill>
          <NavPill to="/user/ai-assistant">智能问答</NavPill>
          <NavPill to="/user/integrations">系统对接</NavPill>
          {isLoggedIn && currentUser && canAccessAdmin(currentUser.role) ? (
            <NavPill to="/admin">后台管理</NavPill>
          ) : null}
          <a
            href="/mobile-frame"
            className="rounded-full px-5 py-2 text-sm font-semibold text-on-surface transition-colors hover:bg-on-surface/5 dark:hover:bg-on-surface/10"
          >
            移动端
          </a>
        </div>

        <div className="flex items-center gap-3">
          <PortalIconButton type="button" aria-label="个性化设置" onClick={openPreferences}>
            <span className="material-symbols-outlined">tune</span>
          </PortalIconButton>
          {isLoggedIn && currentUser ? (
            <>
              <div className="relative" ref={notifRef}>
                <PortalIconButton
                  className="group relative"
                  aria-label="通知"
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotifOpen((v) => !v);
                  }}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unread > 0 ? (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-accent" />
                  ) : null}
                </PortalIconButton>
                {notifOpen ? (
                  <div
                    className="glass-panel absolute right-0 mt-2 w-80 overflow-hidden rounded-2xl border border-outline-variant/30 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="border-b border-outline-variant/20 px-4 py-3 text-sm font-bold text-on-surface">
                      消息中心
                    </div>
                    <div className="max-h-80 overflow-y-auto bg-surface-container-lowest/50 dark:bg-surface-container-low/45">
                      {inbox.length === 0 ? (
                        <p className="px-4 py-8 text-center text-sm text-on-surface-variant">暂无消息</p>
                      ) : (
                        inbox.slice(0, 12).map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className="flex w-full flex-col items-stretch gap-0.5 border-b border-outline-variant/10 px-4 py-3 text-left text-sm transition-colors hover:bg-surface-container-lowest/80 dark:hover:bg-surface-container-low/5"
                            style={{ opacity: item.read ? 0.65 : 1 }}
                            onClick={() => void openInboxItem(item)}
                          >
                            <span className="font-medium text-on-surface">
                              {!item.read ? <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-accent align-middle" /> : null}
                              {item.title}
                            </span>
                            <span className="text-xs text-on-surface-variant">{item.createTime}</span>
                          </button>
                        ))
                      )}
                    </div>
                    {inbox.length > 0 ? (
                      <PortalButton
                        variant="ghost"
                        size="sm"
                        className="w-full rounded-none border-t border-outline-variant/20 py-2.5 text-xs font-semibold text-primary hover:bg-surface-container-lowest/60 dark:hover:bg-surface-container-low/5"
                        onClick={() => void notificationService.markAllRead(currentUser.id).then(() => refreshInbox())}
                      >
                        全部已读
                      </PortalButton>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="mx-1 h-8 w-px bg-outline-variant" />
              <div className="flex items-center gap-2">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt=""
                    className="h-9 w-9 rounded-full border-2 border-outline-variant/30 object-cover"
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {currentUser.nickname[0]}
                  </span>
                )}
                <span className="hidden max-w-[120px] truncate text-sm font-semibold sm:inline">{currentUser.nickname}</span>
              </div>
              <PortalButton
                variant="outline"
                size="sm"
                className="rounded-full px-4"
                onClick={() => {
                  logout();
                  navigate('/user/home');
                }}
              >
                退出
              </PortalButton>
            </>
          ) : (
            <>
              <PortalIconButton aria-label="通知" onClick={() => navigate('/user/login')}>
                <span className="material-symbols-outlined">notifications</span>
              </PortalIconButton>
              <div className="mx-1 h-8 w-px bg-outline-variant" />
              <PortalButton variant="dark" size="md" className="rounded-full px-4" onClick={() => navigate('/user/login')}>
                <span className="material-symbols-outlined text-[20px]">person</span>
                登录个人中心
              </PortalButton>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
