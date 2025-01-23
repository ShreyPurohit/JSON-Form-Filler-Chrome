// Constants
const SCRIPT_PATH = 'content.js';
const ERROR_MESSAGES = {
    NO_TAB: 'No active tab found',
    PROCESS_FAILED: 'Failed to process form'
};

// Helper function to get active tab
const getActiveTab = () =>
    chrome.tabs.query({ active: true, currentWindow: true })
        .then(([tab]) => {
            if (!tab?.id) throw new Error(ERROR_MESSAGES.NO_TAB);
            return tab;
        });

// Helper function to inject and retry
const injectAndRetry = async (tabId, message) => {
    await chrome.scripting.executeScript({
        target: { tabId },
        files: [SCRIPT_PATH]
    });

    return chrome.tabs.sendMessage(tabId, message)
        .catch(() => ({ success: false, error: ERROR_MESSAGES.PROCESS_FAILED }));
};

// Handle message sending to content script
const handleContentMessage = async (tabId, message) => {
    try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        return response;
    } catch (error) {
        // If content script isn't loaded, inject it and retry
        if (chrome.runtime.lastError) {
            return injectAndRetry(tabId, message);
        }
        throw error;
    }
};

// Installation listener
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FILL_FORM' || message.type === 'EXTRACT_FORM') {
        // Handle the message asynchronously
        getActiveTab()
            .then(tab => handleContentMessage(tab.id, message))
            .then(sendResponse)
            .catch(error => sendResponse({
                success: false,
                error: error.message
            }));

        return true; // Keep message channel open for async response
    }
});