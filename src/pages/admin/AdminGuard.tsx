import { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { message } from 'antd';
import { useAppStore } from '@/store';
import { canAccessAdmin } from '@/mock';

export default function AdminGuard() {
  const location = useLocation();
  const isLoggedIn = useAppStore((s) => s.isLoggedIn);
  const currentUser = useAppStore((s) => s.currentUser);

  useEffect(() => {
    if (isLoggedIn && currentUser && !canAccessAdmin(currentUser.role)) {
      message.warning('当前账号无管理端权限（请使用超管 / 二级单位处理员 / 校办账号）');
    }
  }, [isLoggedIn, currentUser]);

  if (!isLoggedIn || !currentUser) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccessAdmin(currentUser.role)) {
    return <Navigate to="/user/home" replace />;
  }

  return <Outlet />;
}
