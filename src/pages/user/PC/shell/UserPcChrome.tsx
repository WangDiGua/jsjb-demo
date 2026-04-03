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
      </>
    );
  }

  return (
    <div className="portal-pc portal-skin min-h-screen bg-surface font-body text-on-surface selection:bg-primary/10">
      <ScrollToTop />
      <PortalHeader />
      {/* pt-20 与顶栏 h-20 对齐，避免内容被 fixed 遮挡；顶栏下不再叠一层 layout-py-main，否则易出现「空白缝」 */}
      <main className="overflow-x-hidden pt-20">
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
