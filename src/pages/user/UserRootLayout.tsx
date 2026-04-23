import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppStore } from '@/store';
import { MobileLayoutContext } from '@/context/MobileLayoutContext';
import MobileLayout from './Mobile/MobileLayout';
import UserPcChrome from '@/pages/user/PC/shell/UserPcChrome';

function isMobileUA() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export default function UserRootLayout() {
  const [searchParams] = useSearchParams();
  const isMobile = useAppStore((s) => s.isMobile);
  const setIsMobile = useAppStore((s) => s.setIsMobile);

  /** 桌面端强制查看移动端布局（如调试）；iframe 内一般靠窄视口自动判定 */
  const forceMobileViewport = searchParams.get('viewport') === 'mobile';

  useEffect(() => {
    const update = () => {
      const narrow = window.innerWidth < 768;
      setIsMobile(narrow || isMobileUA());
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [setIsMobile]);

  const isMobileView = forceMobileViewport || isMobile;

  return (
    <MobileLayoutContext.Provider value={isMobileView}>
      {isMobileView ? <MobileLayout /> : <UserPcChrome />}
    </MobileLayoutContext.Provider>
  );
}
