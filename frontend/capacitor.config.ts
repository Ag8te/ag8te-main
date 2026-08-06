import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'co.za.ag8te.app',
  appName: 'AG8TE',
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
    Keyboard: {
      resize: KeyboardResize.Body,
      style: KeyboardStyle.Light,
      resizeOnFullScreen: true,
      autoBackdropColor: "auto",
    },
  },
};

export default config;
