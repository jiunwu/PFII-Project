/* results_ui.js - Module for rendering lifetime cost results on product pages */

/**
 * ResultsUI - A module for creating and managing the UI elements that display
 * lifetime cost calculation results on product pages
 */
class ResultsUI {
  /**
   * Create a new ResultsUI instance
   */
  constructor() {
    this.containerId = 'lifetime-cost-calculator';
    this.modalId = 'ltc-modal';
    this.chartId = 'ltc-cost-chart';
  }

  /**
   * Display lifetime cost calculation results on the page
   * @param {Object} productData - Product data
   * @param {Object} calculationResults - Calculation results
   */
  displayResults(productData, calculationResults) {
    // Remove any existing container
    this.removeExistingContainer();
    
    // Create container for our display
    const container = document.createElement('div');
    container.id = this.containerId;
    container.className = 'ltc-container';
    
    // Create content
    container.innerHTML = this.createResultsHTML(productData, calculationResults);
    
    // Find a good place to insert our container
    this.insertContainer(container);
    
    // Add event listeners
    this.addEventListeners(productData, calculationResults);
  }

  /**
   * Create HTML for the results display
   * @param {Object} productData - Product data
   * @param {Object} calculationResults - Calculation results
   * @returns {string} HTML content
   */
  createResultsHTML(productData, calculationResults) {
    // Format currency values
    const formatCurrency = (value) => {
      return '€' + value.toFixed(2).replace('.', ',');
    };
    
    return `
      <div class="ltc-header">LIFETIME COST CALCULATOR</div>
      <div class="ltc-content">
        <div class="ltc-total">
          Total Cost of Ownership (${calculationResults.lifespan} years): 
          <span class="ltc-highlight">${formatCurrency(calculationResults.totalLifetimeCost)}</span>
        </div>
        
        <div class="ltc-breakdown">
          <div class="ltc-breakdown-title">Breakdown:</div>
          <div class="ltc-breakdown-item">
            • Purchase Price: ${formatCurrency(calculationResults.purchasePrice)}
          </div>
          <div class="ltc-breakdown-item">
            • Energy Cost (NPV): ${formatCurrency(calculationResults.energyCostNPV)}
          </div>
          <div class="ltc-breakdown-item">
            • Maintenance (NPV): ${formatCurrency(calculationResults.maintenanceCostNPV)}
          </div>
        </div>
        
        <div class="ltc-energy-info">
          Annual Energy Consumption: ${calculationResults.annualEnergyConsumption} kWh
          <br>
          Energy Efficiency Class: ${calculationResults.energyEfficiencyClass}
        </div>
        
        <button class="ltc-details-button">Show Calculation Details</button>
      </div>
    `;
  }

  /**
   * Insert the container into the page at an appropriate location
   * @param {Element} container - The container element to insert
   */
  insertContainer(container) {
    // Try several potential target locations
    const potentialTargets = [
      '.product-details',
      '.product-info',
      '.product-summary',
      '.price-container',
      '[data-test="product-price"]',
      '.product-price'
    ];
    
    let targetElement = null;
    
    for (const selector of potentialTargets) {
      const element = document.querySelector(selector);
      if (element) {
        targetElement = element;
        break;
      }
    }
    
    if (targetElement) {
      // Insert after the target element
      targetElement.parentNode.insertBefore(container, targetElement.nextSibling);
    } else {
      // Fallback: insert after the first heading
      const heading = document.querySelector('h1');
      if (heading) {
        heading.parentNode.insertBefore(container, heading.nextSibling);
      } else {
        // Last resort: append to body
        document.body.appendChild(container);
      }
    }
  }

  /**
   * Add event listeners to the UI elements
   * @param {Object} productData - Product data
   * @param {Object} calculationResults - Calculation results
   */
  addEventListeners(productData, calculationResults) {
    const detailsButton = document.querySelector('.ltc-details-button');
    if (detailsButton) {
      detailsButton.addEventListener('click', () => {
        this.showDetailsModal(productData, calculationResults);
      });
    }
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'SHOW_DETAILS') {
        this.showDetailsModal(productData, calculationResults);
      }
      
