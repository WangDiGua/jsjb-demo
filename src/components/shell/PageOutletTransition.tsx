import { useLocation } from 'react-router-dom';
import { usePreferencesStore } from '@/store/preferencesStore';

export default function PageOutletTransition({ children }: { children: React.ReactNode }) {
  const { pathname, search } = useLocation();
  const pageTransition = usePreferencesStore((s) => s.pageTransition);

  return (
    <div
      key={pathname + search}
      className={`jsjb-page-outlet jsjb-page-outlet--${pageTransition}`}
    >
      {children}
    </div>
  );
}
