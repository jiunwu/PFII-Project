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
    this.productData = null; // To store productData
    this.calculationResults = null; // To store calculationResults
    this.preferences = null; // To store preferences, if needed for display
  }

  /**
   * Helper to format currency values.
   * @param {number} value - The numeric value to format.
   * @returns {string} Formatted currency string.
   */
  formatCurrency(value) {
    const isCar = this.productData && this.productData.productType === 'car';
    const currencySymbol = isCar ? 'CHF' : '€';
    if (typeof value !== 'number' || isNaN(value)) return `${currencySymbol} 0,00`;
    return `${currencySymbol} ` + value.toFixed(2).replace('.', ',');
  }

  /**
   * Display lifetime cost calculation results on the page
   * @param {Object} productData - Product data
   * @param {Object} calculationResults - Calculation results
   * @param {Object} preferences - User preferences (optional, if needed for display details)
   */
  displayResults(productData, calculationResults, preferences) {
    this.productData = productData; // Store productData
    this.calculationResults = JSON.parse(JSON.stringify(calculationResults)); // Store a deep copy of calculationResults
    if (preferences) {
        this.preferences = preferences; // Store preferences
    }

    // Remove any existing container
    this.removeExistingContainer();
    
    // Create container for our display
    const container = document.createElement('div');
    container.id = this.containerId;
    container.className = 'ltc-container ltc-sidebar'; // Ensure sidebar class is also applied
    
    // Create content
    container.innerHTML = this.createResultsHTML(); // Uses this.productData and this.calculationResults
    
    // Find a good place to insert our container
    this.insertContainer(container);
    
    // Add event listeners
    this.addEventListeners(); // Uses this.productData and this.calculationResults
  }

  /**
   * Create HTML for the results display. Relies on this.productData and this.calculationResults.
   * @returns {string} HTML content
   */
  createResultsHTML() {
    if (!this.productData || !this.calculationResults) return '';

    const isCar = this.productData.productType === 'car';
    
    if (isCar) {
      // Ensure all necessary car-specific fields exist in calculationResults, providing defaults if not
      const results = {
        ownershipDuration: this.calculationResults.ownershipDuration || 0,
        totalOwnershipCost: this.calculationResults.totalOwnershipCost || 0,
        monthlyCost: this.calculationResults.monthlyCost || 0,
        purchasePrice: this.calculationResults.purchasePrice || 0,
        depreciationCost: this.calculationResults.depreciationCost || 0,
        fuelCostNPV: this.calculationResults.fuelCostNPV || 0, // This will be the editable one
        taxCostNPV: this.calculationResults.taxCostNPV || 0,
        insuranceCostNPV: this.calculationResults.insuranceCostNPV || 0,
        maintenanceCostNPV: this.calculationResults.maintenanceCostNPV || 0,
      };

      return `
        <div class="ltc-header">CAR OWNERSHIP COST CALCULATOR</div>
        <div class="ltc-content">
          <div class="ltc-total">
            Total Cost of Ownership (${results.ownershipDuration} years): 
            <span class="ltc-highlight" id="ltc-total-ownership-cost">${this.formatCurrency(results.totalOwnershipCost)}</span>
          </div>
          <div class="ltc-monthly">
            Monthly Cost: 
            <span class="ltc-highlight" id="ltc-monthly-cost">${this.formatCurrency(results.monthlyCost)}</span>
          </div>
          <div class="ltc-breakdown">
            <div class="ltc-breakdown-title">Breakdown:</div>
            <div class="ltc-breakdown-item">
              • Purchase Price: ${this.formatCurrency(results.purchasePrice)}
            </div>
            <div class="ltc-breakdown-item">
              • Depreciation: ${this.formatCurrency(results.depreciationCost)}
            </div>
            <div class="ltc-breakdown-item ltc-editable-item">
              • Fuel Cost (NPV): 
              <input type="number" 
                     id="ltc-editable-fuel-cost-npv" 
                     class="ltc-editable-field" 
                     value="${results.fuelCostNPV.toFixed(2)}" 
                     step="1.00" 
                     aria-label="Editable Fuel Cost NPV">
              <span class="ltc-currency-symbol">${isCar ? 'CHF' : '€'}</span>
            </div>
            <div class="ltc-breakdown-item">
              • Tax (NPV): ${this.formatCurrency(results.taxCostNPV)}
            </div>
            <div class="ltc-breakdown-item">
              • Insurance (NPV): ${this.formatCurrency(results.insuranceCostNPV)}
            </div>
            <div class="ltc-breakdown-item">
              • Maintenance (NPV): ${this.formatCurrency(results.maintenanceCostNPV)}
            </div>
          </div>
          <div class="ltc-car-info">
            ${this.productData.year} ${this.productData.name} • ${this.productData.mileage} km • ${this.productData.fuelType}
            <br>
            Fuel Consumption: ${this.productData.fuelConsumption} ${this.productData.fuelType === 'electric' ? 'kWh/100km' : 'L/100km'}
          </div>
          <button class="ltc-details-button">Show Calculation Details</button>
          <button class="ltc-save-button">Save This Car</button>
        </div>
      `;
    } else {
      // Ensure all necessary appliance fields exist
      const results = {
        lifespan: this.calculationResults.lifespan || 0,
        totalLifetimeCost: this.calculationResults.totalLifetimeCost || 0,
        purchasePrice: this.calculationResults.purchasePrice || 0,
        energyCostNPV: this.calculationResults.energyCostNPV || 0,
        maintenanceCostNPV: this.calculationResults.maintenanceCostNPV || 0,
        annualEnergyConsumption: this.calculationResults.annualEnergyConsumption || 0,
        energyEfficiencyClass: this.calculationResults.energyEfficiencyClass || 'N/A',
      };
      return `
      <div class="ltc-header">LIFETIME COST CALCULATOR</div>
      <div class="ltc-content">
        <div class="ltc-total">
          Total Cost of Ownership (${results.lifespan} years): 
          <span class="ltc-highlight">${this.formatCurrency(results.totalLifetimeCost)}</span>
        </div>
        
        <div class="ltc-breakdown">
          <div class="ltc-breakdown-title">Breakdown:</div>
          <div class="ltc-breakdown-item">
            • Purchase Price: ${this.formatCurrency(results.purchasePrice)}
          </div>
          <div class="ltc-breakdown-item">
            • Energy Cost (NPV): ${this.formatCurrency(results.energyCostNPV)}
          </div>
          <div class="ltc-breakdown-item">
            • Maintenance (NPV): ${this.formatCurrency(results.maintenanceCostNPV)}
          </div>
        </div>
        
        <div class="ltc-energy-info">
          Annual Energy Consumption: ${results.annualEnergyConsumption} kWh
          <br>
          Energy Efficiency Class: ${results.energyEfficiencyClass}
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
   * Add event listeners to the UI elements. Relies on this.productData and this.calculationResults.
   */
  addEventListeners() {
    if (!this.productData || !this.calculationResults) return;

    const detailsButton = document.querySelector(`#${this.containerId} .ltc-details-button`);
    if (detailsButton) {
      detailsButton.addEventListener('click', () => {
        this.showDetailsModal(); // Uses internal data
      });
    }

    const saveButton = document.querySelector(`#${this.containerId} .ltc-save-button`);
    if (saveButton) {
        saveButton.addEventListener('click', () => {
            if (typeof saveProduct === 'function') {
                saveProduct(this.productData, this.calculationResults); // Use internal data
            } else {
                console.error('saveProduct function not found.');
                // Fallback save
                const productToSave = {
                    ...this.productData,
                    calculationResults: this.calculationResults,
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

    // Event listener for editable fuel cost NPV field (only if it's a car)
    if (this.productData.productType === 'car') {
        const fuelCostInput = document.getElementById('ltc-editable-fuel-cost-npv');
        if (fuelCostInput) {
            fuelCostInput.addEventListener('input', (event) => {
                const newFuelCostNPV = parseFloat(event.target.value);
                if (!isNaN(newFuelCostNPV) && newFuelCostNPV >= 0) {
                    this.recalculateAndUpdateDisplay(newFuelCostNPV);
                } else if (event.target.value === '') {
                    // Handle empty input as 0 or revert to original, for now let's use 0
                    this.recalculateAndUpdateDisplay(0);
                } 
            });
             fuelCostInput.addEventListener('blur', (event) => { // Format on blur
                const value = parseFloat(event.target.value);
                if (!isNaN(value)) {
                    event.target.value = value.toFixed(2);
                }
            });
        }
    }
    
    // Listen for messages from popup
    chrome.runtime.onMessage.addListener((message) => {
      if (!this.productData) return; // Don't act if no product context
      if (message.type === 'SHOW_DETAILS') {
        this.showDetailsModal();
      }
      
      if (message.type === 'PREFERENCES_UPDATED') {
        this.handlePreferencesUpdate();
      }
    });
  }

  /**
   * Recalculate total and monthly costs based on a new fuel cost NPV and update the display.
   * @param {number} newFuelCostNPV - The new fuel cost NPV from user input.
   */
  recalculateAndUpdateDisplay(newFuelCostNPV) {
    if (!this.calculationResults || this.productData.productType !== 'car') return;

    this.calculationResults.fuelCostNPV = newFuelCostNPV;

    // Recalculate total ownership cost
    // totalOwnershipCost = totalDepreciation + fuelCostNPV + taxNPV + insuranceNPV + maintenanceNPV;
    this.calculationResults.totalOwnershipCost = 
        (this.calculationResults.depreciationCost || 0) +
        newFuelCostNPV + 
        (this.calculationResults.taxCostNPV || 0) + 
        (this.calculationResults.insuranceCostNPV || 0) + 
        (this.calculationResults.maintenanceCostNPV || 0);

    // Recalculate monthly cost
    if (this.calculationResults.ownershipDuration && this.calculationResults.ownershipDuration > 0) {
        this.calculationResults.monthlyCost = this.calculationResults.totalOwnershipCost / (this.calculationResults.ownershipDuration * 12);
    } else {
        this.calculationResults.monthlyCost = 0; // Avoid division by zero
    }

    this.updateDisplayedCosts();
  }

  /**
   * Update the displayed total and monthly costs in the UI.
   */
  updateDisplayedCosts() {
    if (!this.calculationResults || this.productData.productType !== 'car') return;

    const totalCostEl = document.getElementById('ltc-total-ownership-cost');
    if (totalCostEl) {
        totalCostEl.textContent = this.formatCurrency(this.calculationResults.totalOwnershipCost);
    }

    const monthlyCostEl = document.getElementById('ltc-monthly-cost');
    if (monthlyCostEl) {
        monthlyCostEl.textContent = this.formatCurrency(this.calculationResults.monthlyCost);
    }
    
    // If modal is open, update its chart (or relevant parts)
    const modal = document.getElementById(this.modalId);
    if (modal && modal.style.display !== 'none') {
        // For now, just re-render the chart. More granular updates could be done.
        this.createCostChart(); 
    }
  }

  /**
   * Show detailed calculation information in a modal
   */
  showDetailsModal() {
    if (!this.productData || !this.calculationResults) return;
    this.removeExistingModal();
    const modal = document.createElement('div');
    modal.id = this.modalId;
    modal.className = 'ltc-modal';
    
    const isCar = this.productData.productType === 'car';
    // currencySymbol is now derived within this.formatCurrency
    
    let modalHTML = '';
    if (isCar) {
        // Use this.calculationResults which includes the potentially edited fuelCostNPV
        const results = this.calculationResults;
        const product = this.productData;
        modalHTML = `
        <div class="ltc-modal-content">
          <span class="ltc-modal-close">&times;</span>
          <h2>Car Ownership Cost Calculation Details</h2>
          <h3>Car Information</h3>
          <p>
            <strong>Make/Model:</strong> ${product.name}<br>
            <strong>Year:</strong> ${product.year} (Age: ${results.carDetails ? results.carDetails.age : 'N/A'} years)<br>
            <strong>Mileage:</strong> ${product.mileage} km<br>
            <strong>Fuel Type:</strong> ${product.fuelType}<br>
            <strong>Fuel Consumption:</strong> ${product.fuelConsumption} ${product.fuelType === 'electric' ? 'kWh/100km' : 'L/100km'}<br>
            <strong>Engine Size:</strong> ${product.engineSize || 'Unknown'}<br>
            <strong>Transmission:</strong> ${product.transmission || 'Unknown'}
          </p>
          <h3>Annual Costs</h3>
          <p>
            <strong>Depreciation:</strong> ${this.formatCurrency(results.annualDepreciation)}/year<br>
            <strong>Fuel:</strong> ${this.formatCurrency(results.annualFuelCost)}/year<br>
            <strong>Tax:</strong> ${this.formatCurrency(results.annualTax)}/year<br>
            <strong>Insurance:</strong> ${this.formatCurrency(results.annualInsurance)}/year<br>
            <strong>Maintenance:</strong> ${this.formatCurrency(results.annualMaintenanceCost)}/year
          </p>
          <h3>Total Costs (${results.ownershipDuration} years)</h3>
          <p>
            <strong>Purchase Price:</strong> ${this.formatCurrency(results.purchasePrice)}<br>
            <strong>Depreciation:</strong> ${this.formatCurrency(results.depreciationCost)}<br>
            <strong>Fuel (NPV):</strong> ${this.formatCurrency(results.fuelCostNPV)} <!-- Reflects edited value -->
            <br>
            <strong>Tax (NPV):</strong> ${this.formatCurrency(results.taxCostNPV)}<br>
            <strong>Insurance (NPV):</strong> ${this.formatCurrency(results.insuranceCostNPV)}<br>
            <strong>Maintenance (NPV):</strong> ${this.formatCurrency(results.maintenanceCostNPV)}<br>
            <strong>Total Ownership Cost:</strong> ${this.formatCurrency(results.totalOwnershipCost)}<br>
            <strong>Monthly Cost:</strong> ${this.formatCurrency(results.monthlyCost)}
          </p>
          <div id="${this.chartId}" class="ltc-chart"></div>
          <p class="ltc-note">
            Note: All future costs are calculated using Net Present Value (NPV).
            Discount rate: ${( (this.preferences ? this.preferences.discountRate : null) || results.discountRate || 0.02) * 100}%. 
            User-edited fields may affect overall NPV accuracy if other components are not also NPV.
          </p>
        </div>
      `;
    } else {
        const results = this.calculationResults;
        const product = this.productData;
        modalHTML = `
      <div class="ltc-modal-content">
        <span class="ltc-modal-close">&times;</span>
        <h2>Lifetime Cost Calculation Details</h2>
        <h3>Product Information</h3>
        <p>
          <strong>Name:</strong> ${product.name}<br>
          <strong>Price:</strong> ${this.formatCurrency(results.purchasePrice)}<br>
          <strong>Energy Consumption:</strong> ${results.annualEnergyConsumption} kWh/year<br>
          <strong>Energy Efficiency Class:</strong> ${results.energyEfficiencyClass}<br>
          <strong>Expected Lifespan:</strong> ${results.lifespan} years
        </p>
        <h3>Energy Costs</h3>
        <p>
          <strong>Annual Energy Cost:</strong> ${this.formatCurrency(results.annualEnergyCost)}<br>
          <strong>Total Energy Cost (NPV):</strong> ${this.formatCurrency(results.energyCostNPV)}
        </p>
        <h3>Maintenance Costs</h3>
        <p>
            <strong>Average Repair Cost Used:</strong> ${this.formatCurrency(results.averageRepairCostUsed)}<br>
            <strong>Expected Number of Repairs:</strong> ${results.numRepairsUsed}<br>
            <strong>Data Source:</strong> ${results.maintenanceDataSource}<br>
            <strong>Total Maintenance Cost (NPV):</strong> ${this.formatCurrency(results.maintenanceCostNPV)}
        </p>
        <h3>Total Lifetime Cost</h3>
        <p>
          <strong>Purchase Price:</strong> ${this.formatCurrency(results.purchasePrice)}<br>
          <strong>Energy Cost (NPV):</strong> ${this.formatCurrency(results.energyCostNPV)}<br>
          <strong>Maintenance Cost (NPV):</strong> ${this.formatCurrency(results.maintenanceCostNPV)}<br>
          <strong>Total Lifetime Cost:</strong> ${this.formatCurrency(results.totalLifetimeCost)}
        </p>
        <div id="${this.chartId}" class="ltc-chart"></div>
        <p class="ltc-note">
          Note: All future costs are calculated using Net Present Value (NPV).
          Discount rate: ${((this.preferences ? this.preferences.discountRate : null) || results.discountRate || 0.02) * 100}%. 
        </p>
      </div>
    `;
    }
    modal.innerHTML = modalHTML;
    document.body.appendChild(modal);
    this.createCostChart(); // Uses internal data
    
    const closeButton = modal.querySelector('.ltc-modal-close');
    closeButton.addEventListener('click', () => {
      document.body.removeChild(modal);
    });
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        document.body.removeChild(modal);
      }
    });
  }

  /**
   * Create a chart visualizing the cost breakdown
   */
  createCostChart() {
    if (!this.productData || !this.calculationResults) return;
    const chartContainer = document.getElementById(this.chartId);
    if (!chartContainer) return;
    
    const isCar = this.productData.productType === 'car';
    const results = this.calculationResults; // Use the potentially updated results

    let chartHTML = '';

    if (isCar) {
        const total = results.totalOwnershipCost;
        // Ensure total is not zero to prevent division by zero errors for percentages
        const safeTotal = total || 1; 
        const purchasePercentage = (results.purchasePrice / safeTotal) * 100;
        const depreciationPercentage = (results.depreciationCost / safeTotal) * 100;
        const fuelPercentage = (results.fuelCostNPV / safeTotal) * 100; // Reflects edited value
        const taxPercentage = (results.taxCostNPV / safeTotal) * 100;
        const insurancePercentage = (results.insuranceCostNPV / safeTotal) * 100;
        const maintenancePercentage = (results.maintenanceCostNPV / safeTotal) * 100;

        chartHTML = `
        <div class="ltc-chart-title">Car Cost Breakdown</div>
        <div class="ltc-chart-container">
            <div class="ltc-chart-bar">
            <div class="ltc-chart-segment ltc-purchase" style="width: ${purchasePercentage.toFixed(1)}%;" title="Purchase Price: ${this.formatCurrency(results.purchasePrice)}"></div>
            <div class="ltc-chart-segment ltc-depreciation" style="width: ${depreciationPercentage.toFixed(1)}%;" title="Depreciation: ${this.formatCurrency(results.depreciationCost)}"></div>
            <div class="ltc-chart-segment ltc-fuel" style="width: ${fuelPercentage.toFixed(1)}%;" title="Fuel Cost: ${this.formatCurrency(results.fuelCostNPV)}"></div>
            <div class="ltc-chart-segment ltc-tax" style="width: ${taxPercentage.toFixed(1)}%;" title="Tax: ${this.formatCurrency(results.taxCostNPV)}"></div>
            <div class="ltc-chart-segment ltc-insurance" style="width: ${insurancePercentage.toFixed(1)}%;" title="Insurance: ${this.formatCurrency(results.insuranceCostNPV)}"></div>
            <div class="ltc-chart-segment ltc-maintenance" style="width: ${maintenancePercentage.toFixed(1)}%;" title="Maintenance Cost: ${this.formatCurrency(results.maintenanceCostNPV)}"></div>
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
        const total = results.totalLifetimeCost;
        const safeTotal = total || 1;
        const purchasePercentage = (results.purchasePrice / safeTotal) * 100;
        const energyPercentage = (results.energyCostNPV / safeTotal) * 100;
        const maintenancePercentage = (results.maintenanceCostNPV / safeTotal) * 100;
        
        chartHTML = `
        <div class="ltc-chart-title">Appliance Cost Breakdown</div>
      <div class="ltc-chart-container">
        <div class="ltc-chart-bar">
          <div class="ltc-chart-segment ltc-purchase" style="width: ${purchasePercentage.toFixed(1)}%;" title="Purchase Price: ${this.formatCurrency(results.purchasePrice)}"></div>
          <div class="ltc-chart-segment ltc-energy" style="width: ${energyPercentage.toFixed(1)}%;" title="Energy Cost: ${this.formatCurrency(results.energyCostNPV)}"></div>
          <div class="ltc-chart-segment ltc-maintenance" style="width: ${maintenancePercentage.toFixed(1)}%;" title="Maintenance Cost: ${this.formatCurrency(results.maintenanceCostNPV)}"></div>
            </div>
      </div>
      <div class="ltc-chart-legend">
        <div class="ltc-legend-item"><div class="ltc-legend-color ltc-purchase"></div><div class="ltc-legend-label">Purchase (${Math.round(purchasePercentage)}%)</div></div>
        <div class="ltc-legend-item"><div class="ltc-legend-color ltc-energy"></div><div class="ltc-legend-label">Energy (${Math.round(energyPercentage)}%)</div></div>
        <div class="ltc-legend-item"><div class="ltc-legend-color ltc-maintenance"></div><div class="ltc-legend-label">Maintenance (${Math.round(maintenancePercentage)}%)</div></div>
      </div>
    `;
    }
    chartContainer.innerHTML = chartHTML;
  }

  /**
   * Handle preferences update by recalculating and updating the display
   */
  handlePreferencesUpdate() {
    if (!this.productData) return;
    chrome.runtime.sendMessage({ type: 'GET_PREFERENCES' }, (response) => {
      if (response && response.preferences) {
        this.preferences = response.preferences; // Store/update preferences
        
        // Decide which calculation function to call based on productType
        // This assumes calculateCarLifetimeCost and calculateLifetimeCost are available globally (in content.js)
        let newResults;
        if (this.productData.productType === 'car') {
          if (typeof calculateCarLifetimeCost === 'function') {
            newResults = calculateCarLifetimeCost(this.productData, this.preferences);
          } else {
            console.error("calculateCarLifetimeCost function is not defined."); return;
          }
        } else {
          if (typeof calculateLifetimeCost === 'function') {
            newResults = calculateLifetimeCost(this.productData, this.preferences);
          } else {
            console.error("calculateLifetimeCost function is not defined."); return;
          }
        }
        
        // Update the display with new results
        this.displayResults(this.productData, newResults, this.preferences);
        
        // Notify background script about the update
        chrome.runtime.sendMessage({ 
          type: 'PRODUCT_DETECTED',
          productData: this.productData,
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
