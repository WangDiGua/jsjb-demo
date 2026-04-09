import { createBrowserRouter, Navigate } from 'react-router-dom';
import UserRootLayout from '@/pages/user/UserRootLayout';
import AdminGuard from '@/pages/admin/AdminGuard';
import AdminLayout from '@/pages/admin/AdminLayout';
import AdminPermissionOutlet from '@/pages/admin/AdminPermissionOutlet';
import SessionRoot from '@/components/shell/SessionRoot';
import {
  AbnormalUsersPage,
  AdminLoginPage,
  AIDemoPage,
  AppealDetailPage,
  AppealListPage,
  AppealsManagePage,
  CreateAppealPage,
  DashboardPage,
  DepartmentsManagePage,
  DepartmentsPage,
  DeptShowcaseManagePage,
  ForgotPasswordPage,
  FormsManagePage,
  IntegrationsPage,
  KnowledgeBasePage,
  LeaderWorkbenchPage,
  LoginPage,
  MobileDemoPage,
  MobileMorePage,
  MyAppealsPage,
  NoticeDetailPage,
  NoticesManagePage,
  RegisterPage,
  ResponsiveHome,
  RobotManagePage,
  RolesManagePage,
  SchedulerPage,
  SearchPage,
  SettingsPage,
  StatisticsPage,
  SystemManagePage,
  TypesManagePage,
  UiManagePage,
  WeeklyReportPage,
  WorkflowPage,
} from './lazyPages';

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
                  {
                    element: <AdminPermissionOutlet />,
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
    ],
  },
]);
