import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export const nativePlatform = Capacitor.getPlatform();
export const isNativeApp = Capacitor.isNativePlatform();
export const isIOSApp = nativePlatform === "ios";
export const isAndroidApp = nativePlatform === "android";

export const canUseGoogleOAuth = () => !isNativeApp;

export const defaultMobileApiBaseUrl = "https://mzansiserve.co.za";
export const publicWebBaseUrl =
  import.meta.env.VITE_PUBLIC_FRONTEND_URL || "https://mzansiserve.co.za";
export const mobileAppBaseUrl =
  import.meta.env.VITE_MOBILE_APP_URL || "co.za.mzansiserve.app://app";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const sameBaseUrl = (candidate: URL, expected: URL) => {
  const candidateScheme = candidate.protocol.replace(/:$/, "");
  const expectedScheme = expected.protocol.replace(/:$/, "");
  return candidateScheme === expectedScheme && candidate.host === expected.host;
};

export const getFrontendBaseUrl = () => {
  if (isNativeApp) {
    return mobileAppBaseUrl;
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return stripTrailingSlash(window.location.origin);
  }

  return publicWebBaseUrl;
};

export const resolveAppReturnPath = (incomingUrl: string) => {
  try {
    const parsed = new URL(incomingUrl);
    const nativeBase = new URL(mobileAppBaseUrl);
    const publicBase = new URL(publicWebBaseUrl);

    if (sameBaseUrl(parsed, nativeBase) || sameBaseUrl(parsed, publicBase)) {
      const pathname = parsed.pathname || "/";
      return `${pathname}${parsed.search}${parsed.hash}`;
    }
  } catch (error) {
    console.warn("Failed to parse app return URL:", incomingUrl, error);
  }

  return null;
};

export const openExternalUrl = async (url: string) => {
  if (isNativeApp) {
    await Browser.open({ url });
    return;
  }

  window.location.assign(url);
};

export const isLocationPermissionDenied = (error: unknown) => {
  if (typeof error === "object" && error && "code" in error) {
    const code = String((error as { code?: unknown }).code || "").toLowerCase();
    if (code === "1" || code.includes("permission")) {
      return true;
    }
  }

  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error || "").toLowerCase();

  return message.includes("permission") || message.includes("denied");
};

export const requestCurrentPosition = async (
  options: PositionOptions = {}
): Promise<GeolocationPosition> => {
  if (!isNativeApp) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported in this environment."));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  const permissions = await Geolocation.checkPermissions();
  const granted =
    permissions.location === "granted" ||
    permissions.coarseLocation === "granted";

  if (!granted) {
    await Geolocation.requestPermissions();
  }

  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: options.enableHighAccuracy ?? true,
    timeout: options.timeout,
    maximumAge: options.maximumAge,
  });

  return {
    coords: {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude ?? null,
      altitudeAccuracy: position.coords.altitudeAccuracy ?? null,
      heading: position.coords.heading ?? null,
      speed: position.coords.speed ?? null,
      toJSON() {
        return {
          latitude: this.latitude,
          longitude: this.longitude,
          accuracy: this.accuracy,
          altitude: this.altitude,
          altitudeAccuracy: this.altitudeAccuracy,
          heading: this.heading,
          speed: this.speed,
        };
      },
    },
    timestamp: position.timestamp,
    toJSON() {
      return {
        coords: this.coords.toJSON(),
        timestamp: this.timestamp,
      };
    },
  };
};

export const configureNativeChrome = async () => {
  if (!isNativeApp) return;

  try {
    await StatusBar.setStyle({ style: Style.Dark });
    if (isAndroidApp) {
      await StatusBar.setBackgroundColor({ color: "#ffffff" });
    }
  } catch (error) {
    console.warn("Failed to configure native status bar:", error);
  }

  try {
    await SplashScreen.hide();
  } catch (error) {
    console.warn("Failed to hide splash screen:", error);
  }
};
