// Utility functions for direct key-value operations
const pathUtils = {
    get: (obj, path) => obj[path],
    set: (obj, path, value) => {
        obj[path] = value;
        return true;
    },
    validate: (data) => {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid data structure');
        }
        const paths = document.querySelectorAll('[data-qa]');
        const unmapped = [];
        paths.forEach(el => {
            const path = el.getAttribute('data-qa');
            if (data[path] === undefined) {
                unmapped.push(path);
            }
        });
        return { valid: unmapped.length === 0, unmapped };
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

// Form utilities for caching and performance
const formUtils = {
    _elements: null,
    getFormElements: () => {
        if (!formUtils._elements) {
            formUtils._elements = Array.from(document.querySelectorAll('[data-qa]'));
        }
        return formUtils._elements;
    },
    resetCache: () => {
        formUtils._elements = null;
    }
};

// Trigger form events
const triggerEvents = element =>
    ['change', 'input'].forEach(type =>
        element.dispatchEvent(new Event(type, { bubbles: true })));

// Fill form fields with enhanced error handling and reporting
function fillFormFields(data) {
    window.formData = data;
    const results = {
        filled: 0,
        skipped: [],
        errors: []
    };

    formUtils.getFormElements().forEach(element => {
        try {
            const dataQa = element.getAttribute('data-qa');
            const value = pathUtils.get(data, dataQa);

            if (value !== undefined) {
                const handler = elementHandlers[element.tagName] || elementHandlers.INPUT.default;

                if (element.tagName === 'INPUT') {
                    (elementHandlers.INPUT[element.type.toLowerCase()] || elementHandlers.INPUT.default)(element, value);
                } else {
                    handler(element, value);
                }

                triggerEvents(element);
                results.filled++;
            } else {
                results.skipped.push(dataQa);
            }
        } catch (error) {
            results.errors.push({
                field: element.getAttribute('data-qa'),
                error: error.message
            });
        }
    });

    // Log skipped fields
    if (results.skipped.length > 0) {
        console.group('Skipped Fields (not found in JSON):');
        results.skipped.forEach(field => console.log(`- ${field}`));
        console.groupEnd();
    }

    return results;
}

// Extract form data with enhanced error handling
function extractFormData() {
    const formData = {};
    const results = {
        extracted: 0,
        skipped: [],
        errors: []
    };

    formUtils.getFormElements().forEach(element => {
        try {
            const dataQa = element.getAttribute('data-qa');
            if (!dataQa) {
                results.skipped.push('Unknown field (no data-qa)');
                return;
            }

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
                        throw new Error(`Invalid date format: ${element.value}`);
                    }
                } else {
                    value = element.value;
                }
            } else {
                value = element.value;
            }

            if (value !== undefined) {
                pathUtils.set(formData, dataQa, value);
                results.extracted++;
            } else {
                results.skipped.push(dataQa);
            }
        } catch (error) {
            results.errors.push({
                field: element.getAttribute('data-qa'),
                error: error.message
            });
        }
    });

    // Log skipped fields
    if (results.skipped.length > 0) {
        console.group('Skipped Fields during extraction:');
        results.skipped.forEach(field => console.log(`- ${field}`));
        console.groupEnd();
    }

    return { data: formData, results };
}

// Initialize observer for dynamic content
const observer = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.addedNodes.length)) {
        formUtils.resetCache();
        window.formData && fillFormFields(window.formData);
    }
});

observer.observe(document.body, { childList: true, subtree: true });

// Message handler with enhanced error handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
        const handlers = {
            FILL_FORM: () => {
                const results = fillFormFields(message.data);
                return {
                    success: true,
                    message: `Filled ${results.filled} fields successfully, skipped ${results.skipped.length} fields`,
                    results
                };
            },
            EXTRACT_FORM: () => {
                const { data, results } = extractFormData();
                return {
                    success: true,
                    data,
                    results,
                    message: `Extracted ${results.extracted} fields, skipped ${results.skipped.length} fields`
                };
            }
        };

        const response = handlers[message.type]?.() || {
            success: false,
            error: 'Invalid message type',
            message: `Unsupported operation: ${message.type}`
        };

        sendResponse(response);
    } catch (error) {
        console.error(`Error handling ${message.type}:`, error);
        sendResponse({
            success: false,
            error: error.message,
            details: {
                type: error.name,
                stack: error.stack
            }
        });
    }

    return true;
});