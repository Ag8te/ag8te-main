import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';

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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync("token");
        if (token) {
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
  }, []);

  const login = useCallback(async (email: string, password: string, role: string) => {
    try {
      const response = await apiClient.post("/auth/login", { email, password, role });
      const result = response.data;

      if (result.success) {
        await SecureStore.setItemAsync("token", result.data.token);
        setUser(result.data.user);
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Login failed" };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || "An error occurred during login";
      return { success: false, error: errorMessage };
    }
  }, []);

  const register = useCallback(async (data: FormData | Record<string, any>) => {
    try {
      const isFormData = data instanceof FormData;
      const endpoint = isFormData ? "/auth/register-with-payment" : "/auth/register";
      
      const payload = isFormData ? data : { ...data, role: data.role || "client" };
      // Let Axios automatically set the boundaries for FormData by omitting Content-Type override
      const config = isFormData ? { headers: { 'Accept': 'application/json' } } : {};

      const response = await apiClient.post(endpoint, payload, config);
      const result = response.data;

      if (result.success) {
        if (result.data?.token) {
          await SecureStore.setItemAsync("token", result.data.token);
          setUser(result.data.user);
        }
        return { success: true, data: result.data };
      }
      return { success: false, error: result.message || "Registration failed" };
    } catch (error: any) {
      console.error("Registration error full response:", error.response?.data);
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
  }, []);

  const logout = useCallback(async () => {
    await SecureStore.deleteItemAsync("token");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUser, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
