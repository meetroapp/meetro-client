import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import RouteErrorBoundary from './components/RouteErrorBoundary.jsx'
import PublicSite from './public/PublicSite.jsx'
import { shouldRenderPublicSite } from './utils/appEntryRouting.js'
import {
  applyAppLayoutDiagnostics,
  getDesktopContentMetrics,
  publishAppLayoutMetrics,
} from './utils/appLayout.js'

// Public Presence Lock:
// The public website is intentionally separate from the authenticated application.
// Future product marketing belongs in src/public/PublicSite.jsx.
// Authenticated product experiences belong inside App.jsx and app routes.
// Do not merge these experiences without explicit architectural approval.
const App = lazy(() => import('./App.jsx'))

if (import.meta.env.DEV && typeof window !== "undefined") {
  window.addEventListener("error", (event) => {
    console.error("Meetro startup error", event.error || event.message);
  });
  window.addEventListener("unhandledrejection", (event) => {
    console.error("Meetro startup rejection", event.reason);
  });
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error("Meetro root element was not found.");
}

function isNativeRuntime() {
  try {
    return Boolean(Capacitor?.isNativePlatform?.());
  } catch {
    return false;
  }
}

function prepareAppEntryPath() {
  if (isNativeRuntime()) return;

  if (window.location.pathname === "/login" && !window.location.hash) {
    window.location.hash = "login";
  }
}

prepareAppEntryPath();

const shouldUsePublicSite = shouldRenderPublicSite({
  pathname: window.location.pathname,
  hash: window.location.hash,
  native: isNativeRuntime(),
});

if (!shouldUsePublicSite) {
  const initialLayoutMetrics = getDesktopContentMetrics({ capacitor: Capacitor });
  applyAppLayoutDiagnostics(rootElement, initialLayoutMetrics);
  publishAppLayoutMetrics(initialLayoutMetrics);
}

createRoot(rootElement).render(
  <StrictMode>
    <RouteErrorBoundary resetKey="app">
      {shouldUsePublicSite ? (
        <PublicSite />
      ) : (
        <Suspense fallback={<div style={{ padding: 24 }}>Loading Meetro...</div>}>
          <App />
        </Suspense>
      )}
    </RouteErrorBoundary>
  </StrictMode>,
)
