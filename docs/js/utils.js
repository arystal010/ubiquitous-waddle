// docs/js/utils.js
//
// Arys AI v1.5.1 — Utility functions
// Pure utility functions — no re-exports to avoid circular dependencies

// ============================================================
// DOM helpers
// ============================================================

/**
 * Query selector wrapper
 * @param {string} selector - CSS selector
 * @returns {HTMLElement|null} First matching element
 */
export function $(selector) {
    return document.querySelector(selector);
}

/**
 * Query selector all wrapper
 * @param {string} selector - CSS selector
 * @returns {NodeList} All matching elements
 */
export function $$(selector) {
    return document.querySelectorAll(selector);
}

// ============================================================
// ID generation
// ============================================================

/**
 * Generate random ID string
 * @returns {string} Random ID
 */
export function generateId() {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
}

// ============================================================
// HTML sanitization
// ============================================================

/**
 * Basic HTML escape
 * @param {string} str - Input string
 * @returns {string} Sanitized string
 */
export function sanitize(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&')
        .replace(/</g, '<')
        .replace(/>/g, '>')
        .replace(/"/g, '"')
        .replace(/'/g, '&#39;');
}

// ============================================================
// Clipboard
// ============================================================

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    if (!text) return false;
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (error) {
        console.error('Copy failed:', error);
        return false;
    }
}

// ============================================================
// Textarea auto-resize
// ============================================================

/**
 * Adjust textarea height to content
 * @param {HTMLTextAreaElement} textarea - Textarea element
 */
export function autoResizeTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

// ============================================================
// Storage helpers
// ============================================================

/**
 * JSON-safe localStorage get
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key not found
 * @returns {any} Parsed value or default
 */
export function getStorage(key, defaultValue = null) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
        console.error('Storage read failed:', error);
        return defaultValue;
    }
}

/**
 * JSON-safe localStorage set
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
export function setStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Storage write failed:', error);
    }
}

/**
 * Remove item from localStorage
 * @param {string} key - Storage key
 */
export function removeStorage(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Storage removal failed:', error);
    }
}

// ============================================================
// Date formatting
// ============================================================

/**
 * Format Date to human-readable string
 * @param {Date} date - Date object
 * @returns {string} Formatted date string
 */
export function formatTime(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// ============================================================
// Animation
// ============================================================

/**
 * Apply CSS property object with duration/easing
 * @param {HTMLElement} element - Element to animate
 * @param {Object} properties - CSS properties
 * @param {number} duration - Animation duration in ms
 * @param {string} easing - CSS easing function
 * @returns {Promise<void>} Promise that resolves when animation completes
 */
export function animate(element, properties, duration = 300, easing = 'ease-in-out') {
    if (!element) return Promise.resolve();

    return new Promise((resolve) => {
        Object.assign(element.style, {
            transition: `all ${duration}ms ${easing}`,
            ...properties
        });

        // Resolve after animation completes
        setTimeout(() => resolve(), duration);
    });
}

// ============================================================
// Debounce
// ============================================================

/**
 * Standard debounce implementation
 * @param {Function} func - Function to debounce
 * @param {number} wait - Debounce delay in ms
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// ============================================================
// Toast Notifications (moved from app.js to avoid circular imports)
// ============================================================

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} type - Toast type (success, error, warning, info)
 */
export function showToast(message, type = "success") {
    const container = document.getElementById("toast-container") || createToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-message">${message}</span>
        <button class="toast-close" aria-label="Close">&times;</button>
    `;

    toast.querySelector(".toast-close").addEventListener("click", () => toast.remove());
    container.appendChild(toast);

    // Auto remove
    setTimeout(() => toast.remove(), 4000);

    return toast;
}

/**
 * Create toast container if it doesn't exist
 */
function createToastContainer() {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
    return container;
}
