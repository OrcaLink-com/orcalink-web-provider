import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      pwaAssets: { config: true, overrideManifestIcons: true },
      manifest: {
        name: 'OrcaLink Pro — Para profissionais',
        short_name: 'OrcaLink Pro',
        description: 'Receba orçamentos, envie propostas, organize sua agenda e acompanhe seus resultados.',
        lang: 'pt-BR',
        theme_color: '#0b0e14',
        background_color: '#0b0e14',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        categories: ['business', 'productivity'],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
      },
      devOptions: { enabled: false },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'charts';
          if (id.includes('@heroui') || id.includes('framer-motion') || id.includes('@react-aria') || id.includes('@react-stately') || id.includes('react-aria')) return 'heroui';
          if (id.includes('@tanstack')) return 'query';
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('scheduler')) return 'react';
          return 'vendor';
        },
      },
    },
  },
  server: {
    port: 5174,
    fs: { allow: ['..'] },
  },
  optimizeDeps: {
    exclude: ['@orcalink/design-tokens'],
  },
});
