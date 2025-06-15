// popup.js - Script for the extension popup UI

document.addEventListener('DOMContentLoaded', function () {
  // First check onboarding status and API key
  chrome.runtime.sendMessage({ type: 'GET_ONBOARDING_STATUS' }, (response) => {
    if (!response.hasOnboarded || !response.hasApiKey) {
      displayOnboardingPrompt(response.hasApiKey);
      return;
    }
    
    // User is properly onboarded, show normal functionality
    initializeNormalPopup();
  });
});

function initializeNormalPopup() {
  // Request the latest product and calculation results from background.js
  chrome.runtime.sendMessage({ type: 'GET_LAST_PRODUCT' }, (response) => {
    const productData = response ? response.productData : null;
    const calculationResults = response ? response.calculationResults : null;

    console.log('Popup received data:', { productData, calculationResults });

    displayProductInfo(productData, calculationResults);
    updateStatusIndicator(productData != null);
  });

  // Get user preferences for displaying settings
  chrome.storage.sync.get('preferences', function(data) {
    if (data.preferences) {
      displaySettings(data.preferences);
    }
  });
  
  // Add event listener for settings button only
  document.addEventListener('click', function(event) {
    if (event.target.id === 'settings-button') {
      chrome.runtime.openOptionsPage();
    }
  });
}

function displayOnboardingPrompt(hasApiKey) {
  const container = document.getElementById('ltc-result-container');
  if (!container) return;

  let html = `
    <div style="text-align: center; padding: 20px;">
      <img src="images/icon-128.png" alt="xCost" style="width: 64px; margin-bottom: 15px;" />
      <h2 style="color: #667eea; margin-bottom: 15px; font-size: 1.5em;">Welcome to xCost!</h2>
  `;

  if (!hasApiKey) {
    html += `
      <p style="margin-bottom: 15px; color: #666; line-height: 1.4;">
        To start analyzing product costs, you need to set up your free Gemini API key.
      </p>
      <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 15px; text-align: left;">
        <strong style="color: #856404;">🚀 Quick Setup:</strong>
        <ol style="margin: 10px 0 0 20px; color: #856404;">
          <li>Get a free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color: #667eea;">Google AI Studio</a></li>
          <li>Come back and enter it in settings</li>
          <li>Start analyzing products!</li>
        </ol>
      </div>
      <button id="setup-api-key" class="btn-primary" style="background: #667eea; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 5px;">
        🔧 Complete Setup
      </button>
    `;
  } else {
    html += `
      <p style="margin-bottom: 15px; color: #666; line-height: 1.4;">
        Your API key is set up! Now navigate to product pages on supported sites to see xCost calculations.
      </p>
      <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 8px; padding: 15px; margin-bottom: 15px; text-align: left;">
        <strong style="color: #155724;">✅ Supported Sites:</strong>
        <ul style="margin: 10px 0 0 20px; color: #155724;">
          <li><strong>Saturn.de</strong> - Electronics & appliances</li>
          <li><strong>AutoScout24.ch</strong> - Cars & vehicles</li>
          <li><strong>Zara.com</strong> - Clothing & fashion</li>
        </ul>
      </div>
      <button id="finish-setup" class="btn-primary" style="background: #28a745; color: white; border: none; padding: 12px 24px; border-radius: 8px; cursor: pointer; font-size: 16px; margin: 5px;">
        ✨ Start Using xCost
      </button>
    `;
  }

  html += `
      <br>
      <button id="open-settings" class="btn-secondary" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; font-size: 14px; margin: 5px;">
        ⚙️ Settings
      </button>
    </div>
  `;

  container.innerHTML = html;

  // Add event listeners for onboarding buttons
  const setupButton = document.getElementById('setup-api-key');
  if (setupButton) {
    setupButton.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'OPEN_ONBOARDING' });
      window.close(); // Close popup
    });
  }

  const finishButton = document.getElementById('finish-setup');
  if (finishButton) {
    finishButton.addEventListener('click', () => {
      chrome.storage.sync.set({ hasOnboarded: true }, () => {
        // Reinitialize normal popup
        initializeNormalPopup();
      });
    });
  }

  const settingsButton = document.getElementById('open-settings');
  if (settingsButton) {
    settingsButton.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close(); // Close popup
    });
  }
}

// Listen for messages from the content script and update popup state
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRODUCT_DETECTED') {
    localStorage.setItem('ltc_productData', JSON.stringify(message.productData));
    localStorage.setItem('ltc_calculationResults', JSON.stringify(message.calculationResults));
  }
});

/**
 * Display product information and calculation results in the popup
 * @param {Object} productData - Product data
 * @param {Object} calculationResults - Calculation results
 */
