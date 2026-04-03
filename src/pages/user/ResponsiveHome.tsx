import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import HomePage from '@/pages/user/PC/HomePage';
import MobileHomePage from '@/pages/user/Mobile/MobileHomePage';

export default function ResponsiveHome() {
  return useIsMobileLayout() ? <MobileHomePage /> : <HomePage />;
}
