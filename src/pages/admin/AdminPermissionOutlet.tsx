import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store';
import { canAccessAdminRoute, getDefaultAdminPath } from '@/mock';

/**
 * 管理端子路由守卫：菜单隐藏不足以防越权，需与 {@link src/mock/adminNavPolicy.ts} 保持一致。
 */
export default function AdminPermissionOutlet() {
  const location = useLocation();
  const currentUser = useAppStore((s) => s.currentUser);
  const role = currentUser?.role;

  if (!role) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessAdminRoute(role, location.pathname)) {
    return <Navigate to={getDefaultAdminPath(role)} replace />;
  }

  return <Outlet />;
}
