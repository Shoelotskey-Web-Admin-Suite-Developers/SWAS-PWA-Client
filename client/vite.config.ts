import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import svgr from 'vite-plugin-svgr';


// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor buckets
          if (id.includes('node_modules')) {
            if (/react|react-dom|react-router-dom/.test(id)) return 'vendor';
            if (id.includes('@radix-ui')) return 'ui';
            if (id.includes('lucide-react')) return 'ui';
            if (id.includes('html2canvas')) return 'pdf';
            if (id.includes('dompurify')) return 'sanitize';
            if (id.includes('socket.io')) return 'socket';
          }
          // Page route groups
          if (id.includes('/src/pages/operations/')) return 'page-operations';
          if (id.includes('/src/pages/database-view/')) return 'page-database';
          if (id.includes('/src/pages/analytics/')) return 'page-analytics';
          if (id.includes('/src/pages/auth/')) return 'page-auth';
          return undefined;
        }
      }
    },
    chunkSizeWarningLimit: 1500
  },
  plugins: [react(), svgr(), VitePWA({
    registerType: 'autoUpdate',
    injectRegister: false,

    pwaAssets: {
      disabled: false,
      config: true,
    },

    manifest: {
      name: 'Shoelotskey Web Admin Suite',
      short_name: 'SWAS',
      description: 'Centralized platform for managing Shoelotskey’s operations, POS, and branch data — all in one place.',
      theme_color: '#D11315',
    },

    workbox: {
      globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      cleanupOutdatedCaches: true,
      clientsClaim: true,
    },

    devOptions: {
      enabled: false,
      navigateFallback: 'index.html',
      suppressWarnings: true,
      type: 'module',
    },
  })],
})