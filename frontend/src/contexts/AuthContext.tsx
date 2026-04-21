import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { apiFetch } from "@/lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  is_paid?: boolean;
  is_approved?: boolean;
  email_verified?: boolean;
  profile_image_url?: string;
  tracking_number?: string;
  data?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  adminLogin: (email: string, password: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  register: (data: FormData | Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string }>;
  logout: () => void;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check connection on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
      if (token) {
        try {
          const result = await apiFetch("/api/profile", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (result.success && result.data) {
            setUser(result.data.user);
          } else {
            if (localStorage.getItem("token")) localStorage.removeItem("token");
            if (localStorage.getItem("adminToken")) {
              // Verify if we should really remove it or if it was just a temporary failure
              // For now, if the API explicitly says fail, we clear.
              localStorage.removeItem("adminToken");
            }
          }
        } catch (error) {
          console.error("Auth check failed:", error);
          // Don't immediately clear on network errors, but clear on 401/403 (handled in apiFetch)
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email: string, password: string, role: string) => {
    try {
      const result = await apiFetch("/api/auth/login", {
        data: { email, password, role }
      });

      if (result.success) {
        if (result.data?.payment_required) {
          localStorage.setItem("registrationPaymentUser", JSON.stringify(result.data.user));
          return { success: true, data: result.data };
        }

        localStorage.setItem("token", result.data.token);
        localStorage.setItem("user", JSON.stringify(result.data.user));
        setUser(result.data.user);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during login" };
    }
  }, []);

  const adminLogin = useCallback(async (email: string, password: string) => {
    try {
      const result = await apiFetch("/api/auth/admin-login", {
        data: { email, password }
      });

      if (result.success) {
        localStorage.setItem("adminToken", result.data.token);
        localStorage.setItem("adminUser", JSON.stringify(result.data.user));
        setUser(result.data.user);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Login failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during admin login" };
    }
  }, []);

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

        if (result.data?.token) {
          localStorage.setItem("token", result.data.token);
          localStorage.setItem("user", JSON.stringify(result.data.user));
          setUser(result.data.user);
        }
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Registration failed" };
    } catch (error: any) {
      return { success: false, error: error.message || "An error occurred during registration" };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    localStorage.removeItem("user");
    localStorage.removeItem("registrationPaymentUser");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, adminLogin, register, logout, setUser, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
