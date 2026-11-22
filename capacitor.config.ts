import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'top.turbie.zhiming',
  appName: '知命',
  webDir: 'www',
  ios: {
    contentInset: 'always',
    backgroundColor: '#F4EFE4',
  },
  android: {
    backgroundColor: '#F4EFE4',
  },
  plugins: {
    StatusBar: {
      style: 'DEFAULT',
      backgroundColor: '#F4EFE4',
      overlaysWebView: false,
    },
  },
};

export default config;
