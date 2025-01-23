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