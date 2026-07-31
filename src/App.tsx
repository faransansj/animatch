import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LandingScreen from '@/components/landing/LandingScreen';
import WrappedUploadScreen from '@/components/upload/UploadScreen';
import WrappedGachaScreen from '@/components/loading/GachaScreen';
import WrappedResultScreen from '@/components/result/ResultScreen';
import CharacterBrowse from '@/components/characters/CharacterBrowse';
import CharacterDetail from '@/components/characters/CharacterDetail';
import Toast from '@/components/shared/Toast';
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';
import TermsOfService from '@/components/legal/TermsOfService';
import SEO from '@/components/shared/SEO';
import ErrorBoundary, { NetworkErrorFallback } from '@/components/shared/ErrorBoundary';
import { useMLEngine } from '@/hooks/useMLEngine';

export default function App() {
  const location = useLocation();

  // Initialize ML engine on mount
  useMLEngine();

  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log errors for debugging
        console.error('App Error:', error, errorInfo);
        // You could also send this to your analytics service
      }}
    >
      <SEO />
      <AnimatePresence mode="wait">
<Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <ErrorBoundary fallback={<NetworkErrorFallback onRetry={() => window.location.reload()} />}>
              <LandingScreen />
            </ErrorBoundary>
          } />
          <Route path="/upload" element={<WrappedUploadScreen />} />
          <Route path="/loading" element={<WrappedGachaScreen />} />
          <Route path="/result" element={<WrappedResultScreen />} />
          <Route path="/characters" element={
            <ErrorBoundary fallback={<NetworkErrorFallback onRetry={() => window.location.reload()} />}>
              <CharacterBrowse />
            </ErrorBoundary>
          } />
          <Route path="/characters/:id" element={
            <ErrorBoundary fallback={<NetworkErrorFallback onRetry={() => window.location.reload()} />}>
              <CharacterDetail />
            </ErrorBoundary>
          } />
          <Route path="/privacy" element={
            <ErrorBoundary fallback={<NetworkErrorFallback onRetry={() => window.location.reload()} />}>
              <PrivacyPolicy />
            </ErrorBoundary>
          } />
          <Route path="/terms" element={
            <ErrorBoundary fallback={<NetworkErrorFallback onRetry={() => window.location.reload()} />}>
              <TermsOfService />
            </ErrorBoundary>
          } />
        </Routes>
      </AnimatePresence>
      <Toast />
    </ErrorBoundary>
  );
}

