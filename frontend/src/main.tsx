import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";
import { googleOAuthClientId, isGoogleOAuthConfigured, isNativeApp } from "@/lib/native";

const STALE_BUILD_RELOAD_KEY = "mzansiserve-stale-build-reload";

// A user can keep an older app shell open while a deployment replaces its
// hashed JavaScript chunks. Vite emits this event when that shell requests a
// chunk that no longer exists; reload once to obtain the current asset map.
window.addEventListener("vite:preloadError", (event) => {
    const lastReload = Number(sessionStorage.getItem(STALE_BUILD_RELOAD_KEY) || 0);
    if (Date.now() - lastReload < 30_000) return;

    event.preventDefault();
    sessionStorage.setItem(STALE_BUILD_RELOAD_KEY, String(Date.now()));
    window.location.reload();
});

window.setTimeout(() => sessionStorage.removeItem(STALE_BUILD_RELOAD_KEY), 30_000);

if (isNativeApp) {
    document.documentElement.classList.add("native-app");
}

// React Router Future Flags for v7 (added to address console warnings)
const routerFutureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
};

const appTree = isGoogleOAuthConfigured() ? (
    <GoogleOAuthProvider clientId={googleOAuthClientId}>
        <App />
    </GoogleOAuthProvider>
) : (
    <App />
);

createRoot(document.getElementById("root")!).render(appTree);
