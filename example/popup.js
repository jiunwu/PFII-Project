// popup.js - Script for the extension popup UI

document.addEventListener('DOMContentLoaded', function () {
  // Request the latest product and calculation results from background/content script
  chrome.runtime.sendMessage({ type: 'GET_LAST_PRODUCT' }, (response) => {
    if (response && response.productData && response.calculationResults) {
      displayProductInfo(response.productData, response.calculationResults);
    } else {
      document.getElementById('ltc-error-message').textContent = 'No product data available. Visit a product page.';
    }
  });

  // Check if we have product data to display
  chrome.storage.local.get(['currentProduct', 'calculationResults'], function(data) {
    updateStatusIndicator(data.currentProduct != null);
    
    if (data.currentProduct && data.calculationResults) {
      displayProductData(data.currentProduct, data.calculationResults);
    } else {
      displayNoProductMessage();
    }
  });
  
  // Get user preferences for displaying settings
  chrome.storage.sync.get('preferences', function(data) {
    if (data.preferences) {
      displaySettings(data.preferences);
    }
  });
  
  // Add event listener for settings button
  document.addEventListener('click', function(event) {
    if (event.target.id === 'settings-button') {
      chrome.runtime.openOptionsPage();
    }
    
    if (event.target.id === 'details-button') {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'SHOW_DETAILS'});
      });
    }
  });
});

// Listen for messages from the content script and update popup state
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PRODUCT_DETECTED') {
    localStorage.setItem('ltc_productData', JSON.stringify(message.productData));
    localStorage.setItem('ltc_calculationResults', JSON.stringify(message.calculationResults));
  }
});

// Helper to render the product and calculation results in the popup
function renderLifetimeCostCalculator(productData, calculationResults) {
  const container = document.getElementById('ltc-result-container');
  if (!container) return;
  container.innerHTML = '';

  // Always log the data for debugging
  console.log('Rendering with:', { productData, calculationResults });

  // Check if we have at least some product data
  if (productData && productData.name) {
    // Clothing-specific UI
    if (calculationResults && calculationResults.productType === 'clothing') {
      container.innerHTML = `
        <div style="font-weight:700;font-size:1.1em;color:#0077b6;margin-bottom:8px;letter-spacing:1px;">Lifetime Cost Calculator</div>
        <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <b style="flex:1;">${productData.name}</b>
          <span style="font-weight:600;margin-left:10px;">${formatCurrency(productData.price)}</span>
        </div>
        <div style="margin-bottom:8px;"><b>Material:</b> ${calculationResults.material || 'N/A'} (${calculationResults.quality || 'N/A'} quality)</div>
        <div style="margin-bottom:8px;"><b>Estimated Lifespan:</b> ${calculationResults.lifespan} years</div>
        <div style="margin-bottom:8px;"><b>Annualized Cost:</b> ${formatCurrency(calculationResults.annualCost)}</div>
        <div style="margin-bottom:8px;"><b>Maintenance per Year:</b> ${formatCurrency(calculationResults.maintenanceCostPerYear)}</div>
        <div style="margin-bottom:8px;"><b>Total Maintenance:</b> ${formatCurrency(calculationResults.totalMaintenanceCost)}</div>
        <div style="margin-bottom:8px;"><b>Total Lifetime Cost:</b> <span style="color:#009900;font-weight:700;">${formatCurrency(calculationResults.totalLifetimeCost)}</span></div>
      `;
    } else {
      // Basic product info if we don't have full calculation results
      container.innerHTML = `
        <div style="font-weight:700;font-size:1.1em;color:#0077b6;margin-bottom:8px;letter-spacing:1px;">Lifetime Cost Calculator</div>
        <div style="margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;">
          <b style="flex:1;">${productData.name}</b>
          <span style="font-weight:600;margin-left:10px;">${formatCurrency(productData.price)}</span>
        </div>
        ${productData.material ? `<div style="margin-bottom:8px;"><b>Material:</b> ${productData.material}</div>` : ''}
        <div style="margin-bottom:8px;color:#666;">Calculating lifetime costs...</div>
      `;
    }
  } else {
    // Only show empty state if we really have no product data
    container.innerHTML = `
      <div class="ltc-empty-state">
        <img src="images/icon-128.png" alt="No product" style="width:48px;display:block;margin:20px auto 10px auto;opacity:0.5;" />
        <div style="text-align:center;color:#888;font-size:1.1em;margin-bottom:10px;">No product detected on this page.</div>
        <div style="text-align:center;color:#888;font-size:0.95em;">Navigate to a product page on zara.com or saturn.de to see lifetime cost calculations.</div>
      </div>
    `;
  }
}

