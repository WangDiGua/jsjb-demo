import type { User } from '@/mock/types';
import { canAccessAdmin } from '@/mock/roles';

/** 门户（PC / 移动同源路由）与会话域 */
export const SESSION_KEYS = {
  portal: 'jsjb_demo_mock_user_portal',
  admin: 'jsjb_demo_mock_user_admin',
  legacy: 'jsjb_demo_mock_user',
} as const;

export type SessionSurface = 'portal' | 'admin';

let activeSurface: SessionSurface | null = null;

export function getActiveSurface(): SessionSurface | null {
  return activeSurface;
}

export function surfaceFromPathname(pathname: string): SessionSurface {
  return pathname.startsWith('/admin') ? 'admin' : 'portal';
}

function keyFor(surface: SessionSurface): string {
  return surface === 'admin' ? SESSION_KEYS.admin : SESSION_KEYS.portal;
}

function readStoredUser(key: string): User | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function writeStoredUser(surface: SessionSurface, user: User | null): void {
  try {
    const k = keyFor(surface);
    if (user) localStorage.setItem(k, JSON.stringify(user));
    else localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}

/** 首次启动：旧单键迁移到门户或管理端键 */
export function migrateLegacyMockUserOnce(): void {
  try {
    const raw = localStorage.getItem(SESSION_KEYS.legacy);
    if (!raw) return;
    const user = JSON.parse(raw) as User;
    localStorage.removeItem(SESSION_KEYS.legacy);
    if (canAccessAdmin(user.role)) {
      if (!localStorage.getItem(SESSION_KEYS.admin)) {
        localStorage.setItem(SESSION_KEYS.admin, JSON.stringify(user));
      }
    } else if (!localStorage.getItem(SESSION_KEYS.portal)) {
      localStorage.setItem(SESSION_KEYS.portal, JSON.stringify(user));
    }
  } catch {
    /* ignore */
  }
}

/**
 * 随路由切换会话：持久化上一端的当前用户，再载入本端独立登录态。
 * 数据层（IndexedDB mock）仍共享，仅「当前操作身份」按端分离。
 */
export function syncSessionSurfaceForPath(pathname: string, ctx: {
  getSnapshot: () => { user: User | null; loggedIn: boolean };
  apply: (user: User | null, loggedIn: boolean) => void;
}): void {
  const next = surfaceFromPathname(pathname);
  const { user, loggedIn } = ctx.getSnapshot();

  if (activeSurface !== null && activeSurface !== next && loggedIn && user) {
    writeStoredUser(activeSurface, user);
  }

  if (activeSurface === next) return;

  activeSurface = next;
  const loaded = readStoredUser(keyFor(next));
  ctx.apply(loaded, !!loaded);
}

/** login / logout 写入哪一端（路由尚未命中时默认门户） */
export function currentStorageSurface(): SessionSurface {
  return activeSurface ?? 'portal';
}

/** 跨标签页修改了当前端的会话键时，刷新内存态（不切域） */
export function reloadActiveSurfaceFromStorage(ctx: {
  apply: (user: User | null, loggedIn: boolean) => void;
}): void {
  if (activeSurface === null) return;
  const loaded = readStoredUser(keyFor(activeSurface));
  ctx.apply(loaded, !!loaded);
}
