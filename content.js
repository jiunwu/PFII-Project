// content.js - Content script for Lifetime Cost Calculator Extension
console.log('Lifetime Cost Calculator: Content script loaded');
// Main function to initialize the content script
async function initLifetimeCostCalculator() {
  console.log('Lifetime Cost Calculator: Content script initialized');

  // Check if we're on a product page
  if (await isProductPage()) {
    console.log('Product page detected, extracting data...');

    // Extract product data from the page
    const productData = await extractProductData();

    if (productData) {
      // Get user preferences from storage
      chrome.runtime.sendMessage({ type: 'GET_PREFERENCES' }, (response) => {
        console.log('User preferences received:', response);
        if (response && response.preferences) {
          // Calculate lifetime costs
          const calculationResults = calculateLifetimeCost(productData, response.preferences);

          // Display results on the page
          displayLifetimeCost(productData, calculationResults);

          // Notify background script that a product was detected
          chrome.runtime.sendMessage({ 
            type: 'PRODUCT_DETECTED',
            productData: productData,
            calculationResults: calculationResults
          });
        }
      });
    } else {
      console.log('Could not extract product data');
      chrome.runtime.sendMessage({ type: 'NO_PRODUCT' });
    }
  } else {
    console.log('Not a product page');
    chrome.runtime.sendMessage({ type: 'NO_PRODUCT' });
  }
}

// Check if the current page is a product page
async function isProductPage() {
  // Check URL pattern
  if (!window.location.href.includes('/product/')) {
    console.log('Not a product page based on URL');
    return false;
  }

  // Use Gemini API to extract product data
  const pageText = document.body.innerText;
  const productData = await callGeminiAPIForProductData(pageText);
  if (!productData) {
    console.log('Gemini API did not return product data');
    return false;
  }
  const productTitleElement = productData.name;
  const priceElement = productData.price;
  console.log('Product title element (Gemini):', productTitleElement);
  console.log('Price element (Gemini):', priceElement);
  if (!productTitleElement || !priceElement) {
    console.log('Product title or price element not found in Gemini API result');
    return false;
  }
  // Store productData for later use
  window._ltcGeminiProductData = productData;
  return true;
}

// Helper to call Gemini API for product data extraction
async function callGeminiAPIForProductData(pageText) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['geminiApiKey'], async function(result) {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        console.error('Gemini API key not set.');
        resolve(null);
        return;
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const prompt = `Extract the following product information from this text (if available):\n- Product name\n- Price (as a number, in euros)\n- Energy consumption (kWh/year)\n- Energy efficiency class (A+++, A++, A+, A, B, C, D, E, F, G)\n- Product type (e.g., refrigerator, washing machine, dishwasher, dryer)\nReturn the result as a JSON object with keys: name, price, energyConsumption, energyEfficiencyClass, productType.\n\nText:\n${pageText}`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        });
        const data = await response.json();
        try {
          // Remove markdown code block markers if present
          let text = data.candidates[0].content.parts[0].text;
          text = text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
          resolve(JSON.parse(text));
        } catch (e) {
          console.error('Gemini API response parsing error:', e, data);
          resolve(null);
        }
      } catch (err) {
        console.error('Error calling Gemini API:', err);
        resolve(null);
      }
    });
  });
}

// Extract product data from the page using Gemini API
async function extractProductData() {
  try {
    const pageText = document.body.innerText;
    const productData = await callGeminiAPIForProductData(pageText);
    if (productData && productData.name && productData.price) {
      console.log('Product data extracted:', productData);
      return productData;
    }
    return null;
  } catch (error) {
    console.error('Error extracting product data with Gemini:', error);
    return null;
  }
}

// Helper function to parse price from text
function parsePrice(priceText) {
  if (!priceText) return null;
  
  // Remove currency symbols and non-numeric characters except decimal point
  const numericString = priceText.replace(/[^0-9,.]/g, '');
  
  // Replace comma with dot for decimal point (European format)
  const normalizedString = numericString.replace(',', '.');
  
  return parseFloat(normalizedString);
}

// Extract energy consumption from Gemini API result
function extractEnergyConsumption() {
  const productData = window._ltcGeminiProductData;
  if (productData && productData.energyConsumption) {
    return productData.energyConsumption;
  }
  return 300; // Fallback default
}

