import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { requiresRegistrationPayment } from "@/lib/registration-payment";

const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
const LAST_ACTIVITY_KEY = "lastActivityAt";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_paid?: boolean;
  is_approved?: boolean;
  registration_rejection_reason?: string | null;
  registration_review_status?: string | null;
  email_verified?: boolean;
  profile_image_url?: string;
  tracking_number?: string;
  data?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  register: (data: FormData | Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string }>;
  logout: () => void;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUserState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const syncUserState = useCallback((nextUser: User | null) => {
    if (nextUser) {
      localStorage.setItem("user", JSON.stringify(nextUser));

      if (requiresRegistrationPayment(nextUser)) {
        localStorage.setItem("registrationPaymentUser", JSON.stringify(nextUser));
      } else {
        localStorage.removeItem("registrationPaymentUser");
      }
    } else {
      localStorage.removeItem("user");
      localStorage.removeItem("registrationPaymentUser");
    }

    setUserState(nextUser);
  }, []);

  // Check connection on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      if (token) {
        const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || 0);
        if (lastActivity && Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
          localStorage.removeItem("token");
          localStorage.removeItem("adminToken");
          localStorage.removeItem("adminUser");
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          syncUserState(null);
          setIsLoading(false);
          return;
        }

        try {
          const result = await apiFetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (result.success && result.data) {
            syncUserState(result.data);
          } else {
            if (localStorage.getItem("token")) localStorage.removeItem("token");
            if (localStorage.getItem("adminToken")) {
              // Verify if we should really remove it or if it was just a temporary failure
              // For now, if the API explicitly says fail, we clear.
              localStorage.removeItem("adminToken");
            }
          }
        } catch {
          // apiFetch handles invalid credentials. A failed background session check
          // should leave the visitor signed out without surfacing a console error.
          syncUserState(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, [syncUserState]);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    syncUserState(null);
  }, [syncUserState]);

  useEffect(() => {
    if (!user) return;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let lastRecordedActivity = 0;

    const redirectToLogin = () => {
      const isAdmin = user.role === "admin" || !!localStorage.getItem("adminToken");
      logout();
      sessionStorage.setItem("sessionTimeoutReason", "idle");
      window.location.assign(isAdmin ? "/admin/login?reason=timeout" : "/login?reason=timeout");
    };

    const scheduleLogout = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      const lastActivity = Number(localStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
      const remaining = Math.max(0, IDLE_TIMEOUT_MS - (Date.now() - lastActivity));
      timeoutId = window.setTimeout(redirectToLogin, remaining);
    };

    const recordActivity = () => {
      const now = Date.now();
      if (now - lastRecordedActivity < 1000) return;
      lastRecordedActivity = now;
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      scheduleLogout();
    };

    recordActivity();

    const events: Array<keyof WindowEventMap> = ["click", "keydown", "scroll", "touchstart", "pointerdown"];
    events.forEach((eventName) => window.addEventListener(eventName, recordActivity, { passive: true }));
    window.addEventListener("storage", scheduleLogout);

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      events.forEach((eventName) => window.removeEventListener(eventName, recordActivity));
      window.removeEventListener("storage", scheduleLogout);
    };
  }, [user, logout]);

  const login = useCallback(async (email: string, password: string, role?: string) => {
    try {
      const result = await apiFetch("/api/auth/login", {
        data: {
          email,
          password,
          ...(role ? { role } : {}),
        }
      });

      if (result.success) {
        if (result.data?.otp_required) {
          return { success: true, data: result.data };
        }

        if (result.data?.payment_required) {
          localStorage.setItem("user", JSON.stringify(result.data.user));
          localStorage.setItem("registrationPaymentUser", JSON.stringify(result.data.user));
          return { success: true, data: result.data };
        }

        localStorage.setItem("token", result.data.token);
        syncUserState(result.data.user);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during login" };
    }
  }, [syncUserState]);

  const adminLogin = useCallback(async (email: string, password: string) => {
    try {
      const result = await apiFetch("/api/auth/admin-login", {
        data: { email, password }
      });

      if (result.success) {
        localStorage.setItem("adminToken", result.data.token);
        localStorage.setItem("adminUser", JSON.stringify(result.data.user));
        syncUserState(result.data.user);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during admin login" };
    }
  }, [syncUserState]);

  const register = useCallback(async (data: FormData | Record<string, any>) => {
    try {
      // If it's FormData, pass as is to register-with-payment. Otherwise wrap as JSON.
      const isFormData = data instanceof FormData;
      const endpoint = isFormData ? "/api/auth/register-with-payment" : "/api/auth/register";

      const payload = isFormData ? data : { ...data, role: data.role || "client" };

      const result = await apiFetch(endpoint, { data: payload });

      if (result.success) {
        // Optional: register-with-payment may trigger a redirect URL rather than token immediately
        if (result.data?.redirect_url) {
          return { success: true, data: result.data };
        }

        
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Registration failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during registration" };
    }
  }, [syncUserState]);

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, register, logout, setUser: syncUserState, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
