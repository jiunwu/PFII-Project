// options.js - Script for the extension options page

document.addEventListener('DOMContentLoaded', function() {
  // Load saved preferences
  loadSavedPreferences();
  
  // Add event listener for save button
  const saveBtn = document.getElementById('saveButton');
  if (saveBtn) saveBtn.addEventListener('click', savePreferences);

  // Load saved Gemini API key
  chrome.storage.sync.get(['geminiApiKey'], function(result) {
    if (result.geminiApiKey) {
      const apiKeyInput = document.getElementById('geminiApiKey');
      if (apiKeyInput) apiKeyInput.value = result.geminiApiKey;
    }
  });

  // Add event listener for API key save button
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', function() {
      const apiKeyInput = document.getElementById('geminiApiKey');
      if (!apiKeyInput) return;
      const apiKey = apiKeyInput.value;
      chrome.storage.sync.set({ geminiApiKey: apiKey }, function() {
        const status = document.getElementById('status');
        if (status) {
          status.textContent = 'API key saved!';
          setTimeout(() => status.textContent = '', 2000);
        }
      });
    });
  }
});

/**
 * Load saved preferences from storage and populate form fields
 */
function loadSavedPreferences() {
  chrome.storage.sync.get('preferences', function(data) {
    if (data.preferences) {
      const preferences = data.preferences;
      
      // Set general settings
      document.getElementById('electricityRate').value = preferences.electricityRate;
      document.getElementById('discountRate').value = preferences.discountRate * 100; // Convert to percentage
      
      // Set appliance lifespans
      document.getElementById('refrigeratorLifespan').value = preferences.applianceLifespans.refrigerator;
      document.getElementById('washingMachineLifespan').value = preferences.applianceLifespans.washingMachine;
      document.getElementById('dishwasherLifespan').value = preferences.applianceLifespans.dishwasher;
      document.getElementById('dryerLifespan').value = preferences.applianceLifespans.dryer;
    }
  });
}

/**
 * Save preferences to storage
 */
function savePreferences() {
  // Get values from form fields
  const electricityRate = parseFloat(document.getElementById('electricityRate').value);
  const discountRate = parseFloat(document.getElementById('discountRate').value) / 100; // Convert from percentage
  
  // Validate inputs
  if (isNaN(electricityRate) || electricityRate <= 0) {
    showStatusMessage('Please enter a valid electricity rate', 'error');
    return;
  }
  
  if (isNaN(discountRate) || discountRate < 0 || discountRate > 0.2) {
    showStatusMessage('Please enter a valid discount rate (0-20%)', 'error');
    return;
  }
  
  // Create preferences object
  const preferences = {
    electricityRate: electricityRate,
    discountRate: discountRate,
    applianceLifespans: {
      refrigerator: getValidatedNumberInput('refrigeratorLifespan', 1, 20, 10),
      washingMachine: getValidatedNumberInput('washingMachineLifespan', 1, 20, 8),
      dishwasher: getValidatedNumberInput('dishwasherLifespan', 1, 20, 9),
      dryer: getValidatedNumberInput('dryerLifespan', 1, 20, 8)
    }
  };
  
  // Save to storage
  chrome.storage.sync.set({ preferences: preferences }, function() {
    showStatusMessage('Settings saved successfully!', 'success');
    
    // Notify content scripts that preferences have changed
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        safeSendMessage({type: 'PREFERENCES_UPDATED'}, null);
      }
    });
  });
}

/**
 * Get a validated number input value
 * @param {string} elementId - ID of the input element
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @param {number} defaultValue - Default value if input is invalid
 * @returns {number} Validated input value
 */
function getValidatedNumberInput(elementId, min, max, defaultValue) {
  const value = parseFloat(document.getElementById(elementId).value);
  
  if (isNaN(value) || value < min || value > max) {
    return defaultValue;
  }
  
  return value;
}

/**
 * Show a status message to the user
 * @param {string} message - Message to display
 * @param {string} type - Message type ('success' or 'error')
 */
function showStatusMessage(message, type) {
  const statusElement = document.getElementById('statusMessage');
  
  statusElement.textContent = message;
  statusElement.className = 'status-message ' + type;
  statusElement.style.display = 'block';
  
  // Hide message after 3 seconds
  setTimeout(function() {
    statusElement.style.display = 'none';
  }, 3000);
}

/**
 * Safely send a message using chrome.runtime.sendMessage
 * @param {Object} message - Message to send
 * @param {Function} callback - Callback function to handle the response
 */
function safeSendMessage(message, callback) {
  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[LTC DEBUG] sendMessage error:', chrome.runtime.lastError.message);
        if (callback) callback(null);
        return;
      }
      if (callback) callback(response);
    });
  } catch (e) {
    console.warn('[LTC DEBUG] sendMessage exception:', e);
    if (callback) callback(null);
  }
}
