import * as Sentry from '@sentry/react';
import ReactGA from 'react-ga4';
import posthog from 'posthog-js';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

/**
 * Initialize Sentry, PostHog, and GA4 with PII scrubbing.
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

    // 2. Initialize PostHog
    if (POSTHOG_KEY) {
        posthog.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            capture_pageview: false, // We'll manage this if using React Router, or leave to auto-capture
            persistence: 'localStorage',
        });
    }

    // 3. Initialize GA4
    if (GA_MEASUREMENT_ID) {
        ReactGA.initialize(GA_MEASUREMENT_ID);
    }
}

/**
 * Log a generic event to GA4.
 */
export function logEvent(category: string, action: string, label?: string, value?: number) {
    if (GA_MEASUREMENT_ID) {
        ReactGA.event({ category, action, label, value });
    }
}

/**
 * Track user funnel progression and drop-offs.
 * Sends data to PostHog and GA4 simultaneously.
 */
export function trackFunnelEvent(eventName: string, properties?: Record<string, any>) {
    if (POSTHOG_KEY) {
        posthog.capture(eventName, properties);
    }

    if (GA_MEASUREMENT_ID) {
        ReactGA.event({
            category: 'Funnel',
            action: eventName,
            label: properties ? JSON.stringify(properties) : undefined,
        });
    }
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
