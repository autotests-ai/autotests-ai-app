# frontend-typescript-react

Landing SPA for autotests-ai-app. Vite `base: '/'` (apex, not nested `./` + pinMount).

Built on `@zero-design-system/react`, aliased to committed [`vendor/react-ui`](vendor/react-ui/). DS runtime: [`vendor/ds`](vendor/ds/).

| Route | Screen |
|-------|--------|
| `/` | empty DS `page-shell` (`data-testid="page-shell"`) |

Header nav: Home + Stack (`/stack/`) + Stage/Prod (`env-hosts`). No login/register on apex.

`src/routes.tsx` → `createBrowserRouter` in `main.tsx` and `createMemoryRouter` in tests.

**`npm run dev` is not the product stand.** Compose gateway serves `/js/header.js` from the image overlay (`vendor/ds`).

```bash
npm install
npm run build
npm test
npm run test:coverage
```
