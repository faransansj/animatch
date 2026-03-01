/**
 * Shared device detection utilities.
 * Centralizes UA-based checks to avoid duplication across components.
 */

let _isMobile: boolean | null = null;

/**
 * Returns true on mobile/tablet devices. Result is lazily evaluated and cached.
 */
export function isMobile(): boolean {
    if (_isMobile === null) {
        _isMobile =
            typeof navigator !== 'undefined' &&
            /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
    return _isMobile;
}
