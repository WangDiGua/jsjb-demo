import { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, Skeleton } from 'antd';
import { appAntdLocale } from '@/antdAppLocale';
import '@/bootstrapAntdLocale';
import { initMockDb } from '@/mock/persist';
import { appTheme } from '@/theme/appTheme';
import { buildAntdTheme } from '@/theme/antdPreferences';
import './styles/tailwind.css';
import './styles/global.css';
import './styles/portal-pc.css';
import './styles/admin-pc.css';
import './styles/preferences.css';
import './styles/mobile-portal.css';
import './styles/design-bridge.css';
import {
  applyPreferencesToDocument,
  readPersistedPreferences,
  usePreferencesStore,
  getResolvedDark,
} from '@/store/preferencesStore';
import App from './App';

const bootPrefs = readPersistedPreferences();
if (bootPrefs) {
  usePreferencesStore.setState(bootPrefs);
}
applyPreferencesToDocument(usePreferencesStore.getState());

function Bootstrap() {
  const [ready, setReady] = useState(false);
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const dark = getResolvedDark(themeMode);
  const skeletonTheme = useMemo(
    () => ({ ...appTheme, ...buildAntdTheme(themePreset, dark) }),
    [themePreset, dark],
  );
  const skeletonBg = dark ? 'rgb(15, 23, 42)' : 'rgb(244, 245, 247)';

  useEffect(() => {
    let cancelled = false;
    initMockDb()
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <ConfigProvider theme={skeletonTheme} locale={appAntdLocale}>
        <div
          style={{
            minHeight: '100vh',
            padding: 'clamp(24px, 5vw, 48px)',
            maxWidth: 1200,
            margin: '0 auto',
            boxSizing: 'border-box',
            background: skeletonBg,
          }}
        >
          <Skeleton active title={{ width: '40%' }} paragraph={{ rows: 1 }} />
          <Skeleton.Input active block style={{ height: 40, marginBottom: 24 }} />
          <RowSkeleton />
          <Skeleton active paragraph={{ rows: 4 }} style={{ marginTop: 24 }} />
          <Skeleton active paragraph={{ rows: 3 }} style={{ marginTop: 24 }} />
        </div>
      </ConfigProvider>
    );
  }

  return <App />;
}

function RowSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
      {[0, 1, 2].map((k) => (
        <Skeleton.Node key={k} active style={{ width: '100%', height: 96 }} />
      ))}
    </div>
  );
}

/** 不用 StrictMode：开发环境下 React 18 会双次挂载以暴露副作用问题，导致同页 useEffect 里发起的请求（如 GLM）在 Network 里成对出现。 */
createRoot(document.getElementById('root')!).render(<Bootstrap />);
