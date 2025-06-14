// content.js - Content script for Lifetime Cost Calculator Extension
console.log('Lifetime Cost Calculator: Content script loaded');

// Debug: Log current URL and document title
console.log('Current URL:', window.location.href);
console.log('Document title:', document.title);

// Save product to backend API
async function saveProduct(productData, calculationResults) {
  try {
    // Prepare the data for saving
    const saveData = {
      name: productData.name,
      description: `Product from ${productData.source || 'unknown source'}`,
      product_type: productData.productType,
      price: productData.price,
      material: productData.material,
      quality: calculationResults?.quality,
      lifespan: calculationResults?.lifespan,
      annual_cost: calculationResults?.annualCost,
      maintenance_cost_per_year: calculationResults?.maintenanceCostPerYear,
      total_maintenance_cost: calculationResults?.totalMaintenanceCost,
      total_lifetime_cost: calculationResults?.totalLifetimeCost,
      calculation_results: calculationResults
    };

    // Send the data to the backend
    const result = await fetch('https://xcost.tech/api/items', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'include',
      body: JSON.stringify(saveData)
    });

    if (!result.ok) {
      const errorData = await result.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to save product data: ${result.status} ${result.statusText}`);
    }

    // Show success message
    const saveButton = document.querySelector('.ltc-save-button');
    if (saveButton) {
      const originalText = saveButton.textContent;
      saveButton.textContent = 'Saved!';
      saveButton.disabled = true;
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
      }, 2000);
    }

    // Also save to Chrome storage for backup
    const productToSave = {
      ...productData,
      calculationResults,
      savedAt: new Date().toISOString(),
      url: window.location.href
    };
    chrome.storage.sync.get({ savedProducts: [] }, (result) => {
      const savedProducts = result.savedProducts;
      savedProducts.push(productToSave);
      chrome.storage.sync.set({ savedProducts });
    });
  } catch (error) {
    console.error('Error saving product data:', error);
    // Show error message
    const saveButton = document.querySelector('.ltc-save-button');
    if (saveButton) {
      const originalText = saveButton.textContent;
      saveButton.textContent = error.message.includes('CORS') ? 
        'Network error - please try again' : 
        'Error saving!';
      saveButton.disabled = true;
      setTimeout(() => {
        saveButton.textContent = originalText;
        saveButton.disabled = false;
      }, 2000);
    }
  }
}

// Ensure the content script is initialized (robust for all page states)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initLifetimeCostCalculator();
} else {
  window.addEventListener('DOMContentLoaded', initLifetimeCostCalculator);
}

// Main function to initialize the content script
async function initLifetimeCostCalculator() {
  console.log('initLifetimeCostCalculator called');
  console.log('Lifetime Cost Calculator: Content script initialized');

  try {
    // Check if we're on a product page using function from page_detector.js
    console.log('Checking if current page is a product page...');
    if (await isProductPage()) { // This function is now in page_detector.js
      console.log('Product page detected, extracting data...');

      try {
        // Extract product data from the page using function from data_extractor.js
        const productData = await extractProductData(); // This function is now in data_extractor.js
        console.log('Extracted product data:', productData);

        if (productData) {
          // Get user preferences from storage
          console.log('Getting user preferences...');
          chrome.runtime.sendMessage({ type: 'GET_PREFERENCES' }, (response) => {
            console.log('User preferences received:', response);
            if (response && response.preferences) {
              // Calculate costs based on product type
              let calculationResults;
              console.log('Product type detected:', productData.productType);
              if (productData.productType === 'car' || productData.productType === 'Car') {
                console.log('Calculating car lifetime costs...');
                calculationResults = calculateCarLifetimeCost(productData, response.preferences);
                console.log('Car calculation results:', calculationResults);
              } else {
                console.log('Calculating appliance lifetime costs...');
                calculationResults = calculateLifetimeCost(productData, response.preferences);
                console.log('Appliance calculation results:', calculationResults);
              }

              // Display results on the page
              // Use only displayLifetimeCost for all product types
              displayLifetimeCost(productData, calculationResults);

              // Notify background script that a product was detected
              chrome.runtime.sendMessage({ 
                type: 'PRODUCT_DETECTED',
                productData: productData,
                calculationResults: calculationResults
              });
              
            } else {
              // Handle missing preferences, perhaps by using default calculation or showing an error/prompt.
              console.warn('User preferences not available. Using default calculations or showing minimal info.');
              const fallbackResults = productData.productType === 'car'
                ? calculateCarLifetimeCost(productData, {})
                : {
                    totalLifetimeCost: productData.price,
                    purchasePrice: productData.price,
                    productType: productData.productType || 'clothing'
                  };
              displayLifetimeCost(productData, fallbackResults);
            }
          });
        } else {
          console.log('Could not extract product data');
          chrome.runtime.sendMessage({ type: 'NO_PRODUCT' });
        }
      } catch (extractError) {
        console.error('Error extracting product data:', extractError);
        chrome.runtime.sendMessage({ type: 'ERROR', error: extractError.message });
      }
    } else {
      console.log('Not a product page');
      chrome.runtime.sendMessage({ type: 'NO_PRODUCT' });
    }
  } catch (error) {
    console.error('Error in initLifetimeCostCalculator:', error);
    chrome.runtime.sendMessage({ type: 'ERROR', error: error.message });
  }
}

function showCalculationDetails(productData, calculationResults) {
  // Remove any existing details modal only (not the main modal)
  const existingDetailsModal = document.querySelector('.ltc-modal.ltc-details-modal');
  if (existingDetailsModal) existingDetailsModal.remove();

  // Create modal for detailed information
  const modal = document.createElement('div');
  modal.className = 'ltc-modal ltc-details-modal';
  modal.style.position = 'fixed';
  modal.style.top = '200px';
  modal.style.right = '40px';
  modal.style.left = '';
  modal.style.maxWidth = '420px';
  modal.style.minWidth = '320px';
  modal.style.width = '420px';
  modal.style.boxSizing = 'border-box';
  modal.style.background = '#fff';
  modal.style.border = 'none';
  modal.style.borderRadius = '12px';
  modal.style.boxShadow = '0 4px 16px rgba(25, 118, 210, 0.12)';
  modal.style.zIndex = '1000001';
  modal.style.height = 'fit-content';

  // Format currency values
  const formatCurrency = (value) => {
    return '€' + value.toFixed(2).replace('.', ',');
  };

  // Add offers section based on product type
  let offersSection = '';
  if (productData.productType === 'car' || productData.productType === 'Car') {
    offersSection = `
      <h3>Bank Financing Offers</h3>
      <ul style="margin-bottom:16px;">
        <li><strong>UBS DriveCar Loan:</strong> 4.5% APR, up to 60 months - <a href="#" target="_blank">Apply now</a></li>
        <li><strong>Credit Suisse AutoCredit:</strong> 3.9% APR, up to 72 months - <a href="#" target="_blank">See details</a></li>
      </ul>
      <h3>Insurance Offers</h3>
      <ul>
        <li><strong>AXA SmartCar Insurance:</strong> Full coverage from 39€/month - <a href="#" target="_blank">Get quote</a></li>
        <li><strong>Zurich CarProtect:</strong> Liability + Theft from 32€/month - <a href="#" target="_blank">Get quote</a></li>
      </ul>
    `;
  } else {
    // Appliance offers
    offersSection = `
      <h3>Extended Warranty Options</h3>
      <ul style="margin-bottom:16px;">
        <li><strong>MediaMarkt Service+:</strong> 3-year extended warranty from €49 - <a href="#" target="_blank">Get quote</a></li>
        <li><strong>Saturn Care:</strong> 5-year full protection from €89 - <a href="#" target="_blank">Learn more</a></li>
      </ul>
      <h3>Energy Efficiency Services</h3>
      <ul>
        <li><strong>EWZ EcoCheck:</strong> Free energy audit & optimization tips - <a href="#" target="_blank">Book now</a></li>
        <li><strong>Green Energy Tariff:</strong> 100% renewable energy from €0.18/kWh - <a href="#" target="_blank">Switch now</a></li>
      </ul>
    `;
  }

  // Create content with tabs: Calculation and Offers
  modal.innerHTML = `
    <div class="ltc-modal-content" style="max-width:420px;min-width:320px;width:100%;box-sizing:border-box;padding:0;margin:0;">
      <div class="ltc-modal-titlebar" style="cursor:pointer;font-weight:bold;font-size:1.1em;padding:14px 24px 14px 24px;user-select:none;background:#f5f7fa;border-radius:10px 10px 0 0;min-height:48px;display:flex;align-items:center;">Lifetime Cost Analysis</div>
      <div class="ltc-modal-tabs" style="display:flex;border-bottom:1px solid #e0e4ea;background:#f8fafc;">
        <div class="ltc-tab ltc-tab-calc active" style="flex:1;text-align:center;padding:10px 0;cursor:pointer;font-weight:500;">Calculation</div>
        <div class="ltc-tab ltc-tab-offers" style="flex:1;text-align:center;padding:10px 0;cursor:pointer;font-weight:500;">Offers</div>
      </div>
      <div class="ltc-modal-body ltc-tab-calc-body" style="padding:20px 24px 18px 24px;">
        <!-- Product Information -->
        <div class="ltc-section" style="margin-bottom:20px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div style="grid-column:1/-1;"><strong>${productData.name || 'N/A'}</strong></div>
          ${productData.productType === 'car' ? `
            <p class="ltc-item" style="margin:0;"><strong>Make:</strong> ${calculationResults.make || 'N/A'}</p>
            <p class="ltc-item" style="margin:0;"><strong>Model:</strong> ${calculationResults.model || 'N/A'}</p>
            <p class="ltc-item" style="margin:0;"><strong>Year:</strong> ${calculationResults.year || 'N/A'}</p>
            <p class="ltc-item" style="margin:0;"><strong>Mileage:</strong> ${calculationResults.mileage !== undefined ? calculationResults.mileage.toLocaleString() + ' km' : 'N/A'}</p>
            <p class="ltc-item" style="margin:0;"><strong>Fuel:</strong> ${calculationResults.fuelType || 'N/A'}</p>
            <p class="ltc-item" style="margin:0;"><strong>Consumption:</strong> ${calculationResults.fuelConsumption !== undefined ? calculationResults.fuelConsumption + ' l/100km' : 'N/A'}</p>
          ` : `
            <p class="ltc-item" style="margin:0;"><strong>Product Type:</strong> ${productData.productType ? productData.productType.charAt(0).toUpperCase() + productData.productType.slice(1) : 'Appliance'}</p>
            <p class="ltc-item" style="margin:0;"><strong>Energy Class:</strong> ${calculationResults.energyEfficiencyClass || 'N/A'}</p>
            <p class="ltc-item" style="margin:0;"><strong>Annual Energy:</strong> ${calculationResults.annualEnergyConsumption || 'N/A'} kWh</p>
            <p class="ltc-item" style="margin:0;"><strong>Lifespan:</strong> ${calculationResults.lifespan || 'N/A'} years</p>
          `}
        </div>

        ${productData.productType === 'car' ? `
        <!-- Purchase and Depreciation (Cars only) -->
        <div class="ltc-section" style="margin-bottom:20px;padding:12px;background:#f5f7fa;border-radius:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <p class="ltc-item" style="margin:0;"><strong>Purchase Price:</strong><br/>${formatCurrency(calculationResults.purchasePrice)}</p>
            <p class="ltc-item" style="margin:0;"><strong>Resale Value:</strong><br/>${formatCurrency(calculationResults.estimatedResaleValue)}</p>
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e4ea;">
            <p class="ltc-item" style="margin:0;"><strong>Total Depreciation:</strong> ${formatCurrency(calculationResults.depreciationCost)}</p>
          </div>
        </div>

        <!-- Annual Running Costs (Cars only) -->
        <div class="ltc-section" style="margin-bottom:20px;padding:12px;background:#f8fafc;border-radius:8px;">
          <h4 style="margin:0 0 8px 0;font-size:1em;">Annual Running Costs</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <p class="ltc-item" style="margin:0;"><strong>Fuel:</strong><br/>${formatCurrency(calculationResults.annualFuelCost)}</p>
            <p class="ltc-item" style="margin:0;"><strong>Insurance:</strong><br/>${formatCurrency(calculationResults.annualInsuranceCost)}</p>
            <p class="ltc-item" style="margin:0;"><strong>Tax:</strong><br/>${formatCurrency(calculationResults.annualTaxCost)}</p>
            <p class="ltc-item" style="margin:0;"><strong>Maintenance:</strong><br/>${formatCurrency(calculationResults.annualMaintenanceCost)}</p>
          </div>
        </div>

        <!-- Total Cost Summary (Cars) -->
        <div class="ltc-section" style="padding:12px;background:#f5f7fa;border-radius:8px;margin-bottom:16px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
            <p class="ltc-item" style="margin:0;"><strong>Total Running Costs:</strong><br/>${formatCurrency(calculationResults.totalRunningCostsNPV)}</p>
            <p class="ltc-item" style="margin:0;"><strong>Total Ownership:</strong><br/>${formatCurrency(calculationResults.totalLifetimeCost)}</p>
          </div>
          <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e4ea;text-align:center;">
            <p class="ltc-item ltc-total-cost" style="margin:0;font-size:1.1em;"><strong>Estimated Monthly Cost:</strong> ${formatCurrency(calculationResults.monthlyCost)}</p>
          </div>
        </div>
        ` : `
        <!-- Cost Breakdown (Appliances) -->
        <div class="ltc-section" style="margin-bottom:20px;padding:12px;background:#f5f7fa;border-radius:8px;">
          <h4 style="margin:0 0 8px 0;font-size:1em;">Cost Breakdown</h4>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <p class="ltc-item" style="margin:0;"><strong>Purchase Price:</strong><br/>${formatCurrency(calculationResults.purchasePrice)}</p>
            <p class="ltc-item" style="margin:0;"><strong>Annual Energy Cost:</strong><br/>${formatCurrency(calculationResults.annualEnergyCost || 0)}</p>
            <p class="ltc-item" style="margin:0;"><strong>Energy Cost (NPV):</strong><br/>${formatCurrency(calculationResults.energyCostNPV || 0)}</p>
            <p class="ltc-item" style="margin:0;"><strong>Maintenance (NPV):</strong><br/>${formatCurrency(calculationResults.maintenanceCostNPV || 0)}</p>
          </div>
        </div>

        <!-- Total Cost Summary (Appliances) -->
        <div class="ltc-section" style="padding:12px;background:#f8fafc;border-radius:8px;margin-bottom:16px;">
          <div style="text-align:center;">
            <p class="ltc-item ltc-total-cost" style="margin:0;font-size:1.2em;"><strong>Total Lifetime Cost:</strong><br/>${formatCurrency(calculationResults.totalLifetimeCost)}</p>
            <p style="margin:8px 0 0 0;font-size:0.9em;color:#666;">over ${calculationResults.lifespan || 'N/A'} years</p>
          </div>
        </div>
        `}

        <button class="ltc-save-button" style="width:100%;padding:8px;margin-top:8px;">${productData.productType === 'car' ? 'Save This Car' : 'Save This Product'}</button>
      </div>
      <div class="ltc-modal-body ltc-tab-offers-body" style="display:none;padding:24px 24px 18px 24px;">
        <div class="ltc-offers-section" style="background:#f8fafc;padding:14px 16px 10px 16px;border-radius:8px;margin:0;">
          ${offersSection}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Tab switching logic
  const tabCalc = modal.querySelector('.ltc-tab-calc');
  const tabOffers = modal.querySelector('.ltc-tab-offers');
  const bodyCalc = modal.querySelector('.ltc-tab-calc-body');
  const bodyOffers = modal.querySelector('.ltc-tab-offers-body');
  tabCalc.addEventListener('click', function() {
    tabCalc.classList.add('active');
    tabOffers.classList.remove('active');
    bodyCalc.style.display = '';
    bodyOffers.style.display = 'none';
  });
  tabOffers.addEventListener('click', function() {
    tabOffers.classList.add('active');
    tabCalc.classList.remove('active');
    bodyOffers.style.display = '';
    bodyCalc.style.display = 'none';
  });

  // Make modal draggable (except titlebar folds/expands)
  let isDragging = false, dragOffsetX = 0, dragOffsetY = 0;
  modal.addEventListener('mousedown', function(e) {
    if (e.target.classList.contains('ltc-modal-titlebar')) return; // Don't drag on titlebar
    isDragging = true;
    dragOffsetX = e.clientX - modal.getBoundingClientRect().left;
    dragOffsetY = e.clientY - modal.getBoundingClientRect().top;
    document.body.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    modal.style.top = (e.clientY - dragOffsetY) + 'px';
    modal.style.right = '';
    modal.style.left = (e.clientX - dragOffsetX) + 'px';
  });
  document.addEventListener('mouseup', function() {
    isDragging = false;
    document.body.style.userSelect = '';
  });

  // Fold/unfold on titlebar click (only hide/show body, never cut title)
  const titlebar = modal.querySelector('.ltc-modal-titlebar');
  const body = modal.querySelector('.ltc-modal-body');
  let folded = false;
  titlebar.addEventListener('click', function() {
    folded = !folded;
    if (folded) {
      body.style.display = 'none';
      titlebar.style.borderRadius = '10px';
    } else {
      body.style.display = '';
      titlebar.style.borderRadius = '10px 10px 0 0';
    }
  });

  // Save button handler
  const saveButton = modal.querySelector('.ltc-save-button');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        await saveProduct(productData, calculationResults);
      } catch (error) {
        console.error('Error in save button handler:', error);
      }
    });
  }
}

