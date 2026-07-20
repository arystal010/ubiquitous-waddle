/**
 * Arys AI v1.5.1 — Chat Module
 *
 * Complete chat functionality including:
 * - Message handling
 * - Web search integration
 * - Streaming responses
 * - Message history
 * - UI rendering
 * - Error handling
 */

import { $, $$, animate, debounce, getStorage, setStorage, showToast } from "./utils.js";
import { streamChat } from "./api.js";
import { CONFIG } from "./config.js";
import { getApiSettings } from "./settings.js";

// ============================================================
// State Management
// ============================================================
let currentMessages = [];
let chatHistory = [];
let isStreaming = false;
let abortController = null;
let currentConversationId = null;

// Constants
const HISTORY_KEY = "arys_chat_history_v2";
const MESSAGES_KEY = "arys_current_messages_v2";

// ============================================================
// Initialize Chat
// ============================================================
export function initChat() {
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
    setupEventListeners();

    // Show welcome message if no history
    if (currentMessages.length === 0) {
        showWelcomeMessage();
    }

    console.log("Chat module initialized");
}

// ============================================================
// Setup Event Listeners
// ============================================================
function setupEventListeners() {
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
            showWelcomeMessage();
        });
    }

    // Sidebar toggle for mobile
    if (sidebarToggle && sidebar && sidebarOverlay) {
        sidebarToggle.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            sidebarOverlay.classList.toggle("active");
        });

        sidebarOverlay.addEventListener("click", () => {
            sidebar.classList.remove("open");
            sidebarOverlay.classList.remove("active");
        });
    }

    // Stop button functionality
    const stopBtn = $("#stop-btn");
    if (stopBtn) {
        stopBtn.addEventListener("click", () => {
            if (abortController) {
                abortController.abort();
                isStreaming = false;
                abortController = null;

                // Hide stop button, show send button
                stopBtn.style.display = "none";
                if (sendBtn) sendBtn.style.display = "inline-block";

                console.log("Stream stopped by user");
            }
        });

        // Initially hide stop button
        stopBtn.style.display = "none";
    }

    // Auto-resize textarea
    chatInput.addEventListener("input", autoResizeTextarea);
    autoResizeTextarea();

    // Setup feedback and settings buttons
    setupHeaderButtons();
}

// ============================================================
// Setup Header Buttons
// ============================================================
function setupHeaderButtons() {
    const chatFeedbackBtn = $("#chat-feedback-btn");
    const chatSettingsBtn = $("#chat-settings-btn");

    if (chatFeedbackBtn) {
        chatFeedbackBtn.addEventListener("click", () => {
            if (window.ArysAI?.showFeedbackModal) {
                window.ArysAI.showFeedbackModal();
            }
        });
    }

    if (chatSettingsBtn) {
        chatSettingsBtn.addEventListener("click", () => {
            if (window.ArysAI?.showSettingsModal) {
                window.ArysAI.showSettingsModal();
            }
        });
    }
}

// ============================================================
// Handle Send Message
// ============================================================
function handleSendMessage() {
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

    // Start streaming response
    startStreamingResponse(message);
}

// ============================================================
// Add User Message
// ============================================================
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

// ============================================================
// Start Streaming Response
// ============================================================
function startStreamingResponse(userMessage) {
    isStreaming = true;
    const settings = getApiSettings();

    // Show typing indicator
    const typingIndicator = showTypingIndicator();

    // Create abort controller for cancellation
    abortController = new AbortController();

    // Toggle buttons: hide send, show stop
    const sendBtn = $("#send-btn");
    const stopBtn = $("#stop-btn");
    if (sendBtn) sendBtn.style.display = "none";
    if (stopBtn) stopBtn.style.display = "inline-block";

    // Build messages for API
    const messages = [...currentMessages];

    // Add to chat history
    addToHistory(userMessage.content);

    // API call
    streamChat(
        messages,
        (token, fullContent) => {
            // Update typing indicator with streaming content
            updateTypingIndicator(typingIndicator, fullContent);
        },
        (finalContent) => {
            // Complete the response
            completeResponse(typingIndicator, finalContent);
        },
        (error) => {
            // Handle error
            handleStreamError(typingIndicator, error);
        },
        abortController.signal
    );
}

// ============================================================
// Complete Response
// ============================================================
function completeResponse(typingIndicator, finalContent) {
    // Remove typing indicator
    if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.remove();
    }

    // Add assistant message
    const assistantMessage = {
        role: "assistant",
        content: finalContent,
        timestamp: new Date().toISOString(),
        id: `msg-${Date.now() + 1}`
    };

    currentMessages.push(assistantMessage);
    renderMessage(assistantMessage, "assistant");
    saveCurrentMessages();

    // Update conversation in history
    updateCurrentConversation(assistantMessage.content);

    isStreaming = false;
    abortController = null;

    // Toggle buttons: show send, hide stop
    const sendBtn = $("#send-btn");
    const stopBtn = $("#stop-btn");
    if (sendBtn) sendBtn.style.display = "inline-block";
    if (stopBtn) stopBtn.style.display = "none";

    // Auto-scroll to bottom
    scrollToBottom();
}