      if (message.type === 'PREFERENCES_UPDATED') {
        // Recalculate with new preferences
        this.handlePreferencesUpdate(productData);
      }
    });
  }

  /**
   * Show detailed calculation information in a modal
   * @param {Object} productData - Product data
   * @param {Object} calculationResults - Calculation results
   */
  showDetailsModal(productData, calculationResults) {
    // Remove any existing modal
    this.removeExistingModal();
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = this.modalId;
    modal.className = 'ltc-modal';
    
    // Format currency values
    const formatCurrency = (value) => {
      return '€' + value.toFixed(2).replace('.', ',');
    };
    
    // Create content
    modal.innerHTML = `
      <div class="ltc-modal-content">
        <span class="ltc-modal-close">&times;</span>
        <h2>Lifetime Cost Calculation Details</h2>
        
        <h3>Product Information</h3>
        <p>
          <strong>Name:</strong> ${productData.name}<br>
          <strong>Price:</strong> ${formatCurrency(calculationResults.purchasePrice)}<br>
          <strong>Energy Consumption:</strong> ${calculationResults.annualEnergyConsumption} kWh/year<br>
          <strong>Energy Efficiency Class:</strong> ${calculationResults.energyEfficiencyClass}<br>
          <strong>Expected Lifespan:</strong> ${calculationResults.lifespan} years
        </p>
        
        <h3>Energy Costs</h3>
        <p>
          <strong>Annual Energy Cost:</strong> ${formatCurrency(calculationResults.annualEnergyCost)}<br>
          <strong>Total Energy Cost (NPV):</strong> ${formatCurrency(calculationResults.energyCostNPV)}
        </p>
        
        <h3>Maintenance Costs</h3>
        <p>
          <strong>Total Maintenance Cost (NPV):</strong> ${formatCurrency(calculationResults.maintenanceCostNPV)}
        </p>
        
        <h3>Total Lifetime Cost</h3>
        <p>
          <strong>Purchase Price:</strong> ${formatCurrency(calculationResults.purchasePrice)}<br>
          <strong>Energy Cost (NPV):</strong> ${formatCurrency(calculationResults.energyCostNPV)}<br>
          <strong>Maintenance Cost (NPV):</strong> ${formatCurrency(calculationResults.maintenanceCostNPV)}<br>
          <strong>Total Lifetime Cost:</strong> ${formatCurrency(calculationResults.totalLifetimeCost)}
        </p>
        
        <div id="${this.chartId}" class="ltc-chart"></div>
        
        <p class="ltc-note">
          Note: All future costs are calculated using Net Present Value (NPV) to account for the time value of money.
          The discount rate used is ${(calculationResults.discountRate || 0.02) * 100}%.
        </p>
      </div>
    `;
    
    // Add modal to page
    document.body.appendChild(modal);
    
    // Create chart
    this.createCostChart(calculationResults);
    
    // Add event listeners
    const closeButton = modal.querySelector('.ltc-modal-close');
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    
    // Close modal when clicking outside the content
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * Create a chart visualizing the cost breakdown
   * @param {Object} calculationResults - Calculation results
   */
  createCostChart(calculationResults) {
    // This is a placeholder for chart creation
    // In a real implementation, you would use a charting library like Chart.js
    
    const chartContainer = document.getElementById(this.chartId);
    if (!chartContainer) return;
    
    // Create a simple bar chart representation using divs
    const total = calculationResults.totalLifetimeCost;
    const purchasePercentage = (calculationResults.purchasePrice / total) * 100;
    const energyPercentage = (calculationResults.energyCostNPV / total) * 100;
    const maintenancePercentage = (calculationResults.maintenanceCostNPV / total) * 100;
    
    chartContainer.innerHTML = `
      <div class="ltc-chart-title">Cost Breakdown</div>
      <div class="ltc-chart-container">
        <div class="ltc-chart-bar">
          <div class="ltc-chart-segment ltc-purchase" style="width: ${purchasePercentage}%;" 
               title="Purchase Price: €${calculationResults.purchasePrice.toFixed(2)}"></div>
          <div class="ltc-chart-segment ltc-energy" style="width: ${energyPercentage}%;" 
               title="Energy Cost: €${calculationResults.energyCostNPV.toFixed(2)}"></div>
          <div class="ltc-chart-segment ltc-maintenance" style="width: ${maintenancePercentage}%;" 
               title="Maintenance Cost: €${calculationResults.maintenanceCostNPV.toFixed(2)}"></div>
        </div>
      </div>
      <div class="ltc-chart-legend">
        <div class="ltc-legend-item">
          <div class="ltc-legend-color ltc-purchase"></div>
          <div class="ltc-legend-label">Purchase (${Math.round(purchasePercentage)}%)</div>
        </div>
        <div class="ltc-legend-item">
          <div class="ltc-legend-color ltc-energy"></div>
          <div class="ltc-legend-label">Energy (${Math.round(energyPercentage)}%)</div>
        </div>
        <div class="ltc-legend-item">
          <div class="ltc-legend-color ltc-maintenance"></div>
          <div class="ltc-legend-label">Maintenance (${Math.round(maintenancePercentage)}%)</div>
        </div>
      </div>
    `;
  }

  /**
   * Handle preferences update by recalculating and updating the display
   * @param {Object} productData - Product data
   */
  handlePreferencesUpdate(productData) {
    // Get updated preferences
    chrome.runtime.sendMessage({ type: 'GET_PREFERENCES' }, (response) => {
      if (response && response.preferences) {
        // Create calculator with new preferences
        const calculator = new LifetimeCalculator(response.preferences);
        
        // Recalculate
        const newResults = calculator.calculateLifetimeCost(productData);
        
        // Update display
        this.displayResults(productData, newResults);
        
        // Update stored results
        chrome.runtime.sendMessage({ 
          type: 'PRODUCT_DETECTED',
          productData: productData,
          calculationResults: newResults
        });
      }
    });
  }

  /**
   * Remove existing container if it exists
   */
  removeExistingContainer() {
    const existingContainer = document.getElementById(this.containerId);
    if (existingContainer) {
      existingContainer.parentNode.removeChild(existingContainer);
    }
  }

  /**
   * Remove existing modal if it exists
   */
  removeExistingModal() {
    const existingModal = document.getElementById(this.modalId);
    if (existingModal) {
      existingModal.parentNode.removeChild(existingModal);
    }
  }
}

