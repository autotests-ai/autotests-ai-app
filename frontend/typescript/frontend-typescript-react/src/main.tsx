import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { APP_BASE } from './lib/appBase';
import { registerServiceWorker } from './pwa/registerServiceWorker';
import { routes } from './routes';
import './styles';

const router = createBrowserRouter(routes, { basename: APP_BASE });

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

registerServiceWorker();
