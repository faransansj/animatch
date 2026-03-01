import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
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

const FallbackComponent = () => {
  const lang = navigator.language.toLowerCase();
  const isKo = lang.startsWith('ko');
  const isJa = lang.startsWith('ja');
  const isZh = lang.startsWith('zh');

  const title = isKo ? '앗! 오류가 발생했습니다.' :
    isJa ? 'おっと！エラーが発生しました。' :
      isZh ? '哎呀！发生错误。' :
        'Oops! Something went wrong.';

  const desc = isKo ? '페이지를 렌더링하는 중 치명적인 오류가 발생했습니다. 팀에 보고되었습니다.' :
    isJa ? 'ページのレンダリング中に致命的なエラーが発生しました。サポートチームに報告されました。' :
      isZh ? '渲染页面时发生了严重错误。已向我们的团队报告。' :
        'A critical error occurred while rendering the page. Our team has been notified.';

  const btnText = isKo ? '페이지 새로고침' :
    isJa ? 'ページを再読み込み' :
      isZh ? '重新加载页面' :
        'Reload Page';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '24px', textAlign: 'center',
      fontFamily: 'var(--font-family, "Pretendard Variable", sans-serif)',
      backgroundColor: 'var(--bg-primary, #0F172A)', color: 'var(--text-primary, #F8FAFC)'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>💥</div>
      <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>{title}</h2>
      <p style={{ color: 'var(--text-secondary, #94A3B8)', marginBottom: '32px', maxWidth: '400px', lineHeight: 1.5 }}>{desc}</p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '14px 28px', background: 'var(--primary-color, #FF6B9D)',
          border: 'none', borderRadius: '12px', color: '#FFF',
          fontSize: '16px', fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.2s'
        }}
        onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
        onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
      >
        {btnText}
      </button>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<FallbackComponent />} showDialog>
      <HelmetProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </HelmetProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
);
