/**
 * Arys AI v1.5.1 — Bundled JavaScript for GitHub Pages/Cloudflare
 *
 * This file combines all modules into a single bundle that works
 * in static hosting environments without ES6 module support.
 */

// ============================================================
// CONFIGURATION
// ============================================================
const CONFIG = {
    // API - Point to the Cloudflare Worker
    apiBase: "https://super-octo-broccoli.ackcrp.workers.dev",
    chatEndpoint: "/chat",
    feedbackEndpoint: "/feedback",
    healthEndpoint: "/health",

    // Default settings
    defaults: {
        model: "deepseek/deepseek-chat-v3-0324",
        temperature: 0.7,
        maxTokens: 4096,
        enableWebSearch: true,
        enableAutoSearch: true,
        searchDepth: 6,
        enableStreaming: true,
        theme: "dark",
    },

    // Available models
    models: [
        { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek V3", description: "Latest DeepSeek model with strong reasoning" },
        { id: "deepseek/deepseek-r1-distill-llama-70b", name: "DeepSeek R1 (70B)", description: "Reasoning-focused model distilled from R1" },
        { id: "gryphe/mythomax-l2-13b", name: "MythoMax 13B", description: "Creative and conversational model" },
        { id: "mistralai/mistral-7b-instruct", name: "Mistral 7B Instruct", description: "Fast and efficient instruction model" },
        { id: "openai/gpt-3.5-turbo", name: "GPT-3.5 Turbo", description: "OpenAI's fast and capable model" },
    ],

    // Themes
    themes: [
        { id: "dark", name: "Dark", preview: "#05050a" },
        { id: "light", name: "Light", preview: "#f8f8ff" },
        { id: "midnight", name: "Midnight", preview: "#020410" },
        { id: "frost", name: "Frost", preview: "#e8e8f0" },
    ],

    // Feedback types
    feedbackTypes: [
        { id: "bug", name: "Bug", icon: "bug" },
        { id: "suggestion", name: "Suggestion", icon: "suggestion" },
        { id: "feature", name: "Feature", icon: "feature" },
        { id: "other", name: "Other", icon: "other" },
    ],

    // Limits
    limits: {
        maxMessageLength: 10000,
        maxFeedbackMessageLength: 5000,
        maxNameLength: 100,
        maxEmailLength: 200,
        minFeedbackMessageLength: 10,
        maxHistoryItems: 50,
    },

    // Animation durations
    animation: {
        screenTransition: 600,
        messageIn: 300,
        modalIn: 250,
        toastIn: 300,
        typingBounce: 1400,
    },

    // Version
    version: "1.5.1",
    buildDate: "2026-07-19",
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return Array.from(document.querySelectorAll(selector));
}

function animate(element, properties, duration, easing) {
    if (!element) return;

    const startTime = performance.now();
    const startValues = {};
    const propertyNames = Object.keys(properties);

    // Set initial values
    propertyNames.forEach(prop => {
        startValues[prop] = getComputedStyle(element)[prop];
        element.style[prop] = startValues[prop];
    });

    function update() {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        propertyNames.forEach(prop => {
            const startValue = parseFloat(startValues[prop]);
            const endValue = parseFloat(properties[prop]);
            const currentValue = startValue + (endValue - startValue) * progress;
            element.style[prop] = currentValue + (prop.includes('opacity') ? '' : 'px');
        });

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function getStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

function setStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// ============================================================
// STATE MANAGEMENT
// ============================================================
let currentMessages = [];
let chatHistory = [];
let isStreaming = false;
let abortController = null;
let currentConversationId = null;
let isInitialized = false;

// Constants
const HISTORY_KEY = "arys_chat_history_v2";
const MESSAGES_KEY = "arys_current_messages_v2";

// ============================================================
// THEME MANAGEMENT
// ============================================================
function initTheme() {
    const savedTheme = getStorage("arys_theme") || CONFIG.defaults.theme;
    document.documentElement.setAttribute("data-theme", savedTheme);

    // Theme toggle buttons
    document.addEventListener("click", (e) => {
        const themeBtn = e.target.closest(".theme-btn");
        if (themeBtn) {
            const theme = themeBtn.dataset.theme;
            setTheme(theme);
        }
    });
}

function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    setStorage("arys_theme", theme);

    // Update theme buttons
    $$(".theme-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.theme === theme);
    });
}

// ============================================================
// SETTINGS MANAGEMENT
// ============================================================
function getApiSettings() {
    const savedSettings = getStorage("arys_settings") || {};
    return {
        ...CONFIG.defaults,
        ...savedSettings
    };
}

function initSettings() {
    // Load and apply saved settings
    const settings = getApiSettings();

    // Setup settings modal if it exists
    const settingsModal = $("#settings-modal");
    if (!settingsModal) return;

    // Model selection
    const modelSelect = $("#settings-model");
    if (modelSelect) {
        modelSelect.value = settings.model;
        modelSelect.addEventListener("change", () => {
            settings.model = modelSelect.value;
            saveSettings(settings);
        });
    }

    // Temperature slider
    const tempSlider = $("#settings-temperature");
    const tempValue = $("#temperature-value");
    if (tempSlider && tempValue) {
        tempSlider.value = settings.temperature;
        tempValue.textContent = settings.temperature;
        tempSlider.addEventListener("input", () => {
            const value = parseFloat(tempSlider.value).toFixed(1);
            tempValue.textContent = value;
            settings.temperature = parseFloat(value);
            saveSettings(settings);
        });
    }

    // Max tokens slider
    const tokensSlider = $("#settings-tokens");
    const tokensValue = $("#tokens-value");
    if (tokensSlider && tokensValue) {
        tokensSlider.value = settings.maxTokens;
        tokensValue.textContent = settings.maxTokens;
        tokensSlider.addEventListener("input", () => {
            tokensValue.textContent = tokensSlider.value;
            settings.maxTokens = parseInt(tokensSlider.value);
            saveSettings(settings);
        });
    }

    // Toggle switches
    setupToggle("settings-search", settings, "enableWebSearch");
    setupToggle("settings-auto-search", settings, "enableAutoSearch");
    setupToggle("settings-streaming", settings, "enableStreaming");

    // Search depth slider
    const depthSlider = $("#settings-depth");
    const depthValue = $("#depth-value");
    if (depthSlider && depthValue) {
        depthSlider.value = settings.searchDepth;
        depthValue.textContent = settings.searchDepth;
        depthSlider.addEventListener("input", () => {
            depthValue.textContent = depthSlider.value;
            settings.searchDepth = parseInt(depthSlider.value);
            saveSettings(settings);
        });
    }

    // Modal buttons
    const settingsClose = $("#settings-close");
    if (settingsClose) {
        settingsClose.addEventListener("click", () => {
            settingsModal.classList.remove("active");
        });
    }

    const settingsHome = $("#settings-home");
    if (settingsHome) {
        settingsHome.addEventListener("click", () => {
            showWelcomeScreen();
            settingsModal.classList.remove("active");
        });
    }

    const settingsClear = $("#settings-clear");
    if (settingsClear) {
        settingsClear.addEventListener("click", () => {
            if (confirm("Clear all conversations? This cannot be undone.")) {
                clearAllData();
            }
        });
    }
}

function setupToggle(elementId, settings, property) {
    const toggle = $(`#${elementId}`);
    const input = toggle?.querySelector("input");
    if (!input) return;

    input.checked = settings[property];
    toggle.addEventListener("click", () => {
        settings[property] = input.checked;
        saveSettings(settings);
    });
}

function saveSettings(settings) {
    setStorage("arys_settings", settings);
}

function clearAllData() {
    try {
        localStorage.clear();
        currentMessages = [];
        chatHistory = [];
        location.reload();
    } catch (error) {
        console.error("Error clearing data:", error);
    }
}

// ============================================================
// FEEDBACK SYSTEM
// ============================================================
function initFeedback() {
    const feedbackModal = $("#feedback-modal");
    if (!feedbackModal) return;

    const feedbackForm = $("#feedback-form");
    const feedbackSuccess = $("#feedback-success");
    const feedbackClose = $("#feedback-close");
    const feedbackSubmit = $("#feedback-submit");

    let currentFeedbackType = "bug";
    let currentRating = 0;

    // Type selection
    $$(".type-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            $$(".type-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFeedbackType = btn.dataset.type;
        });
    });

    // Star rating
    $$(".star").forEach(star => {
        star.addEventListener("click", () => {
            const value = parseInt(star.dataset.value);
            currentRating = value;

            $$(".star").forEach((s, i) => {
                s.classList.toggle("active", i < value);
            });
        });
    });

    // Close button
    if (feedbackClose) {
        feedbackClose.addEventListener("click", () => {
            feedbackModal.classList.remove("active");
            resetFeedbackForm();
        });
    }

    // Submit button
    if (feedbackSubmit) {
        feedbackSubmit.addEventListener("click", () => {
            const name = $("#feedback-name")?.value || "";
            const email = $("#feedback-email")?.value || "";
            const message = $("#feedback-message")?.value || "";

            if (!message || message.length < CONFIG.limits.minFeedbackMessageLength) {
                showToast("Please enter a detailed message", "warning");
                return;
            }

            submitFeedback({ name, email, type: currentFeedbackType, message, rating: currentRating });
        });
    }

    // Reset form
    function resetFeedbackForm() {
        $("#feedback-name").value = "";
        $("#feedback-email").value = "";
        $("#feedback-message").value = "";
        currentFeedbackType = "bug";
        currentRating = 0;

        $$(".type-btn").forEach(btn => btn.classList.remove("active"));
        $$(".type-btn")[0].classList.add("active");

        $$(".star").forEach(star => star.classList.remove("active"));

        if (feedbackForm) feedbackForm.style.display = "block";
        if (feedbackSuccess) feedbackSuccess.style.display = "none";
    }
}