// Extract energy efficiency class from Gemini API result
function extractEnergyEfficiencyClass() {
  const productData = window._ltcGeminiProductData;
  if (productData && productData.energyEfficiencyClass) {
    return productData.energyEfficiencyClass;
  }
  return 'Unknown';
}

// Determine product type based on page content
function determineProductType() {
  const pageText = document.body.textContent.toLowerCase();
  
  if (pageText.includes('kühlschrank') || pageText.includes('refrigerator') || pageText.includes('fridge')) {
    return 'refrigerator';
  } else if (pageText.includes('waschmaschine') || pageText.includes('washing machine')) {
    return 'washingMachine';
  } else if (pageText.includes('geschirrspüler') || pageText.includes('dishwasher')) {
    return 'dishwasher';
  } else if (pageText.includes('trockner') || pageText.includes('dryer')) {
    return 'dryer';
  }
  
  return 'unknown';
}

// Calculate lifetime cost based on product data and user preferences
function calculateLifetimeCost(productData, preferences) {
  // Get relevant preferences
  const electricityRate = preferences.electricityRate;
  const discountRate = preferences.discountRate;
  
  // Determine appliance type and get corresponding lifespan
  const productType = productData.productType || 'refrigerator';
  const lifespan = preferences.applianceLifespans[productType] || 10;
  
  // Get maintenance cost estimates
  const maintenanceInfo = preferences.maintenanceCosts[productType] || {
    averageRepairCost: 350,
    expectedRepairs: 2
  };
  
  // Calculate annual energy cost
  const annualEnergyConsumption = productData.energyConsumption || 300; // kWh/year
  const annualEnergyCost = annualEnergyConsumption * electricityRate;
  
  // Calculate NPV of energy costs over lifespan
  let energyNPV = 0;
  for (let year = 1; year <= lifespan; year++) {
    energyNPV += annualEnergyCost / Math.pow(1 + discountRate, year);
  }
  
  // Calculate NPV of maintenance costs
  // Assume repairs happen at 1/3 and 2/3 of the lifespan
  let maintenanceNPV = 0;
  const repairCost = maintenanceInfo.averageRepairCost;
  const numRepairs = maintenanceInfo.expectedRepairs;
  
  if (numRepairs > 0) {
    for (let i = 1; i <= numRepairs; i++) {
      const repairYear = Math.round(i * lifespan / (numRepairs + 1));
      maintenanceNPV += repairCost / Math.pow(1 + discountRate, repairYear);
    }
  }

  console.log('Maintenance NPV:', maintenanceNPV);
  
  // Calculate total lifetime cost
  const totalLifetimeCost = productData.price + energyNPV + maintenanceNPV;
  
  return {
    purchasePrice: productData.price,
    energyCostNPV: energyNPV,
    maintenanceCostNPV: maintenanceNPV,
    totalLifetimeCost: totalLifetimeCost,
    annualEnergyConsumption: annualEnergyConsumption,
    annualEnergyCost: annualEnergyCost,
    lifespan: lifespan,
    energyEfficiencyClass: productData.energyEfficiencyClass
  };
}

// Display lifetime cost on the page
function displayLifetimeCost(productData, calculationResults) {
  // Create container for our display
  const container = document.createElement('div');
  container.id = 'lifetime-cost-calculator';
  container.className = 'ltc-container';
  
  // Format currency values
  const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      console.error('Invalid value passed to formatCurrency:', value);
      return '€0,00'; // Default fallback
    }
    return '€' + value.toFixed(2).replace('.', ',');
  };
  
  // Create content
  container.innerHTML = `
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
  
  // Find a good place to insert our container
  const targetElement = document.querySelector('.product-details, .product-info, .product-summary');
  if (targetElement) {
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
  
  // Add event listener for the details button
  const detailsButton = container.querySelector('.ltc-details-button');
  detailsButton.addEventListener('click', () => {
    showCalculationDetails(productData, calculationResults);
  });
}

// Show detailed calculation information
function showCalculationDetails(productData, calculationResults) {
  // Create modal for detailed information
  const modal = document.createElement('div');
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
        <strong>Price:</strong> ${formatCurrency(productData.price)}<br>
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
      
      <p class="ltc-note">
        Note: All future costs are calculated using Net Present Value (NPV) to account for the time value of money.
      </p>
    </div>
  `;
  
  // Add modal to page
  document.body.appendChild(modal);
  
  // Add event listener for close button
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

// Initialize the content script
initLifetimeCostCalculator();
