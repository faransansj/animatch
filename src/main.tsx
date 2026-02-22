import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles/variables.css';
import './styles/global.css';
import ort from 'onnxruntime-web';
import { initTelemetry } from './utils/telemetry';
import * as Sentry from '@sentry/react';

// Initialize Sentry & GA4 & PostHog
initTelemetry();

// Global ONNX Runtime Configuration for Mobile Stability
ort.env.wasm.numThreads = 1;
ort.env.wasm.proxy = false;

// Register Service Worker for Model Caching
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('ServiceWorker registration failed: ', err);
    });
  });
}

const FallbackComponent = () => (
  <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif', color: '#FFF' }}>
    <h2>Oops! Something went wrong.</h2>
    <p>A critical error occurred while rendering the page. Our team has been notified.</p>
    <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: '#FF6B9D', border: 'none', borderRadius: '8px', color: '#FFF', cursor: 'pointer', marginTop: '16px' }}>
      Reload Page
    </button>
  </div>
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<FallbackComponent />} showDialog>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
