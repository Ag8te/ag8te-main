import { createRoot } from "react-dom/client";
import { GoogleOAuthProvider } from "@react-oauth/google";
import App from "./App.tsx";
import "./index.css";
import { googleOAuthClientId, isGoogleOAuthConfigured } from "@/lib/native";

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
