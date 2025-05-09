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
    const isCar = productData.productType === 'car';
    const currencySymbol = isCar ? 'CHF' : '€';

    // Format currency values
    const formatCurrency = (value) => {
      if (typeof value !== 'number' || isNaN(value)) return `${currencySymbol} 0,00`;
      return `${currencySymbol} ` + value.toFixed(2).replace('.', ',');
    };
    
    if (isCar) {
      return `
        <div class="ltc-header">CAR OWNERSHIP COST CALCULATOR</div>
        <div class="ltc-content">
          <div class="ltc-total">
            Total Cost of Ownership (${calculationResults.ownershipDuration} years): 
            <span class="ltc-highlight">${formatCurrency(calculationResults.totalOwnershipCost)}</span>
          </div>
          <div class="ltc-monthly">
            Monthly Cost: 
            <span class="ltc-highlight">${formatCurrency(calculationResults.monthlyCost)}</span>
          </div>
          <div class="ltc-breakdown">
            <div class="ltc-breakdown-title">Breakdown:</div>
            <div class="ltc-breakdown-item">
              • Purchase Price: ${formatCurrency(calculationResults.purchasePrice)}
            </div>
            <div class="ltc-breakdown-item">
              • Depreciation: ${formatCurrency(calculationResults.depreciationCost)}
            </div>
            <div class="ltc-breakdown-item">
              • Fuel Cost (NPV): ${formatCurrency(calculationResults.fuelCostNPV)}
            </div>
            <div class="ltc-breakdown-item">
              • Tax (NPV): ${formatCurrency(calculationResults.taxCostNPV)}
            </div>
            <div class="ltc-breakdown-item">
              • Insurance (NPV): ${formatCurrency(calculationResults.insuranceCostNPV)}
            </div>
            <div class="ltc-breakdown-item">
              • Maintenance (NPV): ${formatCurrency(calculationResults.maintenanceCostNPV)}
            </div>
          </div>
          <div class="ltc-car-info">
            ${productData.year} ${productData.name} • ${productData.mileage} km • ${productData.fuelType}
            <br>
            Fuel Consumption: ${productData.fuelConsumption} ${productData.fuelType === 'electric' ? 'kWh/100km' : 'L/100km'}
          </div>
          <button class="ltc-details-button">Show Calculation Details</button>
          <button class="ltc-save-button">Save This Car</button>
        </div>
      `;
    } else {
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
          <button class="ltc-save-button">Save This Product</button>
        </div>
      `;
    }
  }

  /**
   * Insert the container into the page at an appropriate location
   * @param {Element} container - The container element to insert
   */
  insertContainer(container) {
    console.log('[LifetimeCostCalculator] Attempting to insert UI as a floating sidebar...');
    
    if (document.body) {
        // Always append to the body for a floating sidebar
        document.body.appendChild(container);
        // Add a specific class to the container for sidebar styling
        container.classList.add('ltc-sidebar'); 
        console.log('[LifetimeCostCalculator] UI container appended to body for sidebar display.');
    } else {
        console.error('[LifetimeCostCalculator] document.body not found. Cannot append sidebar UI.');
    }
  }

  /**
   * Add event listeners to the UI elements
   * @param {Object} productData - Product data
   * @param {Object} calculationResults - Calculation results
   */
  addEventListeners(productData, calculationResults) {
    const detailsButton = document.querySelector(`#${this.containerId} .ltc-details-button`);
    if (detailsButton) {
      detailsButton.addEventListener('click', () => {
        this.showDetailsModal(productData, calculationResults);
      });
    }

    const saveButton = document.querySelector(`#${this.containerId} .ltc-save-button`);
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            // The saveProduct function would be defined in content.js or imported
            if (typeof saveProduct === 'function') {
                saveProduct(productData, calculationResults);
            } else {
                console.error('saveProduct function not found. Make sure it is available in the scope.');
                 // Fallback or direct implementation if needed
                 const productToSave = {
                    ...productData,
                    calculationResults,
                    savedAt: new Date().toISOString(),
                    url: window.location.href
                  };
                  chrome.storage.sync.get({ savedProducts: [] }, (result) => {
                    const savedProducts = result.savedProducts;
                    savedProducts.push(productToSave);
                    chrome.storage.sync.set({ savedProducts }, () => {
                      alert('Product saved! (Fallback save)');
                    });
                  });
            }
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
    
    const isCar = productData.productType === 'car';
    const currencySymbol = isCar ? 'CHF' : '€';

    // Format currency values
    const formatCurrency = (value) => {
      if (typeof value !== 'number' || isNaN(value)) return `${currencySymbol} 0,00`;
      return `${currencySymbol} ` + value.toFixed(2).replace('.', ',');
    };
    
    let modalHTML = '';
    if (isCar) {
        modalHTML = `
        <div class="ltc-modal-content">
          <span class="ltc-modal-close">&times;</span>
          <h2>Car Ownership Cost Calculation Details</h2>
          
          <h3>Car Information</h3>
          <p>
            <strong>Make/Model:</strong> ${productData.name}<br>
            <strong>Year:</strong> ${productData.year} (Age: ${calculationResults.carDetails.age} years)<br>
            <strong>Mileage:</strong> ${productData.mileage} km<br>
            <strong>Fuel Type:</strong> ${productData.fuelType}<br>
            <strong>Fuel Consumption:</strong> ${productData.fuelConsumption} ${productData.fuelType === 'electric' ? 'kWh/100km' : 'L/100km'}<br>
            <strong>Engine Size:</strong> ${productData.engineSize || 'Unknown'}<br>
            <strong>Transmission:</strong> ${productData.transmission || 'Unknown'}
          </p>
          
          <h3>Annual Costs</h3>
          <p>
            <strong>Depreciation:</strong> ${formatCurrency(calculationResults.annualDepreciation)}/year<br>
            <strong>Fuel:</strong> ${formatCurrency(calculationResults.annualFuelCost)}/year<br>
            <strong>Tax:</strong> ${formatCurrency(calculationResults.annualTax)}/year<br>
            <strong>Insurance:</strong> ${formatCurrency(calculationResults.annualInsurance)}/year<br>
            <strong>Maintenance:</strong> ${formatCurrency(calculationResults.annualMaintenanceCost)}/year
          </p>
          
          <h3>Total Costs (${calculationResults.ownershipDuration} years)</h3>
          <p>
            <strong>Purchase Price:</strong> ${formatCurrency(calculationResults.purchasePrice)}<br>
            <strong>Depreciation:</strong> ${formatCurrency(calculationResults.depreciationCost)}<br>
            <strong>Fuel (NPV):</strong> ${formatCurrency(calculationResults.fuelCostNPV)}<br>
            <strong>Tax (NPV):</strong> ${formatCurrency(calculationResults.taxCostNPV)}<br>
            <strong>Insurance (NPV):</strong> ${formatCurrency(calculationResults.insuranceCostNPV)}<br>
            <strong>Maintenance (NPV):</strong> ${formatCurrency(calculationResults.maintenanceCostNPV)}<br>
            <strong>Total Ownership Cost:</strong> ${formatCurrency(calculationResults.totalOwnershipCost)}<br>
            <strong>Monthly Cost:</strong> ${formatCurrency(calculationResults.monthlyCost)}
          </p>

          <div id="${this.chartId}" class="ltc-chart"></div>
          
          <p class="ltc-note">
            Note: All future costs are calculated using Net Present Value (NPV) to account for the time value of money.
            The discount rate used is ${(calculationResults.discountRate || preferences.discountRate || 0.02) * 100}%.
          </p>
        </div>
      `;
    } else {
        modalHTML = `
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
            <strong>Average Repair Cost Used:</strong> ${formatCurrency(calculationResults.averageRepairCostUsed)}<br>
            <strong>Expected Number of Repairs:</strong> ${calculationResults.numRepairsUsed}<br>
            <strong>Data Source:</strong> ${calculationResults.maintenanceDataSource}<br>
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
            The discount rate used is ${(calculationResults.discountRate || preferences.discountRate || 0.02) * 100}%.
          </p>
        </div>
      `;
    }
    modal.innerHTML = modalHTML;
    
    // Add modal to page
    document.body.appendChild(modal);
    
    // Create chart
    this.createCostChart(productData, calculationResults);
    
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
   * @param {Object} productData - Product data (to determine type)
   * @param {Object} calculationResults - Calculation results
   */
  createCostChart(productData, calculationResults) {
    const chartContainer = document.getElementById(this.chartId);
    if (!chartContainer) return;

    const isCar = productData.productType === 'car';
    const currencySymbol = isCar ? 'CHF' : '€';

    let chartHTML = '';

    if (isCar) {
        const total = calculationResults.totalOwnershipCost;
        const purchasePercentage = (calculationResults.purchasePrice / total) * 100;
        const depreciationPercentage = (calculationResults.depreciationCost / total) * 100;
        const fuelPercentage = (calculationResults.fuelCostNPV / total) * 100;
        const taxPercentage = (calculationResults.taxCostNPV / total) * 100;
        const insurancePercentage = (calculationResults.insuranceCostNPV / total) * 100;
        const maintenancePercentage = (calculationResults.maintenanceCostNPV / total) * 100;

        chartHTML = `
        <div class="ltc-chart-title">Car Cost Breakdown</div>
        <div class="ltc-chart-container">
            <div class="ltc-chart-bar">
            <div class="ltc-chart-segment ltc-purchase" style="width: ${purchasePercentage}%;" 
                title="Purchase Price: ${currencySymbol}${calculationResults.purchasePrice.toFixed(2)}"></div>
            <div class="ltc-chart-segment ltc-depreciation" style="width: ${depreciationPercentage}%;" 
                title="Depreciation: ${currencySymbol}${calculationResults.depreciationCost.toFixed(2)}"></div>
            <div class="ltc-chart-segment ltc-fuel" style="width: ${fuelPercentage}%;" 
                title="Fuel Cost: ${currencySymbol}${calculationResults.fuelCostNPV.toFixed(2)}"></div>
            <div class="ltc-chart-segment ltc-tax" style="width: ${taxPercentage}%;" 
                title="Tax: ${currencySymbol}${calculationResults.taxCostNPV.toFixed(2)}"></div>
            <div class="ltc-chart-segment ltc-insurance" style="width: ${insurancePercentage}%;" 
                title="Insurance: ${currencySymbol}${calculationResults.insuranceCostNPV.toFixed(2)}"></div>
            <div class="ltc-chart-segment ltc-maintenance" style="width: ${maintenancePercentage}%;" 
                title="Maintenance Cost: ${currencySymbol}${calculationResults.maintenanceCostNPV.toFixed(2)}"></div>
            </div>
        </div>
        <div class="ltc-chart-legend">
            <div class="ltc-legend-item"><div class="ltc-legend-color ltc-purchase"></div><div class="ltc-legend-label">Purchase (${Math.round(purchasePercentage)}%)</div></div>
            <div class="ltc-legend-item"><div class="ltc-legend-color ltc-depreciation"></div><div class="ltc-legend-label">Depreciation (${Math.round(depreciationPercentage)}%)</div></div>
            <div class="ltc-legend-item"><div class="ltc-legend-color ltc-fuel"></div><div class="ltc-legend-label">Fuel (${Math.round(fuelPercentage)}%)</div></div>
            <div class="ltc-legend-item"><div class="ltc-legend-color ltc-tax"></div><div class="ltc-legend-label">Tax (${Math.round(taxPercentage)}%)</div></div>
            <div class="ltc-legend-item"><div class="ltc-legend-color ltc-insurance"></div><div class="ltc-legend-label">Insurance (${Math.round(insurancePercentage)}%)</div></div>
            <div class="ltc-legend-item"><div class="ltc-legend-color ltc-maintenance"></div><div class="ltc-legend-label">Maintenance (${Math.round(maintenancePercentage)}%)</div></div>
        </div>
        `;
    } else {
        const total = calculationResults.totalLifetimeCost;
        const purchasePercentage = (calculationResults.purchasePrice / total) * 100;
        const energyPercentage = (calculationResults.energyCostNPV / total) * 100;
        const maintenancePercentage = (calculationResults.maintenanceCostNPV / total) * 100;
        
        chartHTML = `
        <div class="ltc-chart-title">Appliance Cost Breakdown</div>
        <div class="ltc-chart-container">
            <div class="ltc-chart-bar">
            <div class="ltc-chart-segment ltc-purchase" style="width: ${purchasePercentage}%;" 
                title="Purchase Price: ${currencySymbol}${calculationResults.purchasePrice.toFixed(2)}"></div>
            <div class="ltc-chart-segment ltc-energy" style="width: ${energyPercentage}%;" 
                title="Energy Cost: ${currencySymbol}${calculationResults.energyCostNPV.toFixed(2)}"></div>
            <div class="ltc-chart-segment ltc-maintenance" style="width: ${maintenancePercentage}%;" 
                title="Maintenance Cost: ${currencySymbol}${calculationResults.maintenanceCostNPV.toFixed(2)}"></div>
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
    chartContainer.innerHTML = chartHTML;
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
        // This assumes LifetimeCalculator is globally available or imported in content.js
        let calculator;
        if (typeof LifetimeCalculator !== 'undefined') {
             calculator = new LifetimeCalculator(response.preferences);
        } else {
            console.error("LifetimeCalculator class not found. Ensure it's loaded.");
            // As a fallback, try to use the functions directly if they are global
            // This part of the logic might need to be in content.js where calculateLifetimeCost is defined
            if (productData.productType === 'car' && typeof calculateCarLifetimeCost === 'function') {
                const newResults = calculateCarLifetimeCost(productData, response.preferences);
                this.displayResults(productData, newResults);
                 chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', productData: productData, calculationResults: newResults });
            } else if (typeof calculateLifetimeCost === 'function') {
                const newResults = calculateLifetimeCost(productData, response.preferences);
                this.displayResults(productData, newResults);
                chrome.runtime.sendMessage({ type: 'PRODUCT_DETECTED', productData: productData, calculationResults: newResults });
            }
            return; // Exit if calculator can't be created
        }
        
        // Recalculate based on product type
        let newResults;
        if (productData.productType === 'car') {
            if(typeof calculator.calculateCarLifetimeCost === 'function'){
                 newResults = calculator.calculateCarLifetimeCost(productData);
            } else if (typeof calculateCarLifetimeCost === 'function') {
                 newResults = calculateCarLifetimeCost(productData, response.preferences); // Fallback to global
            } else {
                console.error("calculateCarLifetimeCost method not found on calculator or globally");
                return;
            }
        } else {
            if(typeof calculator.calculateLifetimeCost === 'function'){
                newResults = calculator.calculateLifetimeCost(productData);
            } else if (typeof calculateLifetimeCost === 'function'){
                newResults = calculateLifetimeCost(productData, response.preferences); // Fallback to global
            } else {
                 console.error("calculateLifetimeCost method not found on calculator or globally");
                return;
            }
        }
        
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
// This module is likely used in content.js, so direct export might not be necessary
// if it's instantiated directly there. If it's meant to be a true module,
// consider how it's imported/used in content.js.

// Make sure ResultsUI is available in the global scope if not using modules
if (typeof window !== 'undefined') {
  window.ResultsUI = ResultsUI;
}
