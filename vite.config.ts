import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { firebaseAdminSyncPlugin } from './server/firebaseBridge'
import { voiceTranscriptionPlugin } from './server/voiceBridge'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    firebaseAdminSyncPlugin(),
    voiceTranscriptionPlugin(),
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase-vendor';
          }
          if (id.includes('node_modules/dexie')) {
            return 'dexie-vendor';
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons-vendor';
          }
        },
      },
    },
    // Increase chunk size warning limit for production awareness
    chunkSizeWarningLimit: 600,
  },
  // Ensure proper base for Electron file:// loading
  base: './',
  server: {
    port: 5173,
    host: true,
  },
})
