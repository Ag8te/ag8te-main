import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.za.mzansiserve.app',
  appName: 'MzansiServe',
  webDir: 'dist',
  bundledWebRuntime: false,
  ios: {
    initialFocus: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#ffffff",
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: false,
      style: "LIGHT",
      backgroundColor: "#ffffff",
    },
  },
};

export default config;