function displayLifetimeCost(productData, calculationResults) {
  // Use the shared UI from results_ui.js if available
  if (typeof window.displayLifetimeCost === 'function' && window.displayLifetimeCost !== displayLifetimeCost) {
    window.displayLifetimeCost(productData, calculationResults);
    return;
  }

  // Fallback: legacy display (should not be used if results_ui.js is loaded)
  // Render as a modal, not a static card
  const modal = document.createElement('div');
  modal.className = 'ltc-modal';
  modal.style.position = 'fixed';
  modal.style.top = '160px';
  modal.style.right = '40px';
  modal.style.maxWidth = '380px';
  modal.style.minWidth = '320px';
  modal.style.width = '380px';
  modal.style.boxSizing = 'border-box';
  modal.style.background = '#fff';
  modal.style.border = 'none';
  modal.style.borderRadius = '12px';
  modal.style.boxShadow = '0 4px 16px rgba(25, 118, 210, 0.12)';
  modal.style.zIndex = '1000001';
  modal.style.height = 'fit-content';

  // Add offers section for cars
  let offersSection = '';
  if (productData.productType === 'car' || productData.productType === 'Car') {
    offersSection = `
      <h3>Bank Financing Offers</h3>
      <ul style="margin-bottom:16px;">
        <li><strong>UBS DriveCar Loan:</strong> 4.5% APR, up to 60 months - <a href="#" target="_blank">Apply now</a></li>
        <li><strong>Credit Suisse AutoCredit:</strong> 3.9% APR, up to 72 months - <a href="#" target="_blank">See details</a></li>
      </ul>
      <h3>Insurance Offers</h3>
      <ul>
        <li><strong>AXA SmartCar Insurance:</strong> Full coverage from 39€/month - <a href="#" target="_blank">Get quote</a></li>
        <li><strong>Zurich CarProtect:</strong> Liability + Theft from 32€/month - <a href="#" target="_blank">Get quote</a></li>
      </ul>
    `;
  } else {
    // Appliance offers
    offersSection = `
      <h3>Extended Warranty Options</h3>
      <ul style="margin-bottom:16px;">
        <li><strong>MediaMarkt Service+:</strong> 3-year extended warranty from €49 - <a href="#" target="_blank">Get quote</a></li>
        <li><strong>Saturn Care:</strong> 5-year full protection from €89 - <a href="#" target="_blank">Learn more</a></li>
      </ul>
      <h3>Energy Efficiency Services</h3>
      <ul>
        <li><strong>EWZ EcoCheck:</strong> Free energy audit & optimization tips - <a href="#" target="_blank">Book now</a></li>
        <li><strong>Green Energy Tariff:</strong> 100% renewable energy from €0.18/kWh - <a href="#" target="_blank">Switch now</a></li>
      </ul>
    `;
  }

  // Create content with tabs
  modal.innerHTML = `
    <div class="ltc-modal-content" style="box-sizing:border-box;padding:0;margin:0;">
      <div class="ltc-modal-titlebar" style="cursor:pointer;font-weight:bold;font-size:1.1em;padding:12px 16px;user-select:none;background:#f5f7fa;border-radius:10px 10px 0 0;min-height:44px;display:flex;align-items:center;">
        <div style="flex:1;">Lifetime Cost Analysis</div>
        ${calculationResults.monthlyCost ? `
          <div class="ltc-monthly" style="font-size:0.9em;color:#666;">
            <span style="font-weight:normal">Monthly:</span> ${formatCurrency(calculationResults.monthlyCost)}
          </div>
        ` : ''}
      </div>
      
      <div class="ltc-modal-tabs" style="display:flex;border-bottom:1px solid #e0e4ea;background:#f8fafc;">
        <div class="ltc-tab ltc-tab-calc active" style="flex:1;text-align:center;padding:8px 0;cursor:pointer;font-weight:500;">Calculation</div>
        <div class="ltc-tab ltc-tab-offers" style="flex:1;text-align:center;padding:8px 0;cursor:pointer;font-weight:500;">Offers</div>
      </div>

      <div class="ltc-modal-body ltc-tab-calc-body" style="padding:16px;">
        <!-- Product Info & Total Cost Summary -->
        <div class="ltc-section" style="margin-bottom:12px;padding:12px;background:#f5f7fa;border-radius:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">
            <div style="grid-column:1/-1;font-size:1.1em;"><strong>${productData.name || 'N/A'}</strong></div>
            ${productData.productType === 'car' ? `
              <div class="ltc-item"><strong>Make/Model:</strong> ${(calculationResults.make || 'N/A')} ${(calculationResults.model || '')}</div>
              <div class="ltc-item"><strong>Year/Mileage:</strong> ${calculationResults.year || 'N/A'} • ${calculationResults.mileage !== undefined ? calculationResults.mileage.toLocaleString() + ' km' : 'N/A'}</div>
            ` : `
              <div class="ltc-item"><strong>Product Type:</strong> ${productData.productType ? productData.productType.charAt(0).toUpperCase() + productData.productType.slice(1) : 'Appliance'}</div>
              <div class="ltc-item"><strong>Energy Class:</strong> ${calculationResults.energyEfficiencyClass || 'N/A'}</div>
            `}
          </div>
          <div style="font-size:1.2em;text-align:center;margin:8px 0;padding:8px;border-radius:4px;background:#e3f2fd;">
            <strong>Total Cost of Ownership:</strong><br/>
            <span style="font-size:1.3em;color:#1976d2;">${formatCurrency(calculationResults.totalLifetimeCost)}</span><br/>
            <span style="font-size:0.9em;color:#666;">over ${calculationResults.ownershipDuration || calculationResults.lifespan || 'N/A'} years</span>
          </div>
        </div>

        ${productData.productType === 'car' ? `
        <!-- Tabbed Cost Sections (Cars only) -->
        <div class="ltc-section costs-tabs" style="margin-bottom:12px;background:white;border-radius:8px;overflow:hidden;">
          <div style="display:flex;background:#f5f7fa;border-bottom:1px solid #e0e4ea;">
            <div class="ltc-tab ltc-tab-purchase active" style="flex:1;text-align:center;padding:8px;cursor:pointer;font-weight:500;">Purchase</div>
            <div class="ltc-tab ltc-tab-running" style="flex:1;text-align:center;padding:8px;cursor:pointer;font-weight:500;">Running Costs</div>
          </div>

          <!-- Purchase Section -->
          <div class="ltc-section-content ltc-purchase-content" style="padding:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div class="ltc-item">
                <strong>Purchase Price:</strong><br/>
                ${formatCurrency(calculationResults.purchasePrice)}
              </div>
              <div class="ltc-item">
                <strong>Resale Value:</strong><br/>
                ${formatCurrency(calculationResults.estimatedResaleValue)}
              </div>
            </div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e4ea;color:#666;">
              <strong>Net Depreciation:</strong> ${formatCurrency(calculationResults.depreciationCost)}
            </div>
          </div>

          <!-- Running Costs Section -->
          <div class="ltc-section-content ltc-running-content" style="display:none;padding:12px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              <div class="ltc-item">
                <strong>Annual Fuel:</strong><br/>
                ${formatCurrency(calculationResults.annualFuelCost)}
              </div>
              <div class="ltc-item">
                <strong>Annual Insurance:</strong><br/>
                ${formatCurrency(calculationResults.annualInsuranceCost)}
              </div>
              <div class="ltc-item">
                <strong>Annual Tax:</strong><br/>
                ${formatCurrency(calculationResults.annualTaxCost)}
              </div>
              <div class="ltc-item">
                <strong>Annual Maintenance:</strong><br/>
                ${formatCurrency(calculationResults.annualMaintenanceCost)}
              </div>
            </div>
            <div style="margin-top:8px;padding-top:8px;border-top:1px solid #e0e4ea;color:#666;">
              <strong>Total Annual Running:</strong> ${formatCurrency(calculationResults.totalRunningCostsNPV / (calculationResults.ownershipDuration || calculationResults.lifespan))}
            </div>
          </div>
        </div>
        ` : `
        <!-- Cost Breakdown for Appliances -->
        <div class="ltc-section" style="margin-bottom:12px;padding:12px;background:white;border-radius:8px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div class="ltc-item">
              <strong>Purchase Price:</strong><br/>
              ${formatCurrency(calculationResults.purchasePrice)}
            </div>
            <div class="ltc-item">
              <strong>Annual Energy Cost:</strong><br/>
              ${formatCurrency(calculationResults.annualEnergyCost || 0)}
            </div>
            <div class="ltc-item">
              <strong>Energy Cost (NPV):</strong><br/>
              ${formatCurrency(calculationResults.energyCostNPV || 0)}
            </div>
            <div class="ltc-item">
              <strong>Maintenance (NPV):</strong><br/>
              ${formatCurrency(calculationResults.maintenanceCostNPV || 0)}
            </div>
          </div>
        </div>
        `}

        <!-- Vehicle/Appliance specific info -->
        ${productData.productType === 'car' ? `
          <div style="font-size:0.9em;color:#666;margin-bottom:12px;text-align:center;">
            <strong>Fuel Type:</strong> ${calculationResults.fuelType || 'N/A'} • 
            <strong>Consumption:</strong> ${calculationResults.fuelConsumption !== undefined ? calculationResults.fuelConsumption + ' l/100km' : 'N/A'}
          </div>
        ` : `
          <div style="font-size:0.9em;color:#666;margin-bottom:12px;text-align:center;">
            <strong>Annual Energy Consumption:</strong> ${calculationResults.annualEnergyConsumption || 'N/A'} kWh
          </div>
        `}

        <!-- NPV Note -->
        <div style="font-size:0.85em;color:#666;text-align:center;margin-bottom:12px;">
          All future costs are calculated using Net Present Value (NPV)<br/>
          with a ${(calculationResults.discountRate || 0.02) * 100}% discount rate
        </div>

        <button class="ltc-save-button" style="width:100%;padding:8px;background:#1976d2;color:white;border:none;border-radius:4px;cursor:pointer;">
          ${productData.productType === 'car' ? 'Save This Car' : 'Save This Product'}
        </button>
      </div>

      <div class="ltc-modal-body ltc-tab-offers-body" style="display:none;padding:16px;">
        <div class="ltc-offers-section" style="background:#f8fafc;padding:14px 16px;border-radius:8px;margin:0;">
          ${offersSection}
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Tab switching logic - Main tabs (Calculation / Offers)
  const tabCalc = modal.querySelector('.ltc-tab-calc');
  const tabOffers = modal.querySelector('.ltc-tab-offers');
  const bodyCalc = modal.querySelector('.ltc-tab-calc-body');
  const bodyOffers = modal.querySelector('.ltc-tab-offers-body');

  tabCalc.addEventListener('click', () => {
    tabCalc.classList.add('active');
    tabOffers.classList.remove('active');
    bodyCalc.style.display = '';
    bodyOffers.style.display = 'none';
  });

  tabOffers.addEventListener('click', () => {
    tabOffers.classList.add('active');
    tabCalc.classList.remove('active');
    bodyOffers.style.display = '';
    bodyCalc.style.display = 'none';
  });

  // Cost section tabs (Purchase / Running Costs) - only for cars
  if (productData.productType === 'car') {
    const tabPurchase = modal.querySelector('.ltc-tab-purchase');
    const tabRunning = modal.querySelector('.ltc-tab-running');
    const contentPurchase = modal.querySelector('.ltc-purchase-content');
    const contentRunning = modal.querySelector('.ltc-running-content');

    if (tabPurchase && tabRunning && contentPurchase && contentRunning) {
      tabPurchase.addEventListener('click', () => {
        tabPurchase.classList.add('active');
        tabRunning.classList.remove('active');
        contentPurchase.style.display = '';
        contentRunning.style.display = 'none';
      });

      tabRunning.addEventListener('click', () => {
        tabRunning.classList.add('active');
        tabPurchase.classList.remove('active');
        contentRunning.style.display = '';
        contentPurchase.style.display = 'none';
      });
    }
  }

  // Make modal draggable (except titlebar folds/expands)
  let isDragging = false;
  let dragOffsetX = 0;
  let dragOffsetY = 0;

  modal.addEventListener('mousedown', function(e) {
    if (e.target.classList.contains('ltc-modal-titlebar')) return;
    isDragging = true;
    dragOffsetX = e.clientX - modal.getBoundingClientRect().left;
    dragOffsetY = e.clientY - modal.getBoundingClientRect().top;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function(e) {
    if (!isDragging) return;
    modal.style.top = (e.clientY - dragOffsetY) + 'px';
    modal.style.right = '';
    modal.style.left = (e.clientX - dragOffsetX) + 'px';
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
    document.body.style.userSelect = '';
  });

  // Fold/unfold on titlebar click
  const titlebar = modal.querySelector('.ltc-modal-titlebar');
  const body = modal.querySelector('.ltc-modal-body');
  let folded = false;

  titlebar.addEventListener('click', function() {
    folded = !folded;
    if (folded) {
      bodyCalc.style.display = 'none';
      bodyOffers.style.display = 'none';
      modal.querySelector('.ltc-modal-tabs').style.display = 'none';
      titlebar.style.borderRadius = '10px';
    } else {
      const activeTab = modal.querySelector('.ltc-tab.active');
      if (activeTab.classList.contains('ltc-tab-calc')) {
        bodyCalc.style.display = '';
      } else {
        bodyOffers.style.display = '';
      }
      modal.querySelector('.ltc-modal-tabs').style.display = 'flex';
      titlebar.style.borderRadius = '10px 10px 0 0';
    }
  });

  // Save button handler
  const saveButton = modal.querySelector('.ltc-save-button');
  if (saveButton) {
    saveButton.addEventListener('click', async () => {
      try {
        await saveProduct(productData, calculationResults);
      } catch (error) {
        console.error('Error in save button handler:', error);
      }
    });
  }
}

// All other functions (isProductPage, callGeminiAPIForProductData, extractProductData, parsePrice, 
// extractEnergyConsumption, extractEnergyEfficiencyClass, determineProductType, 
// calculateLifetimeCost, calculateCarLifetimeCost, displayCarLifetimeCost, displayLifetimeCost)
// have been moved to their respective modules (page_detector.js, data_extractor.js, 
// utils.js, lifetime_calculator.js, results_ui.js) and are loaded globally via manifest.json.
