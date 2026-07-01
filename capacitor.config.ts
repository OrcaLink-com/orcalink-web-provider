import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.orcalink.provider',
  appName: 'OrcaLink Profissional',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
