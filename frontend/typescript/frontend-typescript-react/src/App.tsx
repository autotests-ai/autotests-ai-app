import { AppHeader } from '@zero-design-system/react';
import { useEffect, useMemo, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { useI18n } from './i18n';
import { appPath } from './lib/appBase';
import { buildHeaderConfig, syncHeaderNav } from './lib/headerConfig';

export function App() {
  const { lang } = useI18n();
  const config = useMemo(() => buildHeaderConfig(lang), [lang]);
  const navKey = useRef<string | null>(null);

  useEffect(() => {
    navKey.current = syncHeaderNav(config, navKey.current);
  }, [config]);

  return (
    <>
      <AppHeader config={config} scriptSrc={appPath('/js/header.js')} />
      <Outlet />
    </>
  );
}
