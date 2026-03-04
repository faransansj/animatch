import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// ── Build-time environment variable validation ────────────────────────────────

function envValidationPlugin(): Plugin {
  return {
    name: 'env-validation',
    configResolved(config) {
      if (config.command !== 'build') return;

      const recommended = [
        'VITE_SENTRY_DSN',
        'VITE_GA_MEASUREMENT_ID',
        'VITE_POSTHOG_KEY',
      ];

      const missing = recommended.filter((key) => !process.env[key]);
      if (missing.length > 0) {
        console.warn(
          `\n⚠️  [env-validation] Missing environment variables for production build:\n` +
          missing.map((k) => `   • ${k}`).join('\n') +
          `\n   → Telemetry features will be disabled. Set them in .env for full functionality.\n`,
        );
      }
    },
  };
}

// ── Vite config ───────────────────────────────────────────────────────────────

export default defineConfig({
  plugins: [react(), envValidationPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['onnxruntime-web'],
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'motion': ['framer-motion'],
          'i18n': ['i18next', 'react-i18next'],
          'onnx': ['onnxruntime-web'],
        },
      },
    },
  },
});
