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
                    case 'date':
                        if (value) {
                            const date = new Date(value);
                            if (!isNaN(date)) {
                                element.value = date.toISOString().split('T')[0];
                            }
                        }
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

// Extract form data
function extractFormData() {
    const formData = {};
    const elements = document.querySelectorAll('[data-qa]');

    elements.forEach(element => {
        const dataQa = element.getAttribute('data-qa');
        if (!dataQa) return;

        let value;
        if (element.tagName === 'SELECT') {
            value = element.value;
        } else if (element.tagName === 'INPUT') {
            switch (element.type.toLowerCase()) {
                case 'checkbox':
                    value = element.checked;
                    break;
                case 'radio':
                    if (element.checked) {
                        value = element.value;
                    }
                    break;
                case 'date':
                    value = element.value;
                    if (value) {
                        try {
                            value = new Date(value).toISOString();
                        } catch (e) {
                            console.error(`Error converting date value for ${dataQa}:`, e);
                        }
                    }
                    break;
                default:
                    value = element.value;
            }
        } else {
            value = element.value;
        }

        // Only add to formData if value is not undefined (handles unchecked radio buttons)
        if (value !== undefined) {
            formData[dataQa] = value;
        }
    });

    return formData;
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
    } else if (message.type === 'EXTRACT_FORM') {
        try {
            const formData = extractFormData();
            sendResponse({
                success: true,
                data: formData
            });
        } catch (error) {
            console.error('Error extracting form data:', error);
            sendResponse({
                success: false,
                error: error.message
            });
        }
    }

    return true; // Keep the message channel open
});