async function submitFeedback(data) {
    const feedbackModal = $("#feedback-modal");
    const feedbackForm = $("#feedback-form");
    const feedbackSuccess = $("#feedback-success");
    const feedbackSubmit = $("#feedback-submit");

    // Show loading state
    feedbackSubmit.disabled = true;
    const originalText = feedbackSubmit.textContent;
    feedbackSubmit.textContent = "Submitting...";

    try {
        const response = await fetch(`${CONFIG.apiBase}${CONFIG.feedbackEndpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `API Error: ${response.status}`);
        }

        if (feedbackForm) feedbackForm.style.display = "none";
        if (feedbackSuccess) feedbackSuccess.style.display = "block";

        // Reset after 3 seconds
        setTimeout(() => {
            feedbackModal.classList.remove("active");
            // resetFeedbackForm is defined inside initFeedback scope, 
            // so we should trigger a reset via some other way or make it global
            // For now, let's just close and assume user can reopen
        }, 3000);

        showToast("Thank you for your feedback!", "success");
    } catch (error) {
        console.error("Feedback submission error:", error);
        showToast(`Error: ${error.message}`, "error");
    } finally {
        feedbackSubmit.disabled = false;
        feedbackSubmit.textContent = originalText;
    }
}

// ============================================================
// WELCOME SCREEN
// ============================================================
function showWelcomeScreen() {
    const welcomeScreen = $("#welcome-screen");
    if (!welcomeScreen) return;

    welcomeScreen.classList.add("active");
    document.body.style.overflow = "hidden";

    // Animate entrance
    animateEntrance();

    // Start 3D background
    init3D();
}

function hideWelcomeScreen() {
    const welcomeScreen = $("#welcome-screen");
    const chatScreen = $("#chat-screen");
    if (!welcomeScreen) return;

    welcomeScreen.classList.remove("active");

    // Show chat screen with proper initialization
    if (chatScreen) {
        chatScreen.style.display = "flex";
        // Add active class for CSS transition
        chatScreen.classList.add("active");
        setTimeout(() => {
            chatScreen.style.opacity = "1";
        }, 50);
    }

    document.body.style.overflow = "";

    // Restart 3D background for chat screen with proper waiting
    setTimeout(() => {
        stop3D();
        setTimeout(() => {
            waitForThreeJS().then(init3D).catch(() => {
                console.warn("Three.js not available, using CSS fallback");
                setupCSSFallback();
            });
        }, 100);
    }, 300);
}

function animateEntrance() {
    const elements = [
        { selector: ".welcome-logo", delay: 0 },
        { selector: ".welcome-title", delay: 150 },
        { selector: ".welcome-description", delay: 300 },
        { selector: ".welcome-info-card", delay: 450 },
        { selector: ".welcome-btn", delay: 600 },
    ];

    elements.forEach(({ selector, delay }) => {
        const el = $(selector);
        if (el) {
            el.style.opacity = "0";
            el.style.transform = "translateY(30px)";
            setTimeout(() => {
                el.style.transition = "all 600ms cubic-bezier(0.16, 1, 0.3, 1)";
                el.style.opacity = "1";
                el.style.transform = "translateY(0)";
            }, delay);
        }
    });
}

function initWelcomeScreen(onEnter) {
    const enterBtn = $("#enter-chat-btn");
    const welcomeScreen = $("#welcome-screen");

    if (!enterBtn || !welcomeScreen) return;

    // Enter button click
    enterBtn.addEventListener("click", () => {
        // Animate exit
        const elements = welcomeScreen.querySelectorAll(".welcome-logo, .welcome-title, .welcome-description, .welcome-info-card, .welcome-btn");
        elements.forEach((el, i) => {
            setTimeout(() => {
                el.style.transition = "all 300ms cubic-bezier(0.4, 0, 1, 1)";
                el.style.opacity = "0";
                el.style.transform = "translateY(-20px)";
            }, i * 50);
        });

        setTimeout(() => {
            hideWelcomeScreen();
            setStorage("arys_welcome_dismissed", "true");
            if (onEnter) onEnter();
        }, 400);
    });

    // Keyboard: Enter or Space
    document.addEventListener("keydown", (e) => {
        if (welcomeScreen.classList.contains("active") && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            enterBtn.click();
        }
    });

    // Touch ripple effect on button
    enterBtn.addEventListener("pointerdown", (e) => {
        const rect = enterBtn.getBoundingClientRect();
        const ripple = document.createElement("span");
        ripple.className = "btn-ripple";
        ripple.style.left = `${e.clientX - rect.left}px`;
        ripple.style.top = `${e.clientY - rect.top}px`;
        enterBtn.appendChild(ripple);

        setTimeout(() => ripple.remove(), 600);
    });
}

// ============================================================
// CHAT FUNCTIONALITY
// ============================================================
function initChat() {
    // Check if already initialized
    if (document.getElementById("messages-list")?.dataset?.initialized) return;

    // Set initialized flag
    const messagesList = $("#messages-list");
    if (messagesList) {
        messagesList.dataset.initialized = "true";
    }

    // Load history
    loadHistory();

    // Setup event listeners
    setupChatEventListeners();

    // Show welcome message if no history
    if (currentMessages.length === 0) {
        showChatWelcomeMessage();
    }

    console.log("Chat module initialized");
}

function setupChatEventListeners() {
    const sendBtn = $("#send-btn");
    const chatForm = $("#chat-form");
    const chatInput = $("#chat-input");
    const newChatBtn = $("#new-chat-btn");
    const sidebarToggle = $("#sidebar-toggle");
    const sidebarOverlay = $("#sidebar-overlay");
    const sidebar = $("#sidebar");

    if (!sendBtn || !chatForm || !chatInput) {
        console.error("Required chat elements not found");
        return;
    }

    // Send button click
    sendBtn.addEventListener("click", handleSendMessage);

    // Form submit
    chatForm.addEventListener("submit", (e) => {
        e.preventDefault();
        handleSendMessage();
    });

    // Input keypress (Enter to send)
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    // Input focus/blur for better UX
    chatInput.addEventListener("focus", () => {
        chatForm.classList.add("focused");
    });

    chatInput.addEventListener("blur", () => {
        chatForm.classList.remove("focused");
    });

    // New chat button
    if (newChatBtn) {
        newChatBtn.addEventListener("click", () => {
            if (isStreaming) {
                showToast("Please wait for current response to complete", "warning");
                return;
            }
            clearChat();
            showChatWelcomeMessage();
        });
    }

    // Sidebar toggle for mobile
    if (sidebarToggle && sidebar && sidebarOverlay) {
        sidebarToggle.addEventListener("click", toggleSidebar);
        sidebarOverlay.addEventListener("click", toggleSidebar);
    }

    // Auto-resize textarea
    chatInput.addEventListener("input", autoResizeTextarea);
    autoResizeTextarea();

    // Setup feedback and settings buttons
    setupChatHeaderButtons();
}

function setupChatHeaderButtons() {
    const chatFeedbackBtn = $("#chat-feedback-btn");
    const chatSettingsBtn = $("#chat-settings-btn");

    if (chatFeedbackBtn) {
        chatFeedbackBtn.addEventListener("click", () => {
            const feedbackModal = $("#feedback-modal");
            if (feedbackModal) {
                feedbackModal.classList.add("active");
            }
        });
    }

    if (chatSettingsBtn) {
        chatSettingsBtn.addEventListener("click", () => {
            const settingsModal = $("#settings-modal");
            if (settingsModal) {
                settingsModal.classList.add("active");
            }
        });
    }
}

async function handleSendMessage() {
    const chatInput = $("#chat-input");
    if (!chatInput) return;

    const message = chatInput.value.trim();
    if (!message || isStreaming) return;

    // Clear input
    chatInput.value = "";
    autoResizeTextarea();
    chatInput.focus();

    // Add user message to UI and state
    addUserMessage(message);

    // Call real AI response
    await callAIResponse(message);
}

function addUserMessage(message) {
    const userMessage = {
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
        id: `msg-${Date.now()}`
    };

    currentMessages.push(userMessage);
    renderMessage(userMessage, "user");
    saveCurrentMessages();

    // Auto-scroll to bottom
    scrollToBottom();
}

async function callAIResponse(userMessage) {
    if (isStreaming) return;
    isStreaming = true;
    abortController = new AbortController();

    // Show typing indicator
    const typingIndicator = showTypingIndicator();
    let assistantMessageElement = null;
    let fullContent = "";

    try {
        const settings = getApiSettings();
        const response = await fetch(`${CONFIG.apiBase}${CONFIG.chatEndpoint}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: currentMessages,
                settings: settings,
                stream: settings.enableStreaming
            }),
            signal: abortController.signal
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `API Error: ${response.status}`);
        }

        if (settings.enableStreaming) {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            // Remove typing indicator when real stream starts
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.remove();
            }

            // Create initial assistant message element
            const assistantId = `msg-${Date.now()}`;
            assistantMessageElement = createAssistantMessageElement(assistantId);
            const contentContainer = assistantMessageElement.querySelector(".message-text");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith("data: ")) continue;

                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        
                        if (data.type === "search") {
                            updateSearchIndicator(data.status);
                        } else if (data.type === "text") {
                            fullContent += data.content;
                            contentContainer.textContent = fullContent;
                            scrollToBottom();
                        } else if (data.type === "error") {
                            throw new Error(data.error);
                        }
                    } catch (e) {
                        console.warn("Error parsing stream chunk:", e);
                    }
                }
            }
            
            completeResponse(null, fullContent, assistantId);
        } else {
            const data = await response.json();
            if (typingIndicator && typingIndicator.parentNode) {
                typingIndicator.remove();
            }
            const assistantId = `msg-${Date.now()}`;
            const content = data.choices?.[0]?.message?.content || "No response received.";
            completeResponse(null, content, assistantId);
        }

    } catch (error) {
        console.error("AI Response Error:", error);
        if (typingIndicator && typingIndicator.parentNode) {
            typingIndicator.remove();
        }
        
        const errorMessage = {
            role: "assistant",
            content: `Error: ${error.message}. Please check your connection or try again later.`,
            timestamp: new Date().toISOString(),
            id: `msg-err-${Date.now()}`,
            isError: true
        };
        renderMessage(errorMessage, "assistant");
    } finally {
        isStreaming = false;
        abortController = null;
        updateSearchIndicator(null);
    }
}

