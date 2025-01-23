// Utility functions for path operations
const pathUtils = {
    split: path => path.split('|'),
    get: (obj, path) => pathUtils.split(path).reduce((curr, key) =>
        curr && curr[key] !== undefined ? curr[key] : undefined, obj),
    set: (obj, path, value) => {
        const keys = pathUtils.split(path);
        const lastKey = keys.pop();
        const target = keys.reduce((curr, key) => (curr[key] = curr[key] || {}, curr[key]), obj);
        target[lastKey] = value;
    }
};

// Form element handlers
const elementHandlers = {
    SELECT: (element, value) => element.value = value,
    INPUT: {
        checkbox: (element, value) => element.checked = value === true || value === 'true',
        radio: (element, value) => element.value === value && (element.checked = true),
        date: (element, value) => {
            if (value) {
                const date = new Date(value);
                !isNaN(date) && (element.value = date.toISOString().split('T')[0]);
            }
        },
        default: (element, value) => element.value = value
    }
};

// Trigger form events
const triggerEvents = element =>
    ['change', 'input'].forEach(type =>
        element.dispatchEvent(new Event(type, { bubbles: true })));

// Fill form fields
function fillFormFields(data) {
    window.formData = data;
    let filledCount = 0;

    document.querySelectorAll('[data-qa]').forEach(element => {
        const value = pathUtils.get(data, element.getAttribute('data-qa'));

        if (value !== undefined) {
            const handler = elementHandlers[element.tagName] || elementHandlers.INPUT.default;

            if (element.tagName === 'INPUT') {
                (elementHandlers.INPUT[element.type.toLowerCase()] || elementHandlers.INPUT.default)(element, value);
            } else {
                handler(element, value);
            }

            triggerEvents(element);
            filledCount++;
        }
    });

    return filledCount;
}

// Extract form data
function extractFormData() {
    const formData = {};

    document.querySelectorAll('[data-qa]').forEach(element => {
        const dataQa = element.getAttribute('data-qa');
        if (!dataQa) return;

        let value;
        const type = element.type?.toLowerCase();

        if (element.tagName === 'SELECT') {
            value = element.value;
        } else if (element.tagName === 'INPUT') {
            if (type === 'checkbox') {
                value = element.checked;
            } else if (type === 'radio' && !element.checked) {
                return;
            } else if (type === 'date' && element.value) {
                try {
                    value = new Date(element.value).toISOString();
                } catch (e) {
                    console.error(`Date conversion error for ${dataQa}:`, e);
                }
            } else {
                value = element.value;
            }
        } else {
            value = element.value;
        }

        value !== undefined && pathUtils.set(formData, dataQa, value);
    });

    return formData;
}

// Initialize observer for dynamic content
const observer = new MutationObserver(mutations => {
    mutations.some(mutation => mutation.addedNodes.length) &&
        window.formData && fillFormFields(window.formData);
});

observer.observe(document.body, { childList: true, subtree: true });

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        const handlers = {
            FILL_FORM: () => ({
                success: true,
                message: `Filled ${fillFormFields(message.data)} fields successfully`
            }),
            EXTRACT_FORM: () => ({
                success: true,
                data: extractFormData()
            })
        };

        sendResponse(handlers[message.type]?.() || { success: false, error: 'Invalid message type' });
    } catch (error) {
        console.error(`Error handling ${message.type}:`, error);
        sendResponse({ success: false, error: error.message });
    }

    return true;
});