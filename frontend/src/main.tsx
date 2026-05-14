import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";
import { canUseGoogleOAuth } from "@/lib/native";

// React Router Future Flags for v7 (added to address console warnings)
const routerFutureFlags = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
};

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com";
const shouldEnableGoogleOAuth =
    canUseGoogleOAuth() &&
    !!GOOGLE_CLIENT_ID &&
    !GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE_CLIENT_ID");

const appTree = shouldEnableGoogleOAuth ? (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
    </GoogleOAuthProvider>
) : (
    <App />
);

createRoot(document.getElementById("root")!).render(appTree);