function updateSearchIndicator(status) {
    const indicator = $("#search-indicator");
    if (!indicator) return;

    if (!status) {
        indicator.style.display = "none";
        indicator.textContent = "";
        return;
    }

    indicator.style.display = "flex";
    indicator.textContent = status.message || "Searching...";
    indicator.className = `search-indicator ${status.type || 'info'}`;
}

function createAssistantMessageElement(id) {
    const messagesList = $("#messages-list");
    if (!messagesList) return null;

    const messageElement = document.createElement("div");
    messageElement.className = "message assistant";
    messageElement.id = `message-${id}`;
    messageElement.style.opacity = "1";
    messageElement.style.transform = "translateY(0)";

    messageElement.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="message-text"></div>
        </div>
    `;

    messagesList.appendChild(messageElement);
    return messageElement;
}

function showTypingIndicator() {
    const messagesList = $("#messages-list");
    if (!messagesList) return null;

    const typingIndicator = document.createElement("div");
    typingIndicator.className = "message assistant";
    typingIndicator.id = "typing-indicator";

    typingIndicator.innerHTML = `
        <div class="message-avatar">AI</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
                <span class="typing-label">Thinking...</span>
            </div>
        </div>
    `;

    messagesList.appendChild(typingIndicator);
    scrollToBottom();

    return typingIndicator;
}

function updateTypingIndicator(typingIndicator, content) {
    if (!typingIndicator) return;

    const messageContent = typingIndicator.querySelector(".message-content");
    if (!messageContent) return;

    if (content && content.trim()) {
        messageContent.innerHTML = `
            <div class="message-text">${content}</div>
            <div class="typing-indicator" style="margin-top: 8px;">
                <span></span>
                <span></span>
                <span></span>
            </div>
        `;
    }
}

function completeResponse(typingIndicator, finalContent, customId) {
    if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.remove();
    }

    const id = customId || `msg-${Date.now() + 1}`;
    
    // Check if message already rendered (streaming case)
    const existing = document.getElementById(`message-${id}`);
    if (!existing) {
        const assistantMessage = {
            role: "assistant",
            content: finalContent,
            timestamp: new Date().toISOString(),
            id: id
        };

        currentMessages.push(assistantMessage);
        renderMessage(assistantMessage, "assistant");
    } else {
        // Just update the state
        currentMessages.push({
            role: "assistant",
            content: finalContent,
            timestamp: new Date().toISOString(),
            id: id
        });
    }

    saveCurrentMessages();
    isStreaming = false;
    scrollToBottom();
}

function renderMessage(message, role) {
    const messagesList = $("#messages-list");
    if (!messagesList) return;

    const messageElement = document.createElement("div");
    messageElement.className = `message ${role}`;
    messageElement.id = `message-${message.id}`;

    const avatarText = role === "user" ? "You" : "AI";
    const contentHtml = message.isError
        ? `<div class="message-text error">${message.content}</div>`
        : `<div class="message-text">${message.content}</div>`;

    messageElement.innerHTML = `
        <div class="message-avatar">${avatarText}</div>
        <div class="message-content">
            ${contentHtml}
        </div>
    `;

    messagesList.appendChild(messageElement);

    setTimeout(() => {
        messageElement.style.opacity = "1";
        messageElement.style.transform = "translateY(0)";
    }, 10);

    scrollToBottom();
}

function autoResizeTextarea() {
    const chatInput = $("#chat-input");
    if (!chatInput) return;

    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 180)}px`;
}