function displayProductInfo(productData, calculationResults) {
  const container = document.getElementById('ltc-result-container');
  if (!container) return;

  console.log('Displaying product info:', { productData, calculationResults });

  // Helper to format currency values with appropriate currency symbol
  const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      console.error('Invalid value passed to formatCurrency:', value);
      return '€0,00';
    }
    
    // Check product type for currency formatting
    if (productData && (productData.productType === 'car' || productData.source === 'tutti.ch')) {
      return 'CHF ' + value.toFixed(2).replace('.', ',');
    } else {
      return '€' + value.toFixed(2).replace('.', ',');
    }
  };

  // Check if we have valid product data
  if (!productData || !productData.name) {
    container.innerHTML = `
      <div class="ltc-empty-state">
        <img src="images/icon-128.png" alt="No product" style="width:48px;display:block;margin:20px auto 10px auto;opacity:0.5;" />
        <div style="text-align:center;color:#888;font-size:1.1em;margin-bottom:10px;">No product detected on this page.</div>
        <div style="text-align:center;color:#888;font-size:0.95em;">Navigate to a product page on zara.com, saturn.de, or tutti.ch to see xCost calculations.</div>
      </div>
    `;
    return;
  }

  // Check if we have calculation results
  if (!calculationResults) {
    container.innerHTML = `
      <div style="font-weight:700;font-size:1.1em;color:#0077b6;margin-bottom:8px;">xCost</div>
      <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <b style="flex:1;">${productData.name}</b>
        <span style="font-weight:600;margin-left:10px;">${formatCurrency(productData.price || 0)}</span>
      </div>
      <div style="margin-bottom:8px;color:#666;">Calculating xCosts...</div>
    `;
    return;
  }

  // Determine product type from either source
  const productType = calculationResults.productType || productData.productType;
  const isCar = productType === 'car' || productType === 'Car';
  const isAppliance = ['refrigerator', 'washingMachine', 'dishwasher', 'dryer', 'appliance'].includes(productType);

  let html = `<div style="font-weight:700;font-size:1.1em;color:#0077b6;margin-bottom:12px;">xCost</div>`;

  if (isCar) {
    // Car-specific display
    html += `
      <div class="product-info" style="margin-bottom:12px;">
        <div class="product-name" style="font-weight:bold;font-size:16px;margin-bottom:5px;">${productData.name}</div>
        <div style="color:#666;">${calculationResults.make || ''} ${calculationResults.model || ''}</div>
      </div>
      
      <div class="car-info" style="background-color:#f5f5f5;border-radius:4px;padding:10px;margin-bottom:15px;font-size:14px;">
        <div class="car-detail" style="margin-bottom:5px;"><strong>Year:</strong> ${calculationResults.year || 'N/A'}</div>
        <div class="car-detail" style="margin-bottom:5px;"><strong>Mileage:</strong> ${calculationResults.mileage ? calculationResults.mileage.toLocaleString() + ' km' : 'N/A'}</div>
        <div class="car-detail" style="margin-bottom:5px;"><strong>Fuel:</strong> ${calculationResults.fuelType || 'N/A'}</div>
        <div class="car-detail" style="margin-bottom:5px;"><strong>Consumption:</strong> ${calculationResults.fuelConsumption ? calculationResults.fuelConsumption + ' l/100km' : 'N/A'}</div>
      </div>
      
      ${calculationResults.monthlyCost ? `
        <div class="monthly-cost" style="font-size:16px;font-weight:bold;margin-bottom:10px;color:#4CAF50;">
          Monthly Cost: ${formatCurrency(calculationResults.monthlyCost)}
        </div>
      ` : ''}
      
      <div class="cost-summary" style="background-color:#f9f9f9;border:1px solid #eee;border-radius:4px;padding:12px;margin-bottom:15px;">
        <div class="cost-item" style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Purchase Price:</span>
          <span>${formatCurrency(calculationResults.purchasePrice || productData.price || 0)}</span>
        </div>
        <div class="cost-item" style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Depreciation:</span>
          <span>${formatCurrency(calculationResults.depreciationCost || 0)}</span>
        </div>
        <div class="cost-item" style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Fuel Cost (NPV):</span>
          <span>${formatCurrency(calculationResults.annualFuelCost * (calculationResults.ownershipDuration || 5) || 0)}</span>
        </div>
        <div class="cost-item" style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Insurance (NPV):</span>
          <span>${formatCurrency(calculationResults.annualInsuranceCost * (calculationResults.ownershipDuration || 5) || 0)}</span>
        </div>
        <div class="cost-item" style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Maintenance (NPV):</span>
          <span>${formatCurrency(calculationResults.totalRunningCostsNPV || 0)}</span>
        </div>
        <div class="cost-total" style="display:flex;justify-content:space-between;font-weight:bold;padding-top:8px;border-top:1px solid #ddd;margin-top:8px;">
          <span>Total xCost:</span>
          <span class="highlight" style="color:#4CAF50;">${formatCurrency(calculationResults.totalLifetimeCost || 0)}</span>
        </div>
      </div>
    `;
  } else if (isAppliance) {
    // Appliance-specific display
    html += `
      <div class="product-info" style="margin-bottom:12px;">
        <div class="product-name" style="font-weight:bold;font-size:16px;margin-bottom:5px;">${productData.name}</div>
        <div style="color:#666;">${productType ? productType.charAt(0).toUpperCase() + productType.slice(1) : 'Appliance'}</div>
      </div>
      
      <div class="cost-summary" style="background-color:#f9f9f9;border:1px solid #eee;border-radius:4px;padding:12px;margin-bottom:15px;">
        <div class="cost-item" style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Purchase Price:</span>
          <span>${formatCurrency(calculationResults.purchasePrice || productData.price || 0)}</span>
        </div>
        <div class="cost-item" style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Energy Cost (${calculationResults.lifespan || 'N/A'} years):</span>
          <span>${formatCurrency(calculationResults.energyCostNPV || calculationResults.annualEnergyCost * (calculationResults.lifespan || 1) || 0)}</span>
        </div>
        <div class="cost-item" style="display:flex;justify-content:space-between;margin-bottom:8px;">
          <span>Maintenance Cost:</span>
          <span>${formatCurrency(calculationResults.maintenanceCostNPV || calculationResults.totalMaintenanceCost || 0)}</span>
        </div>
        <div class="cost-total" style="display:flex;justify-content:space-between;font-weight:bold;padding-top:8px;border-top:1px solid #ddd;margin-top:8px;">
          <span>Total xCost:</span>
          <span class="highlight" style="color:#4CAF50;">${formatCurrency(calculationResults.totalLifetimeCost || 0)}</span>
        </div>
      </div>
      
      <div style="font-size:14px;color:#666;margin-bottom:12px;">
        <div><strong>Annual Energy:</strong> ${calculationResults.annualEnergyConsumption || 'N/A'} kWh</div>
        <div><strong>Energy Class:</strong> ${calculationResults.energyEfficiencyClass || 'N/A'}</div>
        <div><strong>Lifespan:</strong> ${calculationResults.lifespan || 'N/A'} years</div>
      </div>
    `;
  } else {
    // Clothing and other products
    html += `
      <div class="product-info" style="margin-bottom:12px;">
        <div class="product-name" style="font-weight:bold;font-size:16px;margin-bottom:5px;">${productData.name}</div>
        <div style="color:#666;">${productType ? productType.charAt(0).toUpperCase() + productType.slice(1) : 'Product'}</div>
      </div>
      
      <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
        <span><strong>Purchase Price:</strong></span>
        <span style="font-weight:600;">${formatCurrency(calculationResults.purchasePrice || productData.price || 0)}</span>
      </div>
      
      ${calculationResults.material ? `<div style="margin-bottom:8px;"><strong>Material:</strong> ${calculationResults.material} (${calculationResults.quality || 'N/A'} quality)</div>` : ''}
      ${calculationResults.lifespan ? `<div style="margin-bottom:8px;"><strong>Estimated Lifespan:</strong> ${calculationResults.lifespan} years</div>` : ''}
      ${calculationResults.annualCost ? `<div style="margin-bottom:8px;"><strong>Annualized Cost:</strong> ${formatCurrency(calculationResults.annualCost)}</div>` : ''}
      ${calculationResults.maintenanceCostPerYear ? `<div style="margin-bottom:8px;"><strong>Maintenance per Year:</strong> ${formatCurrency(calculationResults.maintenanceCostPerYear)}</div>` : ''}
      ${calculationResults.totalMaintenanceCost ? `<div style="margin-bottom:8px;"><strong>Total Maintenance:</strong> ${formatCurrency(calculationResults.totalMaintenanceCost)}</div>` : ''}
      
      <div style="margin-bottom:12px;padding:8px;background:#e3f2fd;border-radius:4px;text-align:center;">
        <strong>Total xCost:</strong> <span style="color:#1976d2;font-weight:700;">${formatCurrency(calculationResults.totalLifetimeCost || 0)}</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

/**
 * Update the status indicator in the popup
 * @param {boolean} isActive - Whether the extension is active on the current page
 */
function updateStatusIndicator(isActive) {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  
  if (isActive) {
    statusDot.className = 'status-dot status-active';
    statusText.textContent = 'Active';
  } else {
    statusDot.className = 'status-dot status-inactive';
    statusText.textContent = 'Inactive';
  }
}

/**
 * Display user settings in the popup
 * @param {Object} preferences - User preferences
 */
function displaySettings(preferences) {
  const settingsContentElement = document.getElementById('settings-content');
  
  if (!settingsContentElement) return;
  
  let html = `
    <div class="settings-item">
      <span>Electricity Rate:</span>
      <span>€${preferences.electricityRate.toFixed(2).replace('.', ',')} / kWh</span>
    </div>
    <div class="settings-item">
      <span>Discount Rate:</span>
      <span>${(preferences.discountRate * 100).toFixed(1)}%</span>
    </div>
  `;
  
  // Add car-specific settings if available
  if (preferences.carOwnershipDuration) {
    html += `
      <div class="settings-item">
        <span>Car Ownership:</span>
        <span>${preferences.carOwnershipDuration} years</span>
      </div>
    `;
  }
  
  if (preferences.annualMileage) {
    html += `
      <div class="settings-item">
        <span>Annual Mileage:</span>
        <span>${preferences.annualMileage} km</span>
      </div>
    `;
  }
  
  settingsContentElement.innerHTML = html;
}

/**
 * Capitalize the first letter of a string
 * @param {string} string - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirstLetter(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}
