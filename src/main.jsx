import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import './index.css'
import App from './App.jsx'
import RouteErrorBoundary from './components/RouteErrorBoundary.jsx'
import PublicSite, { isPublicWebsitePath } from './public/PublicSite.jsx'

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

function shouldRenderPublicSite() {
  if (isNativeRuntime()) return false;

  const pathname = window.location.pathname || "/";

  return isPublicWebsitePath(pathname);
}

function prepareAppEntryPath() {
  if (isNativeRuntime()) return;

  if (window.location.pathname === "/login" && !window.location.hash) {
    window.location.hash = "login";
  }
}

prepareAppEntryPath();

createRoot(rootElement).render(
  <StrictMode>
    <RouteErrorBoundary resetKey="app">
      {shouldRenderPublicSite() ? <PublicSite /> : <App />}
    </RouteErrorBoundary>
  </StrictMode>,
)