function scrollToBottom() {
    const messagesArea = $("#messages-area");
    if (messagesArea) {
        setTimeout(() => {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }, 50);
    }
}

function showChatWelcomeMessage() {
    const messagesList = $("#messages-list");
    if (!messagesList) return;

    messagesList.innerHTML = `
        <div class="welcome-message">
            <div class="welcome-message-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 2a10 10 0 0 0-3.93 18.6c.39-.15.77-.32 1.14-.49A10 10 0 0 0 12 2Z"/>
                </svg>
            </div>
            <h2>How can I help you today?</h2>
            <p>Ask me anything — I can search the web, write code, explain concepts, and more.</p>
        </div>
    `;
}

function loadHistory() {
    try {
        const savedHistory = getStorage(HISTORY_KEY);
        const savedMessages = getStorage(MESSAGES_KEY);

        if (savedHistory && Array.isArray(savedHistory)) {
            chatHistory = savedHistory;
        }

        if (savedMessages && Array.isArray(savedMessages)) {
            currentMessages = savedMessages;
        }
    } catch (error) {
        console.error("Error loading history:", error);
    }
}

function saveCurrentMessages() {
    try {
        setStorage(MESSAGES_KEY, currentMessages);
    } catch (error) {
        console.error("Error saving current messages:", error);
    }
}

