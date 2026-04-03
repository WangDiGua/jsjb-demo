import { createBrowserRouter, Navigate } from 'react-router-dom';
import UserRootLayout from '@/pages/user/UserRootLayout';
import ResponsiveHome from '@/pages/user/ResponsiveHome';
import LoginPage from '@/pages/user/PC/LoginPage';
import RegisterPage from '@/pages/user/PC/RegisterPage';
import ForgotPasswordPage from '@/pages/user/PC/ForgotPasswordPage';
import CreateAppealPage from '@/pages/user/PC/CreateAppealPage';
import AppealListPage from '@/pages/user/PC/AppealListPage';
import AppealDetailPage from '@/pages/user/PC/AppealDetailPage';
import MyAppealsPage from '@/pages/user/PC/MyAppealsPage';
import DepartmentsPage from '@/pages/user/PC/DepartmentsPage';
import NoticeDetailPage from '@/pages/user/PC/NoticeDetailPage';
import SearchPage from '@/pages/user/PC/SearchPage';
import AIDemoPage from '@/pages/user/PC/AIDemoPage';
import IntegrationsPage from '@/pages/user/PC/IntegrationsPage';
import AdminLoginPage from '@/pages/admin/LoginPage';
import AdminGuard from '@/pages/admin/AdminGuard';
import AdminLayout from '@/pages/admin/AdminLayout';
import DashboardPage from '@/pages/admin/DashboardPage';
import AppealsManagePage from '@/pages/admin/AppealsManagePage';
import LeaderWorkbenchPage from '@/pages/admin/LeaderWorkbenchPage';
import DepartmentsManagePage from '@/pages/admin/DepartmentsManagePage';
import TypesManagePage from '@/pages/admin/TypesManagePage';
import StatisticsPage from '@/pages/admin/StatisticsPage';
import WeeklyReportPage from '@/pages/admin/WeeklyReportPage';
import SettingsPage from '@/pages/admin/SettingsPage';
import FormsManagePage from '@/pages/admin/stubs/FormsManagePage';
import WorkflowPage from '@/pages/admin/stubs/WorkflowPage';
import RolesManagePage from '@/pages/admin/stubs/RolesManagePage';
import DeptShowcaseManagePage from '@/pages/admin/stubs/DeptShowcaseManagePage';
import AbnormalUsersPage from '@/pages/admin/stubs/AbnormalUsersPage';
import NoticesManagePage from '@/pages/admin/stubs/NoticesManagePage';
import UiManagePage from '@/pages/admin/stubs/UiManagePage';
import SystemManagePage from '@/pages/admin/stubs/SystemManagePage';
import SchedulerPage from '@/pages/admin/stubs/SchedulerPage';
import KnowledgeBasePage from '@/pages/admin/stubs/KnowledgeBasePage';
import RobotManagePage from '@/pages/admin/stubs/RobotManagePage';
import MobileDemoPage from '@/pages/demo/MobileDemoPage';
import MobileMorePage from '@/pages/user/Mobile/MobileMorePage';
import SessionRoot from '@/components/shell/SessionRoot';

export const router = createBrowserRouter([
  {
    element: <SessionRoot />,
    children: [
  {
    path: '/',
    children: [{ index: true, element: <Navigate to="/user/home" replace /> }],
  },
  {
    path: '/demo/iphone',
    element: <Navigate to="/mobile-frame" replace />,
  },
  {
    path: '/mobile-frame',
    element: <MobileDemoPage />,
  },
  {
    path: '/user',
    element: <UserRootLayout />,
    children: [
      { path: 'home', element: <ResponsiveHome /> },
      { path: 'login', element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
      { path: 'forgot-password', element: <ForgotPasswordPage /> },
      { path: 'appeal/create', element: <CreateAppealPage /> },
      { path: 'appeal/list', element: <AppealListPage /> },
      { path: 'appeal/detail/:id', element: <AppealDetailPage /> },
      { path: 'appeal/my', element: <MyAppealsPage /> },
      { path: 'departments', element: <DepartmentsPage /> },
      { path: 'notice/:id', element: <NoticeDetailPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'ai-demo', element: <Navigate to="/user/ai-assistant" replace /> },
      { path: 'ai-assistant', element: <AIDemoPage /> },
      { path: 'integrations', element: <IntegrationsPage /> },
      { path: 'more', element: <MobileMorePage /> },
    ],
  },
  {
    path: '/admin',
    children: [
      { path: 'login', element: <AdminLoginPage /> },
      {
        element: <AdminGuard />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <Navigate to="dashboard" replace /> },
              { path: 'dashboard', element: <DashboardPage /> },
              { path: 'appeals', element: <AppealsManagePage /> },
              { path: 'leader-desk', element: <LeaderWorkbenchPage /> },
              { path: 'departments', element: <DepartmentsManagePage /> },
              { path: 'types', element: <TypesManagePage /> },
              { path: 'statistics', element: <StatisticsPage /> },
              { path: 'weekly-report', element: <WeeklyReportPage /> },
              { path: 'settings', element: <SettingsPage /> },
              { path: 'forms', element: <FormsManagePage /> },
              { path: 'workflow', element: <WorkflowPage /> },
              { path: 'roles', element: <RolesManagePage /> },
              { path: 'dept-showcase', element: <DeptShowcaseManagePage /> },
              { path: 'abnormal-users', element: <AbnormalUsersPage /> },
              { path: 'notices-admin', element: <NoticesManagePage /> },
              { path: 'ui-config', element: <UiManagePage /> },
              { path: 'system', element: <SystemManagePage /> },
              { path: 'scheduler', element: <SchedulerPage /> },
              { path: 'knowledge', element: <KnowledgeBasePage /> },
              { path: 'robots', element: <RobotManagePage /> },
            ],
          },
        ],
      },
    ],
  },
    ],
  },
]);
