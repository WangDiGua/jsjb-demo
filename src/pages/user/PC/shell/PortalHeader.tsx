import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { canAccessAdmin } from '@/mock';
import { notificationService } from '@/mock/services';
import { PortalButton, PortalIconButton } from '../ui';
import { usePortalInbox } from './usePortalInbox';
import { usePreferencesStore } from '@/store/preferencesStore';
import { portalToast } from './portalFeedbackStore';
import { adminConfigService } from '@/mock';

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
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const openPreferences = usePreferencesStore((s) => s.openPreferences);
  const [platformTitle, setPlatformTitle] = useState('接诉即办');
  const [platformSub, setPlatformSub] = useState('校园共治门户');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadId = () => {
      void adminConfigService.getPlatformIdentityPublic().then((b) => {
        if (b.platformName?.trim()) setPlatformTitle(b.platformName.trim());
        if (b.schoolName?.trim()) setPlatformSub(b.schoolName.trim());
        setLogoUrl(b.logoDataUrl?.trim() ? b.logoDataUrl.trim() : null);
      });
    };
    loadId();
    window.addEventListener('jsjb-mock-updated', loadId);
    return () => window.removeEventListener('jsjb-mock-updated', loadId);
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(t)) setUserMenuOpen(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  return (
    <header className="fixed top-0 z-50 w-full border-b border-outline-variant/30 glass-panel">
      <nav className="mx-auto flex h-20 max-w-[var(--layout-max,1600px)] items-center justify-between px-[var(--layout-px,2rem)]">
        <Link to="/user/home" className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-white shadow-lg shadow-primary/20">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="material-symbols-outlined">account_balance</span>
            )}
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="font-headline text-lg font-extrabold tracking-tight text-primary">{platformTitle}</span>
            <span className="truncate text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant">{platformSub}</span>
          </div>
        </Link>

        <div className="hidden items-center space-x-1 font-semibold lg:flex">
          <NavPill to="/user/home" end>
            共治首页
          </NavPill>
          <NavPill to="/user/departments">服务大厅</NavPill>
          <NavPill to="/user/appeal/list">诉求公开</NavPill>
          <NavPill to="/user/appeal/my">我的诉求</NavPill>
          <NavPill to="/user/search">效能看板</NavPill>
          <NavPill to="/user/ai-assistant">智能问答</NavPill>
          <NavPill to="/user/integrations">系统对接</NavPill>
        </div>

        <div className="flex items-center gap-3">
          <PortalIconButton type="button" aria-label="个性化设置" onClick={openPreferences}>
            <span className="material-symbols-outlined">tune</span>
          </PortalIconButton>
          {!isLoggedIn ? (
            <PortalIconButton type="button" aria-label="移动端视窗" onClick={() => navigate('/mobile-frame')}>
              <span className="material-symbols-outlined">smartphone</span>
            </PortalIconButton>
          ) : null}
          {isLoggedIn && currentUser ? (
            <>
              <div className="relative" ref={notifRef}>
                <PortalIconButton
                  className="group relative"
                  aria-label={unread > 0 ? `通知，${unread} 条未读` : '通知'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setNotifOpen((v) => !v);
                  }}
                >
                  <span className="material-symbols-outlined">notifications</span>
                  {unread > 0 ? (
                    <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold tabular-nums leading-none text-white shadow-sm ring-2 ring-surface dark:ring-surface-container-lowest">
                      {unread > 99 ? '99+' : unread}
                    </span>
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
                        onClick={() =>
                          void notificationService
                            .markAllRead(currentUser.id)
                            .then(() => refreshInbox())
                            .then(() => portalToast.success('已全部标为已读'))
                            .catch((e) => portalToast.error(e instanceof Error ? e.message : '操作失败'))
                        }
                      >
                        全部已读
                      </PortalButton>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="mx-1 h-8 w-px bg-outline-variant" />
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  className="flex max-w-[200px] items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-on-surface/5 dark:hover:bg-on-surface/10"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  aria-label={`账户菜单：${currentUser.nickname}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setUserMenuOpen((v) => !v);
                  }}
                >
                  {currentUser.avatar ? (
                    <img
                      src={currentUser.avatar}
                      alt=""
                      className="h-9 w-9 shrink-0 rounded-full border-2 border-outline-variant/30 object-cover"
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {currentUser.nickname[0]}
                    </span>
                  )}
                  <span className="hidden max-w-[120px] truncate text-sm font-semibold sm:inline">{currentUser.nickname}</span>
                  <span className="material-symbols-outlined shrink-0 text-on-surface-variant" style={{ fontSize: 20 }}>
                    expand_more
                  </span>
                </button>
                {userMenuOpen ? (
                  <div
                    role="menu"
                    className="glass-panel absolute right-0 z-[60] mt-2 min-w-[12.5rem] overflow-hidden rounded-2xl border border-outline-variant/30 py-1 shadow-xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {canAccessAdmin(currentUser.role) ? (
                      <Link
                        role="menuitem"
                        to="/admin"
                        className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-lowest/80 dark:hover:bg-surface-container-low/5"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <span className="material-symbols-outlined text-[20px] text-primary">admin_panel_settings</span>
                        后台管理
                      </Link>
                    ) : null}
                    <Link
                      role="menuitem"
                      to="/mobile-frame"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-lowest/80 dark:hover:bg-surface-container-low/5"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <span className="material-symbols-outlined text-[20px] text-on-surface-variant">smartphone</span>
                      移动端
                    </Link>
                    <div className="my-1 h-px bg-outline-variant/30" role="separator" />
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-on-surface transition-colors hover:bg-surface-container-lowest/80 dark:hover:bg-surface-container-low/5"
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                        portalToast.success('已退出登录');
                        navigate('/user/home');
                      }}
                    >
                      <span className="material-symbols-outlined text-[20px] text-on-surface-variant">logout</span>
                      退出登录
                    </button>
                  </div>
                ) : null}
              </div>
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