function clearChat() {
    try {
        const chatMessages = document.getElementById("messages-list");
        if (chatMessages) chatMessages.innerHTML = "";

        currentMessages = [];
        currentConversationId = null;

        try {
            localStorage.removeItem(MESSAGES_KEY);
        } catch (error) {
            console.warn("Failed to clear messages storage:", error);
        }

        showChatWelcomeMessage();
        console.log("Chat cleared successfully");
    } catch (error) {
        console.error("Error during clearChat():", error);
    }
}

function toggleSidebar() {
    const sidebar = $("#sidebar");
    const sidebarOverlay = $("#sidebar-overlay");

    if (sidebar && sidebarOverlay) {
        sidebar.classList.toggle("open");
        sidebarOverlay.classList.toggle("active");
    }
}

// ============================================================
// 3D BACKGROUND
// ============================================================
let scene, camera, renderer;
let particles, floaters = [];
let aiCore, rotatingObjects = [];
let animationId = null;
let isRunning = false;
let performanceMode = false;

function init3D() {
    if (isRunning) return;
    performanceMode = isMobile();
    const particleCount = performanceMode ? 30 : 60;
    const floaterCount = performanceMode ? 3 : 5;

    try {
        const container = document.getElementById("threeContainer");
        if (!container || container.querySelector("canvas")) return;

        if (typeof THREE === 'undefined') {
            console.warn("Three.js not loaded, using CSS fallback");
            setupCSSFallback();
            return;
        }

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.z = 40;
        camera.position.y = 5;

        renderer = new THREE.WebGLRenderer({
            alpha: true,
            antialias: !performanceMode,
            powerPreference: "low-power",
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        createParticleSystem(particleCount);
        createFloaters(floaterCount);
        createAICore();

        window.addEventListener("resize", debounce(onResize, 250));
        isRunning = true;
        animate();

        console.log("3D background initialized");
    } catch (e) {
        console.warn("3D background failed to load:", e.message);
        setupCSSFallback();
    }
}

function createParticleSystem(count) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * Math.PI;
        const radius = 25 + Math.random() * 15;

        positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = radius * Math.cos(phi) - 10;

        sizes[i] = 0.1 + Math.random() * 0.3;
        const colorFactor = 0.8 + Math.random() * 0.4;
        colors[i * 3] = colorFactor;
        colors[i * 3 + 1] = colorFactor;
        colors[i * 3 + 2] = colorFactor;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);
}

