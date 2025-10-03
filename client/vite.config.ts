import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path';
import svgr from 'vite-plugin-svgr';

const pageChunkPatterns = [
  { name: 'page-analytics', regex: /[\\/]src[\\/]pages[\\/]analytics[\\/]analytics\.tsx$/ },
  { name: 'page-operations', regex: /[\\/]src[\\/]pages[\\/]operations[\\/]operations\.tsx$/ },
  { name: 'page-payment', regex: /[\\/]src[\\/]pages[\\/]operations[\\/]payment\.tsx$/ },
  { name: 'page-database-central', regex: /[\\/]src[\\/]pages[\\/]database-view[\\/]CentralView\.tsx$/ },
  { name: 'page-database-branches', regex: /[\\/]src[\\/]pages[\\/]database-view[\\/]Branches\.tsx$/ },
  { name: 'page-database-customer', regex: /[\\/]src[\\/]pages[\\/]database-view[\\/]CustomerInformation\.tsx$/ },
  { name: 'page-auth-login', regex: /[\\/]src[\\/]pages[\\/]auth[\\/]login\.tsx$/ },
  { name: 'page-notifications', regex: /[\\/]src[\\/]pages[\\/]notifications\.tsx$/ },
  { name: 'page-srm', regex: /[\\/]src[\\/]pages[\\/]srm\.tsx$/ },
  { name: 'page-user-announcements', regex: /[\\/]src[\\/]pages[\\/]user-management[\\/]announcements\.tsx$/ },
  { name: 'page-user-appointments', regex: /[\\/]src[\\/]pages[\\/]user-management[\\/]appointments\.tsx$/ },
];


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
          if (id.includes('node_modules')) {
            const reactVendor = /[\\/]node_modules[\\/](react|react-dom|react-router-dom)[\\/]/;
            if (reactVendor.test(id)) return 'vendor';

            if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return 'ui';
            if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) return 'ui';
            // Ensure Radix-based companion libraries stay in the same chunk to avoid vendor<->ui cycles
            if (/[\\/]node_modules[\\/](cmdk|@shadcn[\\/]ui)[\\/]/.test(id)) return 'ui';

            if (/[\\/]node_modules[\\/]@tanstack[\\/]/.test(id)) return 'data-layer';
            if (/[\\/]node_modules[\\/]recharts[\\/]/.test(id)) return 'charts';
            if (/[\\/]node_modules[\\/]react-hook-form[\\/]/.test(id)) return 'forms';
            if (/[\\/]node_modules[\\/]date-fns[\\/]/.test(id)) return 'date';

            if (/[\\/]node_modules[\\/](exceljs|xlsx|xlsx-style)[\\/]/.test(id)) return 'spreadsheets';
            if (/[\\/]node_modules[\\/](jspdf|jspdf-autotable)[\\/]/.test(id)) return 'pdf';
            if (/[\\/]node_modules[\\/]html2canvas[\\/]/.test(id)) return 'pdf';

            if (/[\\/]node_modules[\\/]dompurify[\\/]/.test(id)) return 'sanitize';
            if (/[\\/]node_modules[\\/]socket.io[\\/]/.test(id)) return 'socket';
            if (/[\\/]node_modules[\\/]sonner[\\/]/.test(id)) return 'notifications';

            return 'vendor';
          }
          // Group only top-level page entry modules to avoid cross-import cycles
          for (const { name, regex } of pageChunkPatterns) {
            if (regex.test(id)) {
              return name;
            }
          }
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