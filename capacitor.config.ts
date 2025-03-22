import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.financetracker.app',
  appName: 'Finance Tracker',
  webDir: 'build/client', // <-- Change this line from 'public/build' to 'build/client'
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      spinnerColor: "#3b82f6",
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