function createFloaters(count) {
    const shapes = [
        { type: "box", size: [1.4, 1.4, 1.4], color: 0xffffff, opacity: 0.12, wireframe: true },
        { type: "sphere", size: 1.0, color: 0xffffff, opacity: 0.08, wireframe: true },
        { type: "tetrahedron", size: 1.2, color: 0xffffff, opacity: 0.15, wireframe: true },
        { type: "octahedron", size: 1.0, color: 0xffffff, opacity: 0.10, wireframe: true },
        { type: "icosahedron", size: 1.1, color: 0xffffff, opacity: 0.14, wireframe: true },
        { type: "torus", size: [1.8, 0.4], color: 0xffffff, opacity: 0.09, wireframe: true },
    ];

    for (let i = 0; i < count; i++) {
        const shape = shapes[i % shapes.length];
        let geometry, mesh;

        switch (shape.type) {
            case "box":
                geometry = new THREE.BoxGeometry(...shape.size);
                break;
            case "sphere":
                geometry = new THREE.SphereGeometry(shape.size, 16, 16);
                break;
            case "tetrahedron":
                geometry = new THREE.TetrahedronGeometry(shape.size);
                break;
            case "octahedron":
                geometry = new THREE.OctahedronGeometry(shape.size);
                break;
            case "icosahedron":
                geometry = new THREE.IcosahedronGeometry(shape.size, 0);
                break;
            case "torus":
                geometry = new THREE.TorusGeometry(...shape.size, 8, 16);
                break;
            default:
                geometry = new THREE.BoxGeometry(...shape.size);
        }

        const material = new THREE.MeshBasicMaterial({
            color: shape.color,
            wireframe: shape.wireframe,
            transparent: true,
            opacity: shape.opacity,
            side: THREE.DoubleSide,
        });

        mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            (Math.random() - 0.5) * 35,
            (Math.random() - 0.5) * 25,
            (Math.random() - 0.5) * 20 - 15
        );

        mesh.rotation.set(
            Math.random() * Math.PI,
            Math.random() * Math.PI,
            Math.random() * Math.PI
        );

        mesh.userData = {
            rotSpeedX: (Math.random() - 0.5) * 0.003,
            rotSpeedY: (Math.random() - 0.5) * 0.003,
            rotSpeedZ: (Math.random() - 0.5) * 0.002,
            floatSpeed: 0.3 + Math.random() * 0.4,
            floatAmp: 1.0 + Math.random() * 1.5,
            phase: Math.random() * Math.PI * 2,
            scalePulse: 0.9 + Math.random() * 0.2,
        };

        scene.add(mesh);
        floaters.push(mesh);
    }
}

