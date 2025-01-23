// Observer for dynamic elements
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes.length) {
            fillFormFields(window.formData || {});
        }
    });
});

// Start observing
observer.observe(document.body, {
    childList: true,
    subtree: true
});

// Fill form fields
function fillFormFields(data) {
    console.log('Filling form with data:', data);

    window.formData = data; // Store data for dynamic fields
    let filledCount = 0;

    Object.entries(data).forEach(([dataQa, value]) => {
        const element = document.querySelector(`[data-qa="${dataQa}"]`);

        if (element) {
            // Handle different input types
            if (element.tagName === 'SELECT') {
                element.value = value;
            } else if (element.tagName === 'INPUT') {
                switch (element.type.toLowerCase()) {
                    case 'checkbox':
                        element.checked = value === true || value === 'true';
                        break;
                    case 'radio':
                        const radio = document.querySelector(`[data-qa="${dataQa}"][value="${value}"]`);
                        if (radio) radio.checked = true;
                        break;
                    default:
                        element.value = value;
                }
            } else {
                element.value = value;
            }

            // Trigger change events
            ['change', 'input'].forEach(eventType => {
                element.dispatchEvent(new Event(eventType, { bubbles: true }));
            });

            filledCount++;
        }
    });

    return filledCount;
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Content script received message:', message);

    if (message.type === 'FILL_FORM') {
        try {
            const filledCount = fillFormFields(message.data);
            sendResponse({
                success: true,
                message: `Filled ${filledCount} fields successfully`
            });
        } catch (error) {
            console.error('Error filling form:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    return true; // Keep the message channel open
});