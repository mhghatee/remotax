/**
 * REMOTAX — Shared Navigation Controller (js/nav.js)
 * High-performance, accessible, vanilla navigation controller for all 31 Remotax pages.
 * Handles mobile glass drawer, focus trapping, ESC key dismissal, body scroll lock,
 * and responsive state management across mobile, tablet, and desktop viewports.
 */

(function () {
    'use strict';

    window.__remotaxNavInitialized = true;

    function initNavigation() {
        const mobileToggle = document.getElementById('mobile-menu-toggle') || document.querySelector('.nav-mobile-toggle');
        const mobileDrawer = document.getElementById('mobile-drawer') || document.querySelector('.mobile-drawer');
        const mobileClose = document.getElementById('mobile-drawer-close') || document.querySelector('.mobile-drawer-close-btn');

        if (!mobileDrawer) return;

        // Ensure ARIA attributes are set correctly on init
        if (mobileToggle) {
            mobileToggle.setAttribute('aria-expanded', 'false');
            mobileToggle.setAttribute('aria-controls', 'mobile-drawer');
            if (!mobileToggle.getAttribute('aria-label')) {
                mobileToggle.setAttribute('aria-label', 'Open navigation menu');
            }
        }
        mobileDrawer.setAttribute('aria-hidden', 'true');
        mobileDrawer.setAttribute('inert', '');
        mobileDrawer.setAttribute('role', 'dialog');
        mobileDrawer.setAttribute('aria-modal', 'true');

        let lastActiveElement = null;

        function getFocusableElements() {
            return Array.from(mobileDrawer.querySelectorAll(
                'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
        }

        function openDrawer() {
            lastActiveElement = document.activeElement;
            mobileDrawer.classList.add('open');
            mobileDrawer.removeAttribute('inert');
            mobileDrawer.setAttribute('aria-hidden', 'false');
            if (mobileToggle) {
                mobileToggle.setAttribute('aria-expanded', 'true');
            }
            document.body.style.overflow = 'hidden';

            // Focus management: move focus to close button or first interactive element
            requestAnimationFrame(() => {
                const focusables = getFocusableElements();
                if (mobileClose) {
                    mobileClose.focus();
                } else if (focusables.length > 0) {
                    focusables[0].focus();
                }
            });
        }

        function closeDrawer() {
            mobileDrawer.classList.remove('open');
            mobileDrawer.setAttribute('aria-hidden', 'true');
            mobileDrawer.setAttribute('inert', '');
            if (mobileToggle) {
                mobileToggle.setAttribute('aria-expanded', 'false');
            }
            document.body.style.overflow = '';

            // Restore focus to toggle button
            if (lastActiveElement && typeof lastActiveElement.focus === 'function') {
                lastActiveElement.focus();
            } else if (mobileToggle) {
                mobileToggle.focus();
            }
        }

        if (mobileToggle) {
            mobileToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                if (mobileDrawer.classList.contains('open')) {
                    closeDrawer();
                } else {
                    openDrawer();
                }
            });
        }

        if (mobileClose) {
            mobileClose.addEventListener('click', (e) => {
                e.stopPropagation();
                closeDrawer();
            });
        }

        // Tap/click on dark backdrop outside sheet closes drawer
        mobileDrawer.addEventListener('click', (e) => {
            if (e.target === mobileDrawer) {
                closeDrawer();
            }
        });

        // Close on navigation link click
        mobileDrawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                closeDrawer();
            });
        });

        // Keyboard navigation: ESC to close, TAB focus trapping
        window.addEventListener('keydown', (e) => {
            if (!mobileDrawer.classList.contains('open')) return;

            if (e.key === 'Escape' || e.key === 'Esc') {
                e.preventDefault();
                closeDrawer();
                return;
            }

            if (e.key === 'Tab') {
                const focusables = getFocusableElements();
                if (focusables.length === 0) return;

                const firstEl = focusables[0];
                const lastEl = focusables[focusables.length - 1];

                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstEl) {
                        e.preventDefault();
                        lastEl.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastEl) {
                        e.preventDefault();
                        firstEl.focus();
                    }
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initNavigation);
    } else {
        initNavigation();
    }
})();
