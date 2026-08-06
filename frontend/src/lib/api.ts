/**
 * API Utility for AG8TE Frontend
 * Wrapper around standard fetch to add base URLs and authorization headers.
 */

import {
    defaultMobileApiBaseUrl,
    getFrontendBaseUrl,
    isNativeApp,
} from "@/lib/native";

export const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    (isNativeApp
        ? defaultMobileApiBaseUrl
        : typeof window !== "undefined" && window.location?.origin
            ? window.location.origin
            : "https://ag8te.com");

function normalizeExternalImageUrl(path: string): string {
    try {
        const url = new URL(path);

        if (url.hostname === "images.unsplash.com") {
            url.searchParams.delete("auto");
            url.searchParams.set("fm", "jpg");
        }

        return url.toString();
    } catch {
        return path;
    }
}

/**
 * Returns a fully-qualified URL for an image path.
 * For relative paths (e.g. /uploads/...) it uses window.location.origin so the
 * browser fetches the file over the same protocol (https) via Nginx, avoiding
 * mixed-content errors on HTTPS.
 */
export function getImageUrl(path: string | null | undefined): string {
    if (!path) return "";
    if (path.startsWith("http")) return normalizeExternalImageUrl(path);
    const baseUrl = isNativeApp ? API_BASE_URL : window.location.origin;
    return `${baseUrl}${path}`;
}


interface FetchOptions extends RequestInit {
    data?: unknown;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    message?: string;
    error?: string | {
        code: string;
        message: string;
        details?: any;
    };
}

/**
 * Core fetch wrapper that automatically adds the Auth token if present
 */
export async function apiFetch<T = any>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<ApiResponse<T>> {
    const { data, headers: customHeaders, ...customOptions } = options;

    const isCoreApi = endpoint.startsWith("/api/admin");
    const token = isCoreApi
        ? (localStorage.getItem("adminToken") || localStorage.getItem("token"))
        : (localStorage.getItem("token") || localStorage.getItem("adminToken"));

    const headers = new Headers(customHeaders);

    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`);
    }

    const frontendBaseUrl = getFrontendBaseUrl();
    if (frontendBaseUrl && !headers.has("X-Frontend-Url")) {
        headers.set("X-Frontend-Url", frontendBaseUrl);
    }

    // Use either data or body (body is standard fetch, data is our custom wrapper)
    const requestBody = data || options.body;
    const isFormData = requestBody instanceof FormData;

    if (requestBody && !isFormData && !headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }

    const config: RequestInit = {
        ...customOptions,
        method: options.method || (requestBody ? "POST" : "GET"),
        body: requestBody ? (isFormData ? requestBody : (typeof requestBody === 'string' ? requestBody : JSON.stringify(requestBody))) : undefined,
        headers,
    };

    // Ensure endpoint starts with a slash
    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

    const response = await fetch(url, config);

    // Parse JSON response
    let result: ApiResponse<T> | null;
    try {
        result = await response.json();
    } catch (err) {
        result = null;
    }

    // Handle errors
    if (!response.ok) {
        // If unauthorized, clear token
        const isAuthEndpoint = /^\/?api\/auth\/(login|admin-login|google-login|verify-login-otp|resend-login-otp|forgot-password|reset-password)/.test(endpoint);
        if (response.status === 401 && !isAuthEndpoint) {
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            localStorage.removeItem("adminToken");
            localStorage.removeItem("adminUser");
            // Optional: force reload or redirect to login
            // window.location.href = '/login';
        }

        let errorMessage = "An error occurred";
        if (result) {
            if (result.message) {
                errorMessage = result.message;
            } else if (typeof result.error === 'object' && result.error !== null) {
                errorMessage = result.error.message;
            } else if (typeof result.error === 'string') {
                errorMessage = result.error;
            }
        } else {
            errorMessage = response.statusText;
        }

        throw new Error(errorMessage);
    }

    return result as ApiResponse<T>;
}

export default apiFetch;
