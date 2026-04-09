import { Outlet, useLocation } from 'react-router-dom';
import PortalHeader from './PortalHeader';
import PortalFooter from './PortalFooter';
import PortalFeedbackHost from './PortalFeedbackHost';
import ScrollToTop from '@/components/shell/ScrollToTop';
import PageOutletTransition from '@/components/shell/PageOutletTransition';

const bareChromePaths = /^\/user\/(login|register|forgot-password)\/?$/;

export default function UserPcChrome() {
  const { pathname } = useLocation();
  const bare = bareChromePaths.test(pathname);

  if (bare) {
    return (
      <>
        <ScrollToTop />
        <PageOutletTransition>
          <Outlet />
        </PageOutletTransition>
        <PortalFeedbackHost />
      </>
    );
  }

  return (
    <div className="portal-pc portal-skin min-h-screen bg-surface font-body text-on-surface selection:bg-primary/10">
      <ScrollToTop />
      <PortalHeader />
      {/*
        顶栏 fixed h-20(5rem)，main 用 pt-24 在栏下多出 1rem 呼吸留白；全宽首屏（首页 Hero）需同步 -mt/pt，见 HomePage。
      */}
      <main className="overflow-x-hidden pt-24">
        <div className="mx-auto w-full max-w-[var(--layout-max,1600px)] px-[var(--layout-px,2rem)] pb-[var(--layout-py-main,2.5rem)] pt-0">
          <PageOutletTransition>
            <Outlet />
          </PageOutletTransition>
        </div>
      </main>
      <PortalFooter />
      <PortalFeedbackHost />
    </div>
  );
}