function createAICore() {
    const coreGeometry = new THREE.SphereGeometry(2.2, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
    });

    aiCore = new THREE.Mesh(coreGeometry, coreMaterial);
    aiCore.position.set(0, 0, -10);

    const ringCount = 3;
    const ringGroup = new THREE.Group();

    for (let i = 0; i < ringCount; i++) {
        const ringGeometry = new THREE.TorusGeometry(2.8 + i * 0.6, 0.15, 8, 32);
        const ringMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.12 - i * 0.03,
            side: THREE.DoubleSide,
        });

        const ring = new THREE.Mesh(ringGeometry, ringMaterial);

        if (i === 0) {
            ring.rotation.x = Math.PI / 4;
        } else if (i === 1) {
            ring.rotation.y = Math.PI / 4;
        } else {
            ring.rotation.z = Math.PI / 4;
        }

        ring.userData = {
            rotationSpeed: (0.002 + i * 0.001) * (Math.random() > 0.5 ? 1 : -1),
            rotationAxis: i === 0 ? 'x' : i === 1 ? 'y' : 'z',
        };

        ringGroup.add(ring);
        rotatingObjects.push(ring);
    }

    aiCore.add(ringGroup);
    scene.add(aiCore);
    rotatingObjects.push(aiCore);
    aiCore.userData = {
        rotationSpeed: 0.001,
        rotationAxis: 'y',
    };
}

