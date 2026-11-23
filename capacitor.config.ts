import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'top.turbie.zhiming',
  appName: '知命',
  webDir: 'www',
  ios: {
    contentInset: 'never',
    backgroundColor: '#F4EFE4',
  },
  android: {
    backgroundColor: '#F4EFE4',
  },
  plugins: {
    SystemBars: {
      insetsHandling: 'disable',
    },
    StatusBar: {
      style: 'DEFAULT',
      overlaysWebView: true,
    },
  },
};

export default config;
