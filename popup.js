let jsonData = null;

document.getElementById('jsonFile').addEventListener('change', (event) => {
    const file = event.target.files[0];
    const fileNameElement = document.getElementById('fileName');
    const fillButton = document.getElementById('fillForm');

    if (file) {
        fileNameElement.textContent = `Selected: ${file.name}`;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                jsonData = JSON.parse(e.target.result);
                console.log('Parsed JSON data:', jsonData);
                fillButton.disabled = false;
            } catch (error) {
                fileNameElement.textContent = 'Error: Invalid JSON file';
                console.error('JSON parse error:', error);
                fillButton.disabled = true;
                jsonData = null;
            }
        };
        reader.onerror = () => {
            fileNameElement.textContent = 'Error reading file';
            console.error('File read error');
            fillButton.disabled = true;
            jsonData = null;
        };
        reader.readAsText(file);
    } else {
        fileNameElement.textContent = '';
        fillButton.disabled = true;
        jsonData = null;
    }
});

document.getElementById('fillForm').addEventListener('click', () => {
    if (!jsonData) return;

    const fillButton = document.getElementById('fillForm');
    const fileNameElement = document.getElementById('fileName');

    fillButton.disabled = true;
    fillButton.textContent = 'Filling...';

    // Set a timeout to reset button state if no response
    const timeout = setTimeout(() => {
        fillButton.disabled = false;
        fillButton.textContent = 'Fill Form';
        fileNameElement.textContent = 'Error: Operation timed out';
    }, 5000);

    chrome.runtime.sendMessage({
        type: 'FILL_FORM',
        data: jsonData
    }, (response) => {
        clearTimeout(timeout);
        fillButton.disabled = false;
        fillButton.textContent = 'Fill Form';

        if (response && response.success) {
            fileNameElement.textContent = 'Form filled successfully!';
            setTimeout(() => {
                fileNameElement.textContent = `Selected: ${document.getElementById('jsonFile').files[0].name}`;
            }, 2000);
        } else {
            fileNameElement.textContent = `Error: ${response?.error || 'Failed to fill form'}`;
        }
    });
});

document.getElementById('extractForm').addEventListener('click', () => {
    const extractButton = document.getElementById('extractForm');
    const fileNameElement = document.getElementById('fileName');
    const downloadLink = document.getElementById('downloadLink');

    extractButton.disabled = true;
    extractButton.textContent = 'Extracting...';

    // Set a timeout to reset button state if no response
    const timeout = setTimeout(() => {
        extractButton.disabled = false;
        extractButton.textContent = 'Extract Form Data';
        fileNameElement.textContent = 'Error: Operation timed out';
    }, 5000);

    chrome.runtime.sendMessage({
        type: 'EXTRACT_FORM'
    }, (response) => {
        clearTimeout(timeout);
        extractButton.disabled = false;
        extractButton.textContent = 'Extract Form Data';

        if (response && response.success) {
            const jsonString = JSON.stringify(response.data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            downloadLink.href = url;
            downloadLink.click();
            URL.revokeObjectURL(url);

            fileNameElement.textContent = 'Form data extracted successfully!';
            setTimeout(() => {
                fileNameElement.textContent = '';
            }, 2000);
        } else {
            fileNameElement.textContent = `Error: ${response?.error || 'Failed to extract form data'}`;
        }
    });
});