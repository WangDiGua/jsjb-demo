import { Suspense, useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Spin } from 'antd';
import { useAppStore } from '@/store';
import {
  migrateLegacyMockUserOnce,
  reloadActiveSurfaceFromStorage,
  SESSION_KEYS,
  surfaceFromPathname,
  syncSessionSurfaceForPath,
} from '@/store/sessionSplit';

/**
 * 按路由分离门户端与管理端登录态：同一浏览器内可分别记住「门户用户」与「管理端用户」，
 * 与共享的 mock 数据（诉求库等）独立，互不覆盖。
 */
export default function SessionRoot() {
  const location = useLocation();
  const pathname = location.pathname;
  const migrated = useRef(false);

  if (!migrated.current) {
    migrated.current = true;
    migrateLegacyMockUserOnce();
  }
  /**
   * 必须在首屏子树（如 AdminGuard）渲染之前从 localStorage 恢复当前域会话。
   * 若仅在 useEffect 里同步，第一次渲染时 store 仍为空，会被误判未登录并踢回登录页。
   */
  syncSessionSurfaceForPath(pathname, {
    getSnapshot: () => {
      const { currentUser, isLoggedIn } = useAppStore.getState();
      return { user: currentUser, loggedIn: isLoggedIn };
    },
    apply: (user, loggedIn) => {
      useAppStore.setState({ currentUser: user, isLoggedIn: loggedIn });
    },
  });

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage) return;
      if (e.key !== SESSION_KEYS.portal && e.key !== SESSION_KEYS.admin) return;
      const surface = surfaceFromPathname(window.location.pathname);
      const expectKey = surface === 'admin' ? SESSION_KEYS.admin : SESSION_KEYS.portal;
      if (e.key !== expectKey) return;
      reloadActiveSurfaceFromStorage({
        apply: (user, loggedIn) => {
          useAppStore.setState({ currentUser: user, isLoggedIn: loggedIn });
        },
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '50vh',
          }}
        >
          <Spin size="large" aria-label="页面加载中" />
        </div>
      }
    >
      <Outlet />
    </Suspense>
  );
}
