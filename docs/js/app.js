
// docs/js/app.js
//
// Arys AI v1.5.1 — Main application entry point

import { CONFIG } from "./config.js";
import { initTheme } from "./themes.js";
import { initSettings } from "./settings.js";
import { initFeedback } from "./feedback.js";
import { initWelcomeScreen, showWelcomeScreen, hideWelcomeScreen } from "./welcome.js";
import { initChat, sendMessage, clearChat, toggleSidebar } from "./chat.js";
import { init3D, stop3D } from "./3d.js";
import { getStorage, setStorage } from "./utils.js";

// ============================================================
// Global state
// ============================================================
let isInitialized = false;

// ============================================================
// Initialize the application
// ============================================================
export async function initApp() {
    if (isInitialized) return;
    isInitialized = true;

    // Initialize theme
    initTheme();

    // Initialize settings
    initSettings();

    // Initialize feedback
    initFeedback();

    // Initialize welcome screen
    initWelcomeScreen(() => {
        // On welcome screen enter
        initChat();
        init3D();
    });

    // Show welcome screen
    showWelcomeScreen();

    // Check for welcome screen dismissal
    const dismissed = getStorage("arys_welcome_dismissed");
    if (dismissed) {
        hideWelcomeScreen();
        initChat();
        init3D();
    }

    // Check health status in background
    checkHealthStatus();

    // Global event listeners
    setupGlobalListeners();

    console.log(`Arys AI v${CONFIG.version} initialized`);
}

// ============================================================
// Setup global event listeners (only non-module-specific ones)
// ============================================================
function setupGlobalListeners() {
    // Close modals on Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeAllModals();
        }
    });

    // Window resize - trigger resize for 3D
    window.addEventListener("resize", debounce(() => {
        window.dispatchEvent(new Event("resize"));
    }, 250));

    // Visibility change - pause 3D when tab hidden
    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            stop3D();
        } else {
            init3D();
        }
    });
}

// ============================================================
// Toast notifications (global utility)
// ============================================================
function showToast(message, type = "success") {
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

function createToastContainer() {
    const container = document.createElement("div");
    container.id = "toast-container";
    container.className = "toast-container";
    document.body.appendChild(container);
    return container;
}

function closeAllModals() {
    const modals = document.querySelectorAll(".modal-overlay.active");
    modals.forEach((modal) => {
        modal.classList.remove("active");
    });
    document.body.style.overflow = "";
}

// ============================================================
// Debounce helper
// ============================================================
function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ============================================================
// Export for global access
// ============================================================
window.ArysAI = {
    initApp,
    sendMessage,
    clearChat,
    toggleSidebar,
    showToast,
    version: CONFIG.version,
};

// ============================================================
// Health Check Banner
// ============================================================
async function checkHealthStatus() {
    try {
        // Import checkHealth function
        const { checkHealth } = await import("./api.js");

        // Check health in background
        setTimeout(async () => {
            try {
                const healthData = await checkHealth();

                // Check if worker is unreachable (network error would have been caught above)
                if (!healthData || !healthData.status) {
                    showHealthBanner("⚠ AI service unavailable — responses may be delayed.", "warning");
                }
                // Check if OpenRouter API key is not configured
                else if (healthData.status === "error" && healthData.error?.includes("OpenRouter API key is not configured")) {
                    showHealthBanner("⚠ AI service not configured.", "warning");
                }
            } catch (error) {
                // Network error or worker unreachable
                showHealthBanner("⚠ AI service unavailable — responses may be delayed.", "warning");
            }
        }, 1000); // Check after a short delay to not block initialization
    } catch (error) {
        console.error("Health check failed:", error);
    }
}

function showHealthBanner(message, type = "warning") {
    // Check if banner already exists
    if (document.getElementById("health-banner")) return;

    const banner = document.createElement("div");
    banner.id = "health-banner";
    banner.className = `health-banner ${type}`;
    banner.innerHTML = `
        <span class="health-banner-icon">⚠</span>
        <span class="health-banner-message">${message}</span>
        <button class="health-banner-close" aria-label="Close">&times;</button>
    `;

    // Add close functionality
    banner.querySelector(".health-banner-close").addEventListener("click", () => {
        banner.remove();
    });

    // Auto-dismiss after 8 seconds
    setTimeout(() => {
        if (banner.parentNode) {
            banner.remove();
        }
    }, 8000);

    // Insert at top of body
    document.body.insertBefore(banner, document.body.firstChild);

    return banner;
}

// ============================================================
// Auto-initialize on DOM ready
// ============================================================
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}