// Helper to format currency
function formatCurrency(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    console.error('Invalid value passed to formatCurrency:', value);
    return '€0,00'; // Default fallback
  }
  
  // Check if we have product data with currency info
  if (productData && productData.originalCurrency) {
    const currency = productData.originalCurrency;
    const formattedValue = value.toFixed(2).replace('.', ',');
    
    switch (currency) {
      case 'CHF':
        return 'CHF ' + formattedValue;
      case 'USD':
        return '$' + formattedValue;
      case 'GBP':
        return '£' + formattedValue;
      case 'EUR':
      default:
        return '€' + formattedValue;
    }
  }
  
  // Default to EUR if no currency info available
  return '€' + value.toFixed(2).replace('.', ',');
}

// On popup load, render the latest product/calculation results
window.addEventListener('DOMContentLoaded', function() {
  chrome.storage.local.get(['latestProductData', 'latestCalculationResults'], function(result) {
    console.log('Retrieved from storage:', result);
    renderLifetimeCostCalculator(result.latestProductData, result.latestCalculationResults);
  });
});

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
 * Display product data and calculation results in the popup
 * @param {Object} productData - Product data
 * @param {Object} calculationResults - Calculation results
 */
function displayProductData(productData, calculationResults) {
  const contentElement = document.getElementById('content');
  
  // Check if this is a car
  const isCar = productData.productType === 'car';
  
  // Format currency values with appropriate currency symbol
  const formatCurrency = (value) => {
<<<<<<< HEAD
    if (typeof value !== 'number' || isNaN(value)) {
      console.error('Invalid value passed to formatCurrency:', value);
      return '€0,00'; // Default fallback
    }
    
    // Check if we have product data with currency info
    if (productData && productData.originalCurrency) {
      const currency = productData.originalCurrency;
      const formattedValue = value.toFixed(2).replace('.', ',');
      
      switch (currency) {
        case 'CHF':
          return 'CHF ' + formattedValue;
        case 'USD':
          return '$' + formattedValue;
        case 'GBP':
          return '£' + formattedValue;
        case 'EUR':
        default:
          return '€' + formattedValue;
      }
    }
    
    // Default to EUR if no currency info available
    return '€' + value.toFixed(2).replace('.', ',');
=======
    if (isCar) {
      return 'CHF ' + value.toFixed(2).replace('.', ',');
    } else {
      return '€' + value.toFixed(2).replace('.', ',');
    }
>>>>>>> origin/main
  };
  
  // Create content HTML based on product type
  let html = '';
  
  if (isCar) {
    // Car-specific display
    html = `
      <div class="product-info">
        <div class="product-name">${productData.year} ${productData.name}</div>
        <div>${capitalizeFirstLetter(productData.carType || 'Car')}</div>
      </div>
      
      <div class="car-info">
        <div class="car-detail">Mileage: ${productData.mileage} km</div>
        <div class="car-detail">Fuel: ${capitalizeFirstLetter(productData.fuelType || 'Unknown')}</div>
        <div class="car-detail">Consumption: ${productData.fuelConsumption} ${productData.fuelType === 'electric' ? 'kWh/100km' : 'L/100km'}</div>
      </div>
      
      <div class="monthly-cost">
        Monthly Cost: ${formatCurrency(calculationResults.monthlyCost)}
      </div>
      
      <div class="cost-summary">
        <div class="cost-item">
          <span>Purchase Price:</span>
          <span>${formatCurrency(calculationResults.purchasePrice)}</span>
        </div>
        <div class="cost-item">
          <span>Depreciation (${calculationResults.ownershipDuration} years):</span>
          <span>${formatCurrency(calculationResults.depreciationCost)}</span>
        </div>
        <div class="cost-item">
          <span>Fuel Cost:</span>
          <span>${formatCurrency(calculationResults.fuelCostNPV)}</span>
        </div>
        <div class="cost-item">
          <span>Insurance:</span>
          <span>${formatCurrency(calculationResults.insuranceCostNPV)}</span>
        </div>
        <div class="cost-item">
          <span>Tax:</span>
          <span>${formatCurrency(calculationResults.taxCostNPV)}</span>
        </div>
        <div class="cost-item">
          <span>Maintenance:</span>
          <span>${formatCurrency(calculationResults.maintenanceCostNPV)}</span>
        </div>
        <div class="cost-total">
          <span>Total Ownership Cost:</span>
          <span class="highlight">${formatCurrency(calculationResults.totalOwnershipCost)}</span>
        </div>
      </div>
    `;
  } else {
    // Appliance-specific display
    html = `
      <div class="product-info">
        <div class="product-name">${productData.name}</div>
        <div>${productData.productType ? capitalizeFirstLetter(productData.productType) : 'Appliance'}</div>
      </div>
      
      <div class="cost-summary">
        <div class="cost-item">
          <span>Purchase Price:</span>
          <span>${formatCurrency(calculationResults.purchasePrice)}</span>
        </div>
        <div class="cost-item">
          <span>Energy Cost (${calculationResults.lifespan} years):</span>
          <span>${formatCurrency(calculationResults.energyCostNPV)}</span>
        </div>
        <div class="cost-item">
          <span>Maintenance Cost:</span>
          <span>${formatCurrency(calculationResults.maintenanceCostNPV)}</span>
        </div>
        <div class="cost-total">
          <span>Total Lifetime Cost:</span>
          <span class="highlight">${formatCurrency(calculationResults.totalLifetimeCost)}</span>
        </div>
      </div>
      
      <div>
        <div>Annual Energy: ${calculationResults.annualEnergyConsumption} kWh</div>
        <div>Energy Class: ${calculationResults.energyEfficiencyClass}</div>
      </div>
    `;
  }
  
  // Add buttons and settings section
  html += `
    <button id="details-button" class="details-button">View Details</button>
    
    <div class="settings-section">
      <div class="settings-title">Settings</div>
      <div id="settings-content">
        <!-- Settings will be populated here -->
      </div>
      <button id="settings-button" class="settings-button">Open Settings</button>
    </div>
  `;
  
  contentElement.innerHTML = html;
}

