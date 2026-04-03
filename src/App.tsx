import { useEffect, useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { router } from './routes';
import { attachMockDbBroadcast, flushMockDbNow } from '@/mock/persist';
import { appTheme } from '@/theme/appTheme';
import { buildAntdTheme } from '@/theme/antdPreferences';
import { useApplyPreferences } from '@/hooks/useApplyPreferences';
import { getResolvedDark, usePreferencesStore } from '@/store/preferencesStore';
import PreferencesHost from '@/components/preferences/PreferencesHost';

function ThemedApp() {
  useApplyPreferences();
  const themePreset = usePreferencesStore((s) => s.themePreset);
  const themeMode = usePreferencesStore((s) => s.themeMode);
  const antdConfig = useMemo(
    () => ({ ...appTheme, ...buildAntdTheme(themePreset, getResolvedDark(themeMode)) }),
    [themePreset, themeMode],
  );

  useEffect(() => {
    const detach = attachMockDbBroadcast();
    return detach;
  }, []);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') flushMockDbNow();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <ConfigProvider theme={antdConfig} locale={zhCN}>
      <AntdApp>
        <RouterProvider router={router} />
        <PreferencesHost />
      </AntdApp>
    </ConfigProvider>
  );
}

export default ThemedApp;
