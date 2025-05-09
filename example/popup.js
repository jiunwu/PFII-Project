// popup.js - Script for the extension popup UI

document.addEventListener('DOMContentLoaded', function() {
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
    if (isCar) {
      return 'CHF ' + value.toFixed(2).replace('.', ',');
    } else {
      return '€' + value.toFixed(2).replace('.', ',');
    }
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
      <p>Navigate to a product page on saturn.de or a car listing on tutti.ch to see lifetime cost calculations.</p>
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
