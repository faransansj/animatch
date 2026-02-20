import * as Sentry from '@sentry/react';
import ReactGA from 'react-ga4';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

/**
 * Initialize Sentry and GA4 with PII scrubbing.
 */
export function initTelemetry() {
    // 1. Initialize Sentry
    if (SENTRY_DSN) {
        Sentry.init({
            dsn: SENTRY_DSN,
            integrations: [
                Sentry.browserTracingIntegration(),
                Sentry.replayIntegration(),
            ],
            // Performance Monitoring
            tracesSampleRate: 1.0,
            // Session Replay
            replaysSessionSampleRate: 0.1,
            replaysOnErrorSampleRate: 1.0,

            // Security: Scrub PII before sending
            beforeSend(event) {
                // Remove IP address if captured
                if (event.user) {
                    delete event.user.ip_address;
                }

                // Scrub potential sensitive data in breadcrumbs
                if (event.breadcrumbs) {
                    event.breadcrumbs.forEach((breadcrumb) => {
                        if (breadcrumb.data && breadcrumb.data.url) {
                            breadcrumb.data.url = scrubUrl(breadcrumb.data.url);
                        }
                    });
                }

                return event;
            },
        });
    }

    // 2. Initialize GA4
    if (GA_MEASUREMENT_ID) {
        ReactGA.initialize(GA_MEASUREMENT_ID);
    }
}

/**
 * Log an event to GA4.
 */
export function logEvent(category: string, action: string, label?: string, value?: number) {
    ReactGA.event({
        category,
        action,
        label,
        value,
    });
}

/**
 * Simple URL scrubbing helper for Sentry breadcrumbs.
 */
function scrubUrl(url: string): string {
    try {
        const parsed = new URL(url);
        // Remove specific sensitive query params if any
        const sensitiveParams = ['token', 'key', 'auth', 'password'];
        sensitiveParams.forEach(param => parsed.searchParams.delete(param));
        return parsed.toString();
    } catch {
        return url;
    }
}