// Removed duplicate isProductPage function. Use the global version from page_detector.js instead.

// Export the UI renderer
if (typeof module !== 'undefined') {
  module.exports = ResultsUI;
}

// Format currency based on locale and currency code
function formatCurrency(amount, currency = 'CHF') {
  return new Intl.NumberFormat('de-CH', { style: 'currency', currency: currency }).format(amount);
}

// Display lifetime cost information on the page
function displayLifetimeCost(productData, calculationResults) {
  console.log('Displaying lifetime cost:', productData, calculationResults);
  if (!productData || !calculationResults) {
    console.warn('Missing productData or calculationResults for displayLifetimeCost');
    return;
  }

  let container = document.getElementById('lifetime-cost-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'lifetime-cost-container';
    // Attempt to insert before a common element, e.g., product description or reviews
    const potentialInsertionPoints = [
      document.querySelector('.product-description'),
      document.querySelector('#description'),
      document.querySelector('.product-details'),
      document.querySelector('#product-details'),
      document.querySelector('.product-info'),
      document.querySelector('#reviews'),
      document.querySelector('.pdp-content'), // Common on many sites
      document.querySelector('#pdp-content'),
      document.querySelector('.product-main-info'),
      document.querySelector('.product-essential'),
      document.querySelector('.product-view'),
      document.querySelector('.product-shop'),
      document.querySelector('.product-secondary-column'),
      document.querySelector('.product-info-main'),
      document.querySelector('.product-info-price'),
      document.querySelector('.product-add-to-cart'),
      document.querySelector('#add-to-cart-button'),
      document.querySelector('form[data-productid]'),
      document.querySelector('.product-detail-info__header'), // Zara
      document.querySelector('.product-detail-info'), // Zara
      document.querySelector('.product-detail-actions'), // Zara
      document.querySelector('.product-detail-description'), // Zara
      document.querySelector('[data-testid="product-title"]'), // Digitec
      document.querySelector('.product-description-txt'), // Digitec
      document.querySelector('.product-price-container'), // Digitec
      document.querySelector('.article-info'), // Generic
      document.querySelector('#productOverview') // Generic
    ];

    let inserted = false;
    for (const point of potentialInsertionPoints) {
      if (point && point.parentNode) {
        point.parentNode.insertBefore(container, point);
        inserted = true;
        console.log('Lifetime cost container inserted before:', point);
        break;
      }
    }
    if (!inserted) {
      // Fallback: append to body if no suitable point found
      document.body.appendChild(container);
      console.log('Lifetime cost container appended to body as fallback.');
    }
  }

  const currency = productData.currency || 'CHF';
  const purchasePrice = calculationResults.purchasePrice !== undefined ? calculationResults.purchasePrice : productData.price;
  const totalLifetimeCost = calculationResults.totalLifetimeCost;

  let htmlContent = `
    <div class="ltc-card">
      <h3 class="ltc-title">Lifetime Cost Analysis</h3>
      <p class="ltc-item"><strong>Product:</strong> ${productData.name || 'N/A'}</p>
      <p class="ltc-item"><strong>Purchase Price:</strong> ${formatCurrency(purchasePrice, currency)}</p>
  `;

  if (productData.productType === 'clothing') {
    htmlContent += `
      <p class="ltc-item"><strong>Estimated Lifespan:</strong> ${calculationResults.lifespan || 'N/A'} years</p>
      <p class="ltc-item"><strong>Material:</strong> ${calculationResults.material || 'N/A'}</p>
      <p class="ltc-item"><strong>Quality:</strong> ${calculationResults.quality || 'N/A'}</p>
      <p class="ltc-item"><strong>Est. Maintenance (per year):</strong> ${formatCurrency(calculationResults.maintenanceCostPerYear || 0, currency)}</p>
      <p class="ltc-item ltc-total-cost"><strong>Total Estimated Lifetime Cost:</strong> ${formatCurrency(totalLifetimeCost, currency)}</p>
    `;
  } else if (calculationResults.energyCostNPV !== undefined && calculationResults.maintenanceCostNPV !== undefined) {
    htmlContent += `
      <p class="ltc-item"><strong>Est. Lifespan:</strong> ${calculationResults.lifespan || 'N/A'} years</p>
      <p class="ltc-item"><strong>Energy Efficiency:</strong> ${calculationResults.energyEfficiencyClass || 'N/A'}</p>
      <p class="ltc-item"><strong>Est. Energy Cost (NPV):</strong> ${formatCurrency(calculationResults.energyCostNPV, currency)}</p>
      <p class="ltc-item"><strong>Est. Maintenance Cost (NPV):</strong> ${formatCurrency(calculationResults.maintenanceCostNPV, currency)}</p>
      <p class="ltc-item ltc-total-cost"><strong>Total Estimated Lifetime Cost:</strong> ${formatCurrency(totalLifetimeCost, currency)}</p>
    `;
  } else {
    // Fallback for items where only price is known or calculation is minimal
    htmlContent += `
      <p class="ltc-item ltc-total-cost"><strong>Total Estimated Cost (Purchase Price):</strong> ${formatCurrency(totalLifetimeCost, currency)}</p>
      <p class="ltc-item"><em>Detailed lifetime cost analysis not available for this product type or data.</em></p>
    `;
  }

  htmlContent += `</div>`;
  container.innerHTML = htmlContent;
}

