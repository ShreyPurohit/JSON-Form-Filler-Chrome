// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('Extension installed');
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FILL_FORM') {
        chrome.tabs.query({ active: true, currentWindow: true }, async ([tab]) => {
            if (!tab || !tab.id) {
                sendResponse({ success: false, error: 'No active tab found' });
                return;
            }

            try {
                // Forward the message to content script
                chrome.tabs.sendMessage(tab.id, message, (response) => {
                    if (chrome.runtime.lastError) {
                        // If content script is not loaded, inject it and retry
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            files: ['content.js']
                        }).then(() => {
                            // Retry sending message after injection
                            chrome.tabs.sendMessage(tab.id, message, (retryResponse) => {
                                sendResponse(retryResponse || { success: false, error: 'Failed to fill form' });
                            });
                        }).catch((error) => {
                            sendResponse({ success: false, error: error.message });
                        });
                    } else {
                        sendResponse(response);
                    }
                });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        });

        return true; // Keep the message channel open
    }
});