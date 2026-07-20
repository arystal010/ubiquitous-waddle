/**
 * Arys AI Frontend - Main Application Entry Point
 * Minimal frontend implementation for standalone use
 */

import { streamChat } from './api.js';
import { DEFAULT_SYSTEM_PROMPT } from './config.js';

// DOM Selectors
const SELECTORS = {
    chatContainer: '#chat-container',
    messageInput: '#message-input',
    sendButton: '#send-button',
    stopButton: '#stop-button',
    newChatButton: '#new-chat-button',
    messagesContainer: '#messages-container'
};

// Application state
let messages = [];
let isStreaming = false;
let abortController = null;

// Initialize the application
function init() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupEventListeners);
    } else {
        setupEventListeners();
    }
}

// Set up event listeners
function setupEventListeners() {
    const sendButton = document.querySelector(SELECTORS.sendButton);
    const stopButton = document.querySelector(SELECTORS.stopButton);
    const newChatButton = document.querySelector(SELECTORS.newChatButton);
    const messageInput = document.querySelector(SELECTORS.messageInput);

    if (sendButton) {
        sendButton.addEventListener('click', handleSendMessage);
    }

    if (stopButton) {
        stopButton.addEventListener('click', handleStopGeneration);
        stopButton.style.display = 'none'; // Initially hidden
    }

    if (newChatButton) {
        newChatButton.addEventListener('click', clearChat);
    }

    if (messageInput) {
        messageInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    console.log('Arys AI Frontend initialized');
}

// Handle sending a message
function handleSendMessage() {
    const messageInput = document.querySelector(SELECTORS.messageInput);
    const messagesContainer = document.querySelector(SELECTORS.messagesContainer);

    if (!messageInput || !messagesContainer) return;
    if (isStreaming) return;

    const userMessage = messageInput.value.trim();
    if (!userMessage) return;

    // Add user message to UI
    addMessageToUI('user', userMessage);
    messageInput.value = '';
    messageInput.focus();

    // Add to messages array
    messages.push({ role: 'user', content: userMessage });

    // Show stop button, hide send button
    const sendButton = document.querySelector(SELECTORS.sendButton);
    const stopButton = document.querySelector(SELECTORS.stopButton);

    if (sendButton) sendButton.style.display = 'none';
    if (stopButton) stopButton.style.display = 'inline-block';

    isStreaming = true;

    // Prepare messages with system prompt
    const chatMessages = [
        { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
        ...messages
    ];

    // Start streaming
    abortController = new AbortController();

    streamChat(chatMessages,
        (token, fullContent) => {
            // Update the assistant's message in real-time
            updateAssistantMessage(fullContent);
        },
        (fullContent) => {
            // Streaming complete
            completeAssistantMessage(fullContent);
            isStreaming = false;

            // Show send button, hide stop button
            if (sendButton) sendButton.style.display = 'inline-block';
            if (stopButton) stopButton.style.display = 'none';
        },
        (error) => {
            // Handle error
            handleStreamError(error);
            isStreaming = false;

            // Show send button, hide stop button
            if (sendButton) sendButton.style.display = 'inline-block';
            if (stopButton) stopButton.style.display = 'none';
        }
    );
}

// Handle stop generation
function handleStopGeneration() {
    if (abortController) {
        abortController.abort();
        isStreaming = false;

        const sendButton = document.querySelector(SELECTORS.sendButton);
        const stopButton = document.querySelector(SELECTORS.stopButton);

        if (sendButton) sendButton.style.display = 'inline-block';
        if (stopButton) stopButton.style.display = 'none';
    }
}

// Add message to UI
function addMessageToUI(role, content) {
    const messagesContainer = document.querySelector(SELECTORS.messagesContainer);
    if (!messagesContainer) return;

    const messageElement = document.createElement('div');
    messageElement.className = `message ${role}-message`;
    messageElement.innerHTML = `
        <div class="message-content">
            ${escapeHtml(content)}
        </div>
    `;

    messagesContainer.appendChild(messageElement);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Update assistant message in real-time
function updateAssistantMessage(content) {
    const messagesContainer = document.querySelector(SELECTORS.messagesContainer);
    if (!messagesContainer) return;

    let assistantMessage = messagesContainer.querySelector('.assistant-message');
    if (!assistantMessage) {
        // Create new assistant message if it doesn't exist
        assistantMessage = document.createElement('div');
        assistantMessage.className = 'message assistant-message';
        assistantMessage.innerHTML = `<div class="message-content"></div>`;
        messagesContainer.appendChild(assistantMessage);
    }

    const contentElement = assistantMessage.querySelector('.message-content');
    if (contentElement) {
        contentElement.textContent = escapeHtml(content);
    }

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Complete assistant message
function completeAssistantMessage(fullContent) {
    // Add assistant message to messages array
    messages.push({ role: 'assistant', content: fullContent });

    const messagesContainer = document.querySelector(SELECTORS.messagesContainer);
    if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
}

// Handle stream error
function handleStreamError(error) {
    console.error('Stream error:', error);

    const messagesContainer = document.querySelector(SELECTORS.messagesContainer);
    if (!messagesContainer) return;

    const errorMessage = document.createElement('div');
    errorMessage.className = 'message error-message';
    errorMessage.innerHTML = `
        <div class="message-content">
            Error: ${escapeHtml(error.message)}
        </div>
    `;

    messagesContainer.appendChild(errorMessage);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Clear chat
function clearChat() {
    messages = [];
    const messagesContainer = document.querySelector(SELECTORS.messagesContainer);
    if (messagesContainer) {
        messagesContainer.innerHTML = '';
    }

    const messageInput = document.querySelector(SELECTORS.messageInput);
    if (messageInput) {
        messageInput.value = '';
        messageInput.focus();
    }
}

// Simple HTML escaping
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Export public API
window.ArysAI = {
    sendMessage: handleSendMessage,
    stopGeneration: handleStopGeneration,
    clearChat: clearChat,
    getMessages: () => messages,
    init: init
};

// Auto-initialize
init();