// Display car lifetime cost information on the page
function displayCarLifetimeCost(productData, calculationResults) {
  console.log('Displaying car lifetime cost:', productData, calculationResults);
  if (!productData || !calculationResults) {
    console.warn('Missing productData or calculationResults for displayCarLifetimeCost');
    return;
  }

  let container = document.getElementById('lifetime-cost-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'lifetime-cost-container';
    // Attempt to insert in a relevant place for car listings
    const potentialInsertionPoints = [
      document.querySelector('.vehicle-details'),
      document.querySelector('.cardetails'),
      document.querySelector('.price-container'),
      document.querySelector('.gallery-column'), // tutti.ch
      document.querySelector('.panel-body'), // tutti.ch
      document.querySelector('.vdp-pricing-panel'),
      document.querySelector('#vdp-right-rail'),
      document.querySelector('.overview-section'),
      document.querySelector('.product-info-main') // Fallback if others not found
    ];
    let inserted = false;
    for (const point of potentialInsertionPoints) {
      if (point && point.parentNode) {
        point.parentNode.insertBefore(container, point.nextSibling); // Insert after the element
        inserted = true;
        console.log('Car lifetime cost container inserted after:', point);
        break;
      }
    }
    if (!inserted) {
      document.body.appendChild(container);
      console.log('Car lifetime cost container appended to body as fallback.');
    }
  }

  const currency = calculationResults.currency || 'CHF';

  container.innerHTML = `
    <div class="ltc-card ltc-car-card">
      <h3 class="ltc-title">Car Lifetime Cost Analysis (Est. ${calculationResults.ownershipDuration} Years)</h3>
      <p class="ltc-item"><strong>Vehicle:</strong> ${productData.make || ''} ${productData.model || ''} (${productData.year || 'N/A'})</p>
      <p class="ltc-item"><strong>Purchase Price:</strong> ${formatCurrency(calculationResults.purchasePrice, currency)}</p>
      <p class="ltc-item"><strong>Est. Annual Depreciation:</strong> ${formatCurrency(calculationResults.annualDepreciation, currency)}</p>
      <p class="ltc-item"><strong>Est. Resale Value (after ${calculationResults.ownershipDuration} yrs):</strong> ${formatCurrency(calculationResults.estimatedResaleValue, currency)}</p>
      <hr class="ltc-hr">
      <p class="ltc-item"><strong>Est. Annual Fuel Cost:</strong> ${formatCurrency(calculationResults.annualFuelCost, currency)} (Fuel: ${productData.fuelType || 'N/A'}, ${productData.fuelConsumption || 'N/A'} L or kWh/100km)</p>
      <p class="ltc-item"><strong>Est. Annual Insurance:</strong> ${formatCurrency(calculationResults.annualInsuranceCost, currency)}</p>
      <p class="ltc-item"><strong>Est. Annual Tax:</strong> ${formatCurrency(calculationResults.annualTaxCost, currency)}</p>
      <p class="ltc-item"><strong>Est. Annual Maintenance:</strong> ${formatCurrency(calculationResults.annualMaintenanceCost, currency)}</p>
      <hr class="ltc-hr">
      <p class="ltc-item"><strong>Total Depreciation (NPV over ${calculationResults.ownershipDuration} yrs):</strong> ${formatCurrency(calculationResults.depreciationCost, currency)}</p>
      <p class="ltc-item"><strong>Total Running Costs (NPV over ${calculationResults.ownershipDuration} yrs):</strong> ${formatCurrency(calculationResults.totalRunningCostsNPV, currency)}</p>
      <p class="ltc-item ltc-total-cost"><strong>Total Estimated Net Ownership Cost (NPV):</strong> ${formatCurrency(calculationResults.totalLifetimeCost, currency)}</p>
      <p class="ltc-item ltc-monthly-cost"><strong>Estimated Monthly Cost:</strong> ${formatCurrency(calculationResults.monthlyCost, currency)}</p>
    </div>
  `;
}
