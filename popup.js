// Constants
const TIMEOUT_DURATION = 5000;
const FEEDBACK_DURATION = 2000;
const ERROR_MESSAGES = {
    INVALID_JSON: 'Invalid JSON file',
    READ_ERROR: 'Error reading file',
    TIMEOUT: 'Operation timed out',
    FILL_FAILED: 'Failed to fill form',
    EXTRACT_FAILED: 'Failed to extract form data'
};

// DOM Elements
const elements = {
    jsonFile: document.getElementById('jsonFile'),
    fileName: document.getElementById('fileName'),
    fillForm: document.getElementById('fillForm'),
    extractForm: document.getElementById('extractForm'),
    downloadLink: document.getElementById('downloadLink')
};

// State management
let jsonData = null;

// UI Utilities
const ui = {
    setButtonState: (button, isLoading) => {
        button.disabled = isLoading;
        button.textContent = isLoading ?
            `${button.textContent}...` :
            button.textContent.replace('...', '');
    },

    showFeedback: (element, message, duration = 0) => {
        element.textContent = message;
        if (duration) {
            setTimeout(() => {
                element.textContent = jsonData ? `Selected: ${elements.jsonFile.files[0].name}` : '';
            }, duration);
        }
    },

    createDownloadUrl: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        return URL.createObjectURL(blob);
    }
};

// Operation handlers
const handlers = {
    async handleFileSelect(event) {
        const file = event.target.files[0];

        if (!file) {
            jsonData = null;
            elements.fillForm.disabled = true;
            ui.showFeedback(elements.fileName, '');
            return;
        }

        ui.showFeedback(elements.fileName, `Selected: ${file.name}`);

        try {
            const text = await file.text();
            jsonData = JSON.parse(text);
            elements.fillForm.disabled = false;
        } catch (error) {
            console.error('File processing error:', error);
            jsonData = null;
            elements.fillForm.disabled = true;
            ui.showFeedback(elements.fileName, `Error: ${error instanceof SyntaxError ? ERROR_MESSAGES.INVALID_JSON : ERROR_MESSAGES.READ_ERROR}`);
        }
    },

    async handleFormOperation(type, button, data = null) {
        ui.setButtonState(button, true);

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(ERROR_MESSAGES.TIMEOUT)), TIMEOUT_DURATION));

        try {
            const response = await Promise.race([
                new Promise((resolve) => chrome.runtime.sendMessage({ type, data }, resolve)),
                timeoutPromise
            ]);

            if (response?.success) {
                if (type === 'EXTRACT_FORM') {
                    const url = ui.createDownloadUrl(response.data);
                    elements.downloadLink.href = url;
                    elements.downloadLink.click();
                    URL.revokeObjectURL(url);
                }
                ui.showFeedback(elements.fileName, `${type === 'FILL_FORM' ? 'Form filled' : 'Form data extracted'} successfully!`, FEEDBACK_DURATION);
            } else {
                throw new Error(response?.error || (type === 'FILL_FORM' ? ERROR_MESSAGES.FILL_FAILED : ERROR_MESSAGES.EXTRACT_FAILED));
            }
        } catch (error) {
            ui.showFeedback(elements.fileName, `Error: ${error.message}`);
        } finally {
            ui.setButtonState(button, false);
        }
    }
};

// Event Listeners
elements.jsonFile.addEventListener('change', handlers.handleFileSelect);

elements.fillForm.addEventListener('click', () => {
    if (jsonData) {
        handlers.handleFormOperation('FILL_FORM', elements.fillForm, jsonData);
    }
});

elements.extractForm.addEventListener('click', () => {
    handlers.handleFormOperation('EXTRACT_FORM', elements.extractForm);
});