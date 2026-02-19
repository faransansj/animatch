import { useEffect, useRef } from 'react';
import styles from './AdBanner.module.css';

// TODO: Replace with your actual AdSense publisher ID
const ADSENSE_PUB_ID = '';
// TODO: Replace with your actual ad slot ID
const ADSENSE_SLOT_ID = '';

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

interface AdBannerProps {
  format?: 'horizontal' | 'auto';
}

export default function AdBanner({ format = 'horizontal' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!ADSENSE_PUB_ID || !ADSENSE_SLOT_ID) return;
    if (pushed.current) return;

    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense not available
    }
  }, []);

  // Show placeholder when AdSense is not configured
  if (!ADSENSE_PUB_ID || !ADSENSE_SLOT_ID) {
    return (
      <div className={styles.adContainer}>
        <div className={styles.placeholder}>
          <span className={styles.adLabel ?? ''}>AD</span>
          <span>AdSense Banner (728x90)</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.adContainer}>
      <ins
        ref={adRef}
        className={`adsbygoogle ${styles.adSlot ?? ''}`}
        style={{ display: 'block' }}
        data-ad-client={`ca-pub-${ADSENSE_PUB_ID}`}
        data-ad-slot={ADSENSE_SLOT_ID}
        data-ad-format={format === 'horizontal' ? 'horizontal' : 'auto'}
        data-full-width-responsive={format === 'auto' ? 'true' : 'false'}
      />
    </div>
  );
}
