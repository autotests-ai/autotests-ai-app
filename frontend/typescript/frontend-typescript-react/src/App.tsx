import { AppHeader } from '@zero-design-system/react';
import { Outlet } from 'react-router-dom';
import { appPath } from './lib/appBase';
import { headerConfig } from './lib/headerConfig';

export function App() {
  return (
    <>
      <AppHeader config={headerConfig} scriptSrc={appPath('/js/header.js')} />
      <Outlet />
    </>
  );
}