/**
 * Display a message when no product is detected
 */
function displayNoProductMessage() {
  const contentElement = document.getElementById('content');
  
  contentElement.innerHTML = `
    <div class="no-product">
      <div class="no-product-icon">🔍</div>
      <p>No product detected on this page.</p>
<<<<<<< HEAD
      <p>Navigate to a product page on saturn.de or zara.com to see lifetime cost calculations.</p>
=======
      <p>Navigate to a product page on saturn.de or a car listing on tutti.ch to see lifetime cost calculations.</p>
>>>>>>> origin/main
    </div>
    
    <div class="settings-section">
      <div class="settings-title">Settings</div>
      <div id="settings-content">
        <!-- Settings will be populated here -->
      </div>
      <button id="settings-button" class="settings-button">Open Settings</button>
    </div>
  `;
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

/**
 * Display product information and calculation results
 * @param {Object} productData - Product data
 * @param {Object} calculationResults - Calculation results
 */
function displayProductInfo(productData, calculationResults) {
  const infoDiv = document.getElementById('ltc-product-info');
  const breakdownDiv = document.getElementById('ltc-cost-breakdown');
  infoDiv.innerHTML = `<strong>Product:</strong> ${productData.name || 'N/A'}<br><strong>Price:</strong> €${productData.price || 'N/A'}`;
  breakdownDiv.innerHTML = `<pre>${JSON.stringify(calculationResults, null, 2)}</pre>`;
}
