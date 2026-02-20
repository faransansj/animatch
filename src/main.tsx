import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './i18n';
import './styles/variables.css';
import './styles/global.css';
import ort from 'onnxruntime-web';
import { initTelemetry } from './utils/telemetry';

// Initialize Sentry & GA4
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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