// ============================================================
// Handle Stream Error
// ============================================================
function handleStreamError(typingIndicator, error) {
    console.error("Stream error:", error);

    // Remove typing indicator
    if (typingIndicator && typingIndicator.parentNode) {
        typingIndicator.remove();
    }

    // Show error message
    const errorMessage = {
        role: "assistant",
        content: `⚠️ **Error**: ${error.message || "Failed to get response. Please try again."}`,
        timestamp: new Date().toISOString(),
        id: `msg-${Date.now() + 2}`,
        isError: true
    };

    currentMessages.push(errorMessage);
    renderMessage(errorMessage, "assistant");
    saveCurrentMessages();

    isStreaming = false;
    abortController = null;

    // Toggle buttons: show send, hide stop
    const sendBtn = $("#send-btn");
    const stopBtn = $("#stop-btn");
    if (sendBtn) sendBtn.style.display = "inline-block";
    if (stopBtn) stopBtn.style.display = "none";

    // Show toast notification
    showToast("Error getting response. Check your connection.", "error");

    // Auto-scroll to bottom
    scrollToBottom();
}

// ============================================================
// Show Typing Indicator
// ============================================================
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

// ============================================================
// Update Typing Indicator
// ============================================================
function updateTypingIndicator(typingIndicator, content) {
    if (!typingIndicator) return;

    const messageContent = typingIndicator.querySelector(".message-content");
    if (!messageContent) return;

    // If we have content, replace typing indicator with actual content
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

// ============================================================
// Render Message
// ============================================================
function renderMessage(message, role) {
    const messagesList = $("#messages-list");
    if (!messagesList) return;

    const messageElement = document.createElement("div");
    messageElement.className = `message ${role}`;
    messageElement.id = `message-${message.id}`;

    // Avatar
    const avatarText = role === "user" ? "You" : "AI";

    // Content with Markdown support
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

    // Apply animations
    setTimeout(() => {
        messageElement.style.opacity = "1";
        messageElement.style.transform = "translateY(0)";
    }, 10);

    // Auto-scroll to bottom
    scrollToBottom();
}

// ============================================================
// Auto-resize Textarea
// ============================================================
function autoResizeTextarea() {
    const chatInput = $("#chat-input");
    if (!chatInput) return;

    // Reset height to get correct scrollHeight
    chatInput.style.height = "auto";
    chatInput.style.height = `${Math.min(chatInput.scrollHeight, 180)}px`;
}

// ============================================================
// Scroll to Bottom
// ============================================================
function scrollToBottom() {
    const messagesArea = $("#messages-area");
    if (messagesArea) {
        setTimeout(() => {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }, 50);
    }
}

// ============================================================
// Show Welcome Message
// ============================================================
function showWelcomeMessage() {
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

// ============================================================
// Add to History
// ============================================================
function addToHistory(query) {
    const newEntry = {
        id: `conv-${Date.now()}`,
        title: query.length > 30 ? `${query.substring(0, 30)}...` : query,
        timestamp: new Date().toISOString(),
        messages: [...currentMessages]
    };

    // Add to beginning of history
    chatHistory.unshift(newEntry);

    // Limit history size
    if (chatHistory.length > CONFIG.limits.maxHistoryItems) {
        chatHistory.pop();
    }

    currentConversationId = newEntry.id;
    saveHistory();
    updateSidebarHistory();
}

// ============================================================
// Update Current Conversation
// ============================================================
function updateCurrentConversation(response) {
    if (!currentConversationId) return;

    const conversation = chatHistory.find(c => c.id === currentConversationId);
    if (conversation) {
        conversation.messages = [...currentMessages];
        // Set initial truncated title
        conversation.title = response.length > 30 ? `${response.substring(0, 30)}...` : response;
        saveHistory();
        updateSidebarHistory();

        // Generate AI title in background
        generateAITitleForConversation(conversation);
    }
}

// ============================================================
// Generate AI Title for Conversation
// ============================================================
async function generateAITitleForConversation(conversation) {
    try {
        // Find first user message and first assistant response
        const firstUserMsg = conversation.messages.find(m => m.role === "user");
        const firstAssistantMsg = conversation.messages.find(m => m.role === "assistant");

        if (!firstUserMsg || !firstAssistantMsg) return;

        const userContent = firstUserMsg.content || "";
        const assistantContent = firstAssistantMsg.content.substring(0, 200) || "";

        // Create prompt for title generation
        const titlePrompt = `Summarize the following conversation opening as a short title of 4–6 words.
Return ONLY the title, no quotes, no punctuation at the end.

User: ${userContent}
Assistant: ${assistantContent}`;

        // Use timeout to prevent blocking
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 4000)
        );

        // Use fast/cheap model for title generation
        // Note: We can't pass model directly to streamChat, so we'll use the default model
        // In a production environment, we might want to add model parameter support
        const resultPromise = new Promise((resolve) => {
            streamChat(
                [
                    {
                        role: "system",
                        content: "You are a conversation title generator. Return only the title."
                    },
                    {
                        role: "user",
                        content: titlePrompt
                    }
                ],
                () => {}, // onToken - ignore streaming
                (finalContent) => {
                    resolve(finalContent.trim());
                },
                (error) => {
                    resolve(null); // On error, keep fallback title
                },
                null // No signal for background task
            );
        });

        // Race between result and timeout
        const aiTitle = await Promise.race([resultPromise, timeoutPromise]);

        if (aiTitle && typeof aiTitle === "string" && aiTitle.length > 0) {
            // Capitalize first letter of each word
            const formattedTitle = aiTitle
                .trim()
                .split(/\s+/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
                .replace(/\.$/, ''); // Remove trailing period if any

            if (formattedTitle.length > 0 && formattedTitle.split(' ').length <= 6) {
                conversation.title = formattedTitle;
                saveHistory();
                updateSidebarHistory();
            }
        }
    } catch (error) {
        // Silently fail - keep the truncated fallback title
        console.log("AI title generation failed, using fallback:", error.message);
    }
}

// ============================================================
// Update Sidebar History
// ============================================================
function updateSidebarHistory() {
    const sidebarHistory = $("#sidebar-history");
    if (!sidebarHistory) return;

    sidebarHistory.innerHTML = chatHistory.map((conv, index) => `
        <div class="sidebar-history-item ${index === 0 ? 'active' : ''}"
             data-conv-id="${conv.id}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
            <span>${conv.title}</span>
        </div>
    `).join("");

    // Add click handlers
    $$(".sidebar-history-item").forEach(item => {
        item.addEventListener("click", () => {
            const convId = item.dataset.convId;
            loadConversation(convId);
        });
    });
}

// ============================================================
// Load Conversation
// ============================================================
function loadConversation(convId) {
    const conversation = chatHistory.find(c => c.id === convId);
    if (!conversation) return;

    currentMessages = [...conversation.messages];
    currentConversationId = convId;

    // Update UI
    renderMessages();
    updateSidebarHistory();
    saveCurrentMessages();

    // Close sidebar on mobile
    const sidebar = $("#sidebar");
    const sidebarOverlay = $("#sidebar-overlay");
    if (sidebar && sidebarOverlay) {
        sidebar.classList.remove("open");
        sidebarOverlay.classList.remove("active");
    }
}

// ============================================================
// Render All Messages
// ============================================================
function renderMessages() {
    const messagesList = $("#messages-list");
    if (!messagesList) return;

    if (currentMessages.length === 0) {
        showWelcomeMessage();
        return;
    }

    messagesList.innerHTML = currentMessages.map(msg => `
        <div class="message ${msg.role}">
            <div class="message-avatar">${msg.role === "user" ? "You" : "AI"}</div>
            <div class="message-content">
                ${msg.isError ? `<div class="message-text error">${msg.content}</div>` : `<div class="message-text">${msg.content}</div>`}
            </div>
        </div>
    `).join("");

    // Auto-scroll to bottom
    scrollToBottom();
}

// ============================================================
// Load History from Storage
// ============================================================
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

// ============================================================
// Save History to Storage
// ============================================================
function saveHistory() {
    try {
        setStorage(HISTORY_KEY, chatHistory);
    } catch (error) {
        console.error("Error saving history:", error);
    }
}

// ============================================================
// Save Current Messages
// ============================================================
function saveCurrentMessages() {
    try {
        setStorage(MESSAGES_KEY, currentMessages);
    } catch (error) {
        console.error("Error saving current messages:", error);
    }
}

// ============================================================
// Clear Chat
// ============================================================
export function clearChat() {
    try {
        // Clear DOM elements if they exist
        const chatMessages = document.getElementById("messages-list");
        if (chatMessages) chatMessages.innerHTML = "";

        // Reset state
        currentMessages = [];
        currentConversationId = null;

        // Clear storage
        try {
            localStorage.removeItem(MESSAGES_KEY);
        } catch (error) {
            console.warn("Failed to clear messages storage:", error);
        }

        // Show welcome message
        showWelcomeMessage();

        console.log("Chat cleared successfully");
    } catch (error) {
        console.error("Error during clearChat():", error);
    }
}

// ============================================================
// Toggle Sidebar
// ============================================================
export function toggleSidebar() {
    const sidebar = $("#sidebar");
    const sidebarOverlay = $("#sidebar-overlay");

    if (sidebar && sidebarOverlay) {
        sidebar.classList.toggle("open");
        sidebarOverlay.classList.toggle("active");
    }
}

// ============================================================
// Export for Global Access
// ============================================================
window.ArysAIChat = {
    initChat,
    clearChat,
    toggleSidebar,
    sendMessage: handleSendMessage,
    getCurrentMessages: () => [...currentMessages],
    getChatHistory: () => [...chatHistory]
};

// Initialize when DOM is ready
if (document.readyState !== "loading") {
    initChat();
} else {
    document.addEventListener("DOMContentLoaded", initChat);
}