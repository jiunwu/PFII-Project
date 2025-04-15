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

// Export the UI renderer
if (typeof module !== 'undefined') {
  module.exports = ResultsUI;
}
