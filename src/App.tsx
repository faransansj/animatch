import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import LandingScreen from '@/components/landing/LandingScreen';
import UploadScreen from '@/components/upload/UploadScreen';
import GachaScreen from '@/components/loading/GachaScreen';
import ResultScreen from '@/components/result/ResultScreen';
import Toast from '@/components/shared/Toast';
import ModelLoadingOverlay from '@/components/shared/ModelLoadingOverlay';
import PrivacyPolicy from '@/components/legal/PrivacyPolicy';
import TermsOfService from '@/components/legal/TermsOfService';
import { useMLEngine } from '@/hooks/useMLEngine';

export default function App() {
  const location = useLocation();

  // Initialize ML engine on mount
  useMLEngine();

  return (
    <>
      <ModelLoadingOverlay />
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/upload" element={<UploadScreen />} />
          <Route path="/loading" element={<GachaScreen />} />
          <Route path="/result" element={<ResultScreen />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
        </Routes>
      </AnimatePresence>
      <Toast />
    </>
  );
}
