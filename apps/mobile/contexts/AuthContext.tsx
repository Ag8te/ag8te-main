import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { AppState, View } from "react-native";
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

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
  email_verified?: boolean;
  profile_image_url?: string;
  tracking_number?: string;
  data?: any;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role: string) => Promise<{ success: boolean; data?: any; error?: string }>;
  register: (data: FormData | Record<string, any>) => Promise<{ success: boolean; data?: any; error?: string }>;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const recordActivity = useCallback(async () => {
    await AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        if (token) {
          const lastActivity = Number(await AsyncStorage.getItem(LAST_ACTIVITY_KEY) || 0);
          if (lastActivity && Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
            await SecureStore.deleteItemAsync("token");
            await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
            setUser(null);
            return;
          }

          const response = await apiClient.get("/profile", {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data && response.data.success) {
            setUser(response.data.data.user);
          } else {
            await SecureStore.deleteItemAsync("token");
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [recordActivity]);

  const login = useCallback(async (email: string, password: string, role: string) => {
    try {
      const response = await apiClient.post("/auth/login", { email, password, role });
      const result = response.data;

      if (result.success) {
        await SecureStore.setItemAsync("token", result.data.token);
        await recordActivity();
        setUser(result.data.user);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Login failed" };
    } catch (error: any) {
      console.error("Login failed. Error object:", error);
      console.error("Login error message:", error.message);
      console.error("Login error response data:", error.response?.data);
      console.error("Login error response status:", error.response?.status);

      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error?.message || 
                          error.message || 
                          "An error occurred during login";
      return { success: false, error: errorMessage };
    }
  }, [recordActivity]);

  const register = useCallback(async (data: FormData | Record<string, any>) => {
    try {
      const isFormData = data instanceof FormData;
      const endpoint = isFormData ? "/auth/register-with-payment" : "/auth/register";
      
      const payload = isFormData ? data : { ...data, role: data.role || "client" };
      // Let Axios automatically set the boundaries for FormData by omitting Content-Type override
      const token = await SecureStore.getItemAsync("token");
      const headers: any = {
        'Accept': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (!isFormData) {
        headers['Content-Type'] = 'application/json';
      }

      // Use native fetch for better FormData/boundary handling in React Native
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ag8te.com';
      const url = `${API_URL}/api${endpoint}`;

      const fetchOptions: RequestInit = {
        method: 'POST',
        headers: headers,
        body: isFormData ? (payload as any) : JSON.stringify(payload),
      };

      console.log(`Registering via fetch to: ${url}`);
      const fetchResponse = await fetch(url, fetchOptions);
      const result = await fetchResponse.json();

      if (fetchResponse.ok && result.success) {
        if (result.data?.token) {
          await SecureStore.setItemAsync("token", result.data.token);
          await recordActivity();
          setUser(result.data.user);
        }
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Registration failed" };
    } catch (error: any) {
      console.error("Registration failed. Error object:", error);
      console.error("Registration error message:", error.message);
      console.error("Registration error response data:", error.response?.data);
      console.error("Registration error response status:", error.response?.status);
      
      let errorMessage = "An error occurred during registration";
      if (error.response?.data?.message) {
         errorMessage = error.response.data.message;
      } else if (typeof error.response?.data === 'string' && error.response.data.includes('<html')) {
         errorMessage = "Internal Server Error or Bad Request (Boundary parsing failed)";
      } else if (error.message) {
         errorMessage = error.message;
      }
      return { success: false, error: errorMessage };
    }
  }, [recordActivity]);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync("token");
    await AsyncStorage.removeItem(LAST_ACTIVITY_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!user) return;

    const logoutIfIdle = async () => {
      const lastActivity = Number(await AsyncStorage.getItem(LAST_ACTIVITY_KEY) || Date.now());
      if (Date.now() - lastActivity > IDLE_TIMEOUT_MS) {
        await logout();
      }
    };

    void recordActivity();
    const intervalId = setInterval(() => {
      void logoutIfIdle();
    }, 15000);

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void logoutIfIdle();
      } else {
        void AsyncStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      }
    });

    return () => {
      clearInterval(intervalId);
      subscription.remove();
    };
  }, [user, logout, recordActivity]);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUser, isAuthenticated: !!user, isLoading }}>
      <View style={{ flex: 1 }} onTouchStart={user ? () => { void recordActivity(); } : undefined}>
        {children}
      </View>
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