function animate() {
    if (!isRunning) return;
    animationId = requestAnimationFrame(animate);

    const time = Date.now() * 0.001;

    if (particles) {
        const positions = particles.geometry.attributes.position.array;
        const sizes = particles.geometry.attributes.size.array;

        for (let i = 0; i < positions.length; i += 3) {
            const depthFactor = 1 - Math.abs(positions[i + 2]) / 50;
            positions[i] += Math.sin(time * 0.5 + i * 0.1) * 0.01 * depthFactor;
            positions[i + 1] += Math.cos(time * 0.3 + i * 0.1) * 0.015 * depthFactor;
            sizes[i / 3] = 0.15 + Math.sin(time * 2 + i) * 0.05;
        }

        particles.geometry.attributes.position.needsUpdate = true;
        particles.geometry.attributes.size.needsUpdate = true;
    }

    if (floaters.length > 0) {
        floaters.forEach((mesh, idx) => {
            const data = mesh.userData;
            mesh.rotation.x += data.rotSpeedX;
            mesh.rotation.y += data.rotSpeedY;
            mesh.rotation.z += data.rotSpeedZ || 0;
            mesh.position.y += Math.sin(time * data.floatSpeed + data.phase) * 0.008 * data.floatAmp;
            const scale = data.scalePulse * (1 + Math.sin(time * 1.5 + idx) * 0.05);
            mesh.scale.set(scale, scale, scale);
        });
    }

    if (rotatingObjects.length > 0) {
        rotatingObjects.forEach(obj => {
            const data = obj.userData;
            if (data.rotationAxis === 'x') {
                obj.rotation.x += data.rotationSpeed;
            } else if (data.rotationAxis === 'y') {
                obj.rotation.y += data.rotationSpeed;
            } else if (data.rotationAxis === 'z') {
                obj.rotation.z += data.rotationSpeed;
            }
        });
    }

    if (renderer && scene && camera) {
        renderer.render(scene, camera);
    }
}

function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupCSSFallback() {
    const container = document.getElementById("threeContainer");
    if (!container) return;

    for (let i = 0; i < 20; i++) {
        const dot = document.createElement("div");
        dot.className = "particle-dot";
        dot.style.cssText = `
            position: absolute;
            width: ${2 + Math.random() * 6}px;
            height: ${2 + Math.random() * 6}px;
            background: rgba(255,255,255,${0.1 + Math.random() * 0.2});
            border-radius: 50%;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            pointer-events: none;
            animation: floatParticle ${8 + Math.random() * 12}s infinite ease-in-out;
            animation-delay: ${Math.random() * 6}s;
            will-change: transform, opacity;
        `;
        container.appendChild(dot);
    }

    for (let i = 0; i < 3; i++) {
        const wireframe = document.createElement("div");
        wireframe.className = "wireframe-fallback";
        wireframe.style.cssText = `
            position: absolute;
            width: ${40 + Math.random() * 60}px;
            height: ${40 + Math.random() * 60}px;
            border: 1px solid rgba(255,255,255,0.08);
            left: ${Math.random() * 80 + 10}%;
            top: ${Math.random() * 80 + 10}%;
            pointer-events: none;
            animation: spin-slow ${20 + Math.random() * 10}s linear infinite;
            border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
            opacity: ${0.05 + Math.random() * 0.1};
        `;
        container.appendChild(wireframe);
    }
}

function stop3D() {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// ============================================================
// MAIN APP INITIALIZATION
// ============================================================
function initApp() {
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
        // Wait for Three.js to be ready before initializing 3D
        waitForThreeJS().then(init3D).catch(() => {
            console.warn("Three.js not available, using CSS fallback");
            setupCSSFallback();
        });
    });

    // Show welcome screen
    showWelcomeScreen();

    // Check for welcome screen dismissal
    const dismissed = getStorage("arys_welcome_dismissed");
    if (dismissed) {
        hideWelcomeScreen();
        initChat();
        // Wait for Three.js to be ready
        waitForThreeJS().then(init3D).catch(() => {
            console.warn("Three.js not available, using CSS fallback");
            setupCSSFallback();
        });
    }

    // Global event listeners
    setupGlobalListeners();

    console.log(`Arys AI v${CONFIG.version} initialized`);
}

// Helper function to wait for Three.js to load
function waitForThreeJS() {
    return new Promise((resolve, reject) => {
        // Check if THREE is already loaded
        if (typeof THREE !== 'undefined') {
            resolve();
            return;
        }

        // Wait for Three.js with timeout
        const checkInterval = setInterval(() => {
            if (typeof THREE !== 'undefined') {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                resolve();
            }
        }, 100);

        const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error("Three.js loading timeout"));
        }, 5000); // 5 second timeout
    });
}

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
            // Wait for Three.js to be ready before re-initializing
            waitForThreeJS().then(init3D).catch(() => {
                console.warn("Three.js not available on visibility change, using CSS fallback");
                setupCSSFallback();
            });
        }
    });
}

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
// GLOBAL API
// ============================================================
window.ArysAI = {
    initApp,
    sendMessage: handleSendMessage,
    clearChat,
    toggleSidebar,
    showToast,
    version: CONFIG.version,
};

// ============================================================
// AUTO-INITIALIZE
// ============================================================
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initApp);
} else {
    initApp();
}