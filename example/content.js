// content.js - Content script for Lifetime Cost Calculator Extension
console.log('Lifetime Cost Calculator: Content script loaded');

// Ensure digitecScraper is defined at the top level
let digitecScraper = null;
if (window.location.hostname.includes('digitec.ch')) {
  if (window.DigitecScraper) {
    digitecScraper = new window.DigitecScraper();
  }
}

// Main function to initialize the content script
async function initLifetimeCostCalculator() {
  console.log('Lifetime Cost Calculator: Content script initialized');

  // Check if we're on a product page
  console.log('Checking if current page is a product page...');
  if (await isProductPage()) {
    console.log('Product page detected, extracting data...');

    // Extract product data from the page
    const productData = await extractProductData();
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
          if (productData.productType === 'car') {
            console.log('Calculating car lifetime costs...');
            calculationResults = calculateCarLifetimeCost(productData, response.preferences);
            console.log('Car calculation results:', calculationResults);
          } else {
            console.log('Calculating appliance lifetime costs...');
            calculationResults = calculateLifetimeCost(productData, response.preferences);
            console.log('Appliance calculation results:', calculationResults);
          }

          // Display results on the page
          if (productData.productType === 'car') {
            console.log('Displaying car lifetime cost...');
            displayCarLifetimeCost(productData, calculationResults);
          } else {
            console.log('Displaying appliance lifetime cost...');
            displayLifetimeCost(productData, calculationResults);
          }

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
  const currentUrl = window.location.href;

  console.log('Checking URL:', currentUrl);
  
  const isTuttiCar = currentUrl.includes('tutti.ch') && 
                     (currentUrl.includes('/auto/') || 
                      currentUrl.includes('/automobili/') || 
                      currentUrl.includes('/autos/'));
  
  console.log('Is tutti.ch car page?', isTuttiCar);
  
  if (!currentUrl.includes('/product/') && 
      !currentUrl.includes('saturn.de') && 
      !isTuttiCar) {
    console.log('Not a product page based on URL');
    return false;
  }else if (currentUrl.includes('digitec.ch')) {
    // Improved: check for product ID in URL and product title element
    const productIdPattern = /-(\d+)(#|$|\?)/;
    const hasProductId = productIdPattern.test(currentUrl);
    const hasProductTitle = document.querySelector('h1[data-testid="product-title"], h1.product-title, .product-title, h1');
    if (!hasProductId || !hasProductTitle) {
      console.log('Not a Digitec product page based on URL or missing product title');
      return false;
    }
    return true;
  }

  console.log('URL pattern matches a product page, checking content...');

  // Use Gemini API to extract product data
  const pageText = document.body.innerText;
  console.log('Page text length for Gemini API:', pageText.length);
  console.log('Calling Gemini API with isCar param:', isTuttiCar);
  
  const productData = await callGeminiAPIForProductData(pageText, isTuttiCar);
  console.log('Gemini API response:', productData);
  
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
  console.log('Stored Gemini product data in window object:', window._ltcGeminiProductData);
  return true;
}

// Helper to call Gemini API for product data extraction
async function callGeminiAPIForProductData(pageText, isCar = false) {
  console.log('Calling Gemini API, isCar flag:', isCar);
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['geminiApiKey'], async function(result) {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        console.error('[LTC DEBUG] Gemini API key not set.');
        resolve(null);
        return;
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      console.log('Using Gemini API URL:', url);
      
      let prompt;
      if (isCar) {
        console.log('Creating car-specific Gemini prompt');
        prompt = `Extract the following car information from this text (if available):
- Car name (make and model)
- Price (as a number, in CHF)
- Car type (e.g., sedan, SUV, hatchback)
- Year of manufacture
- Mileage (in km)
- Fuel type (e.g., gasoline, diesel, electric, hybrid)
- Engine size (in liters or cc)
- Transmission type (manual or automatic)
- Fuel consumption (liters/100km)
- CO2 emissions (g/km)
- Insurance category
Return the result as a JSON object with keys: name, price, carType, year, mileage, fuelType, engineSize, transmission, fuelConsumption, co2Emissions, insuranceCategory, productType. Set productType to "car".

Text:
${pageText}`;
      } else {
        console.log('Creating appliance-specific Gemini prompt');
        prompt = `Extract the following product information from this text (if available):
- Product name
- Price (as a number, in euros)
- Energy consumption (kWh/year)
- Energy efficiency class (A+++, A++, A+, A, B, C, D, E, F, G)
- Product type (e.g., refrigerator, washing machine, dishwasher, dryer)
- Average repair cost (as a number, in euros, for a typical repair for this product type)
- Expected number of repairs (integer, over the product's typical lifespan)
Return the result as a JSON object with keys: name, price, energyConsumption, energyEfficiencyClass, productType, averageRepairCost, expectedRepairs.

Text:
${pageText}`;
      }
      
      console.log('Prompt length:', prompt.length);
      
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
        console.log('Gemini API HTTP status:', response.status);
        const data = await response.json();
        console.log('Gemini API raw response:', data);
        
        try {
          // Remove markdown code block markers if present
          let text = data.candidates[0].content.parts[0].text;
          console.log('Gemini API raw text:', text);
          text = text.replace(/```[a-zA-Z]*\n?|```/g, '').trim();
          console.log('Cleaned text:', text);
          
          const parsedData = JSON.parse(text);
          console.log('Successfully parsed Gemini response as JSON:', parsedData);
          resolve(parsedData);
        } catch (e) {
          console.error('[LTC DEBUG] Gemini API response parsing error:', e, data);
          resolve(null);
        }
      } catch (err) {
        console.error('[LTC DEBUG] Error calling Gemini API:', err);
        resolve(null);
      }
    });
  });
}

// Extract product data from the page using Gemini API
async function extractProductData() {
  try {
    const currentUrl = window.location.href;
    if (currentUrl.includes('digitec.ch') && digitecScraper) {
      const data = digitecScraper.extractProductData();
      if (data && data.name && data.price) {
        return data;
      }
    }
    console.log('Extracting product data from page...');

    const pageText = document.body.innerText;
    console.log('Page text length:', pageText.length);
    
    const isTuttiCar = window.location.href.includes('tutti.ch') && 
                       (window.location.href.includes('/auto/') || 
                        window.location.href.includes('/automobili/') || 
                        window.location.href.includes('/autos/'));
    
    console.log('Is tutti.ch car listing?', isTuttiCar);
    
    const productData = await callGeminiAPIForProductData(pageText, isTuttiCar);
    console.log('Product data from Gemini API:', productData);
    
    if (productData && productData.name && productData.price) {
      console.log('Product data extracted successfully:', productData);
      return productData;
    }
    console.log('Failed to extract valid product data');
    return null;
  } catch (error) {
    console.error('Error extracting product data:', error);
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
  
  // Determine appliance type and get corresponding lifespan from preferences if not provided by productData
  const productType = productData.productType || 'refrigerator'; // Default if not specified
  const lifespan = productData.lifespan || preferences.applianceLifespans[productType] || 10;
  
  // Get energy consumption from productData (from Gemini) or use a default
  const annualEnergyConsumption = typeof productData.energyConsumption === 'number' 
                                  ? productData.energyConsumption 
                                  : 300; // kWh/year default
  if (typeof productData.energyConsumption !== 'number') {
    console.warn('Gemini API did not provide energyConsumption, using default:', annualEnergyConsumption);
  }
  
  // Get maintenance cost estimates from productData (from Gemini) or use defaults
  const averageRepairCost = typeof productData.averageRepairCost === 'number' 
                            ? productData.averageRepairCost 
                            : 350; // Default average repair cost
  const numRepairs = typeof productData.expectedRepairs === 'number' 
                     ? productData.expectedRepairs 
                     : 2; // Default number of repairs

  let maintenanceDataSource = 'Gemini API';
  if (typeof productData.averageRepairCost !== 'number' || typeof productData.expectedRepairs !== 'number') {
    console.warn('Gemini API did not provide full maintenance data, using defaults. Repair Cost:', averageRepairCost, 'Num Repairs:', numRepairs);
    maintenanceDataSource = 'Default Fallback Values';
  }

  // Calculate annual energy cost
  const annualEnergyCost = annualEnergyConsumption * electricityRate;
  
  // Calculate NPV of energy costs over lifespan
  let energyNPV = 0;
  for (let year = 1; year <= lifespan; year++) {
    energyNPV += annualEnergyCost / Math.pow(1 + discountRate, year);
  }
  
  // Calculate NPV of maintenance costs
  // Assume repairs happen at 1/3 and 2/3 of the lifespan
  let maintenanceNPV = 0;
  
  if (numRepairs > 0) {
    for (let i = 1; i <= numRepairs; i++) {
      const repairYear = Math.round(i * lifespan / (numRepairs + 1));
      maintenanceNPV += averageRepairCost / Math.pow(1 + discountRate, repairYear);
    }
  }

  console.log('Maintenance NPV:', maintenanceNPV);
  
  // Cap maintenanceNPV at productData.price
  if (maintenanceNPV > productData.price) {
    console.warn(`ContentScript: MaintenanceNPV (${maintenanceNPV.toFixed(2)}) exceeded product price (${productData.price.toFixed(2)}). Capping at price.`);
    maintenanceNPV = productData.price;
  }

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
    energyEfficiencyClass: productData.energyEfficiencyClass,
    averageRepairCostUsed: averageRepairCost,
    numRepairsUsed: numRepairs,
    maintenanceDataSource: maintenanceDataSource
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
      <button class="ltc-save-button">Save This Product</button>
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

  // Add event listener for the save button
  const saveButton = container.querySelector('.ltc-save-button');
  saveButton.addEventListener('click', () => {
    saveProduct(productData, calculationResults);
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

// Save product to Chrome storage
function saveProduct(productData, calculationResults) {
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
      alert('Product saved!');
    });
  });
}

// Calculate lifetime cost for cars
function calculateCarLifetimeCost(carData, preferences) {
  console.log('Starting car lifetime cost calculation with data:', carData);
  console.log('Using preferences:', preferences);

  // Calculate ownership duration (default 5 years if not specified)
  const ownershipDuration = preferences.carOwnershipDuration || 5;
  console.log('Ownership duration:', ownershipDuration, 'years');
  
  // Get discount rate from preferences
  const discountRate = preferences.discountRate || 0.05;
  console.log('Discount rate:', discountRate);
  
  // Extract car data
  const purchasePrice = carData.price;
  const yearOfManufacture = carData.year;
  const mileage = carData.mileage;
  const fuelType = carData.fuelType;
  const fuelConsumption = carData.fuelConsumption;
  const engineSize = carData.engineSize;
  
  console.log('Car data extracted - Purchase price:', purchasePrice, 
              'Year:', yearOfManufacture, 
              'Mileage:', mileage, 
              'Fuel type:', fuelType, 
              'Fuel consumption:', fuelConsumption, 
              'Engine size:', engineSize);
  
  // Current year
  const currentYear = new Date().getFullYear();
  const carAge = currentYear - yearOfManufacture;
  console.log('Current year:', currentYear, 'Car age:', carAge);
  
  // Calculate annual mileage (assume 15,000 km/year if not specified)
  const annualMileage = preferences.annualMileage || 15000;
  console.log('Annual mileage:', annualMileage, 'km');
  
  // Get fuel price from preferences or use defaults
  let fuelPrice;
  if (fuelType === 'diesel') {
    fuelPrice = preferences.dieselPrice || 1.95; // CHF per liter
    console.log('Using diesel price:', fuelPrice, 'CHF/L');
  } else if (fuelType === 'electric') {
    fuelPrice = preferences.electricityRate || 0.25; // CHF per kWh
    console.log('Using electricity price:', fuelPrice, 'CHF/kWh');
  } else {
    fuelPrice = preferences.gasolinePrice || 1.90; // CHF per liter (default gasoline)
    console.log('Using gasoline price:', fuelPrice, 'CHF/L');
  }
  
  // Calculate annual fuel cost
  let annualFuelCost;
  if (fuelType === 'electric') {
    // For electric vehicles (kWh/100km * annual mileage / 100)
    annualFuelCost = (fuelConsumption * annualMileage / 100) * fuelPrice;
    console.log('Annual fuel cost (electric):', annualFuelCost, 'CHF');
  } else {
    // For combustion engines (L/100km * annual mileage / 100)
    annualFuelCost = (fuelConsumption * annualMileage / 100) * fuelPrice;
    console.log('Annual fuel cost (combustion):', annualFuelCost, 'CHF');
  }
  
  // Calculate annual tax (based on engine size and/or emissions)
  // This is very simplified and should be replaced with actual tax calculations for Switzerland
  let annualTax;
  if (fuelType === 'electric') {
    annualTax = 200; // Often reduced for electric vehicles
    console.log('Annual tax (electric):', annualTax, 'CHF');
  } else {
    // Simplified calculation based on engine size
    annualTax = engineSize < 1.6 ? 300 : 
                engineSize < 2.0 ? 400 : 
                engineSize < 3.0 ? 600 : 800;
    console.log('Annual tax (based on engine size):', annualTax, 'CHF');
  }
  
  // Calculate insurance cost (comprehensive)
  // This is a simplified model - actual insurance would depend on many factors
  let annualInsurance;
  const insuranceCategory = carData.insuranceCategory || 'medium';
  const baseInsurance = 1000; // Base comprehensive insurance
  console.log('Insurance category:', insuranceCategory, 'Base insurance:', baseInsurance);
  
  if (insuranceCategory === 'low') {
    annualInsurance = baseInsurance * 0.8;
  } else if (insuranceCategory === 'high') {
    annualInsurance = baseInsurance * 1.3;
  } else {
    annualInsurance = baseInsurance;
  }
  
  // Adjust insurance based on car age
  if (carAge > 5) {
    annualInsurance *= 0.9;
    console.log('Insurance reduced by 10% due to car age > 5');
  }
  if (carAge > 10) {
    annualInsurance *= 0.9;
    console.log('Insurance reduced by additional 10% due to car age > 10');
  }
  
  console.log('Annual insurance after adjustments:', annualInsurance, 'CHF');
  
  // Calculate maintenance costs (increasing with car age)
  let annualMaintenanceCost;
  if (carAge < 3) {
    annualMaintenanceCost = 500;
  } else if (carAge < 7) {
    annualMaintenanceCost = 800;
  } else if (carAge < 12) {
    annualMaintenanceCost = 1200;
  } else {
    annualMaintenanceCost = 1800;
  }
  
  console.log('Base annual maintenance cost (by age):', annualMaintenanceCost, 'CHF');
  
  // Adjust maintenance cost for luxury or economy brands
  const carBrand = carData.name.split(' ')[0].toLowerCase();
  const luxuryBrands = ['mercedes', 'bmw', 'audi', 'lexus', 'porsche', 'maserati', 'jaguar', 'land rover'];
  const economyBrands = ['dacia', 'skoda', 'suzuki', 'hyundai', 'kia'];
  
  console.log('Car brand for maintenance adjustment:', carBrand);
  
  if (luxuryBrands.includes(carBrand)) {
    annualMaintenanceCost *= 1.5;
    console.log('Maintenance cost increased by 50% for luxury brand');
  } else if (economyBrands.includes(carBrand)) {
    annualMaintenanceCost *= 0.8;
    console.log('Maintenance cost reduced by 20% for economy brand');
  }
  
  console.log('Annual maintenance cost after brand adjustment:', annualMaintenanceCost, 'CHF');
  
  // Calculate depreciation (simplified model)
  let totalDepreciation;
  const currentValue = purchasePrice;
  let futureValue;
  
  if (carAge < 3) {
    // Newer cars depreciate faster
    futureValue = currentValue * Math.pow(0.85, ownershipDuration);
    console.log('Using faster depreciation rate (0.85) for newer car');
  } else if (carAge < 8) {
    // Middle-aged cars depreciate moderately
    futureValue = currentValue * Math.pow(0.9, ownershipDuration);
    console.log('Using moderate depreciation rate (0.9) for middle-aged car');
  } else {
    // Older cars depreciate slower
    futureValue = currentValue * Math.pow(0.95, ownershipDuration);
    console.log('Using slower depreciation rate (0.95) for older car');
  }
  
  console.log('Current value:', currentValue, 'CHF');
  console.log('Estimated future value after', ownershipDuration, 'years:', futureValue, 'CHF');
  
  totalDepreciation = currentValue - futureValue;
  const annualDepreciation = totalDepreciation / ownershipDuration;
  
  console.log('Total depreciation:', totalDepreciation, 'CHF');
  console.log('Annual depreciation:', annualDepreciation, 'CHF');
  
  // Calculate NPV of annual costs over ownership period
  let fuelCostNPV = 0;
  let taxNPV = 0;
  let insuranceNPV = 0;
  let maintenanceNPV = 0;
  
  console.log('Calculating NPV for each cost category over', ownershipDuration, 'years...');
  
  for (let year = 1; year <= ownershipDuration; year++) {
    const fuelNPVForYear = annualFuelCost / Math.pow(1 + discountRate, year);
    const taxNPVForYear = annualTax / Math.pow(1 + discountRate, year);
    const insuranceNPVForYear = annualInsurance / Math.pow(1 + discountRate, year);
    const maintenanceNPVForYear = annualMaintenanceCost / Math.pow(1 + discountRate, year);
    
    console.log(`Year ${year} NPV - Fuel: ${fuelNPVForYear.toFixed(2)}, Tax: ${taxNPVForYear.toFixed(2)}, Insurance: ${insuranceNPVForYear.toFixed(2)}, Maintenance: ${maintenanceNPVForYear.toFixed(2)}`);
    
    fuelCostNPV += fuelNPVForYear;
    taxNPV += taxNPVForYear;
    insuranceNPV += insuranceNPVForYear;
    maintenanceNPV += maintenanceNPVForYear;
  }
  
  console.log('Total NPV - Fuel:', fuelCostNPV, 'Tax:', taxNPV, 'Insurance:', insuranceNPV, 'Maintenance:', maintenanceNPV);
  
  // Calculate total ownership cost
  const totalOwnershipCost = totalDepreciation + fuelCostNPV + taxNPV + insuranceNPV + maintenanceNPV;
  const monthlyCost = totalOwnershipCost / (ownershipDuration * 12);
  
  console.log('Total ownership cost:', totalOwnershipCost, 'CHF');
  console.log('Monthly cost:', monthlyCost, 'CHF');
  
  const result = {
    purchasePrice: purchasePrice,
    totalOwnershipCost: totalOwnershipCost,
    monthlyCost: monthlyCost,
    depreciationCost: totalDepreciation,
    fuelCostNPV: fuelCostNPV,
    taxCostNPV: taxNPV,
    insuranceCostNPV: insuranceNPV,
    maintenanceCostNPV: maintenanceNPV,
    annualFuelCost: annualFuelCost,
    annualTax: annualTax,
    annualInsurance: annualInsurance,
    annualMaintenanceCost: annualMaintenanceCost,
    annualDepreciation: annualDepreciation,
    ownershipDuration: ownershipDuration,
    carDetails: {
      year: yearOfManufacture,
      age: carAge,
      mileage: mileage,
      fuelType: fuelType,
      fuelConsumption: fuelConsumption
    }
  };
  
  console.log('Returning car cost calculation result:', result);
  return result;
}

// Display car lifetime cost on the page
function displayCarLifetimeCost(carData, calculationResults) {
  console.log('Displaying car lifetime cost with data:', carData);
  console.log('Calculation results for display:', calculationResults);
  
  // Create container for our display
  const container = document.createElement('div');
  container.id = 'lifetime-cost-calculator';
  container.className = 'ltc-container';
  
  console.log('Created container element with ID:', container.id);
  
  // Format currency values
  const formatCurrency = (value) => {
    if (typeof value !== 'number' || isNaN(value)) {
      console.error('Invalid value passed to formatCurrency:', value);
      return 'CHF 0.00'; // Default fallback
    }
    return 'CHF ' + value.toFixed(2).replace('.', ',');
  };
  
  // Create content
  console.log('Building HTML content for car cost display');
  container.innerHTML = `
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
          • Fuel Cost: ${formatCurrency(calculationResults.fuelCostNPV)}
        </div>
        <div class="ltc-breakdown-item">
          • Tax: ${formatCurrency(calculationResults.taxCostNPV)}
        </div>
        <div class="ltc-breakdown-item">
          • Insurance: ${formatCurrency(calculationResults.insuranceCostNPV)}
        </div>
        <div class="ltc-breakdown-item">
          • Maintenance: ${formatCurrency(calculationResults.maintenanceCostNPV)}
        </div>
      </div>
      
      <div class="ltc-car-info">
        ${carData.year} ${carData.name} • ${carData.mileage} km • ${carData.fuelType}
        <br>
        Fuel Consumption: ${carData.fuelConsumption} ${carData.fuelType === 'electric' ? 'kWh/100km' : 'L/100km'}
      </div>
      
      <button class="ltc-details-button">Show Calculation Details</button>
      <button class="ltc-save-button">Save This Car</button>
    </div>
  `;
  
  // Find a good place to insert our container
  console.log('Looking for target element to insert container');
  const targetElement = document.querySelector('.product-details, .product-info, .product-summary');
  if (targetElement) {
    console.log('Found target element:', targetElement);
    targetElement.parentNode.insertBefore(container, targetElement.nextSibling);
  } else {
    console.log('Target element not found, looking for heading');
    // Fallback: insert after the first heading
    const heading = document.querySelector('h1');
    if (heading) {
      console.log('Found heading element:', heading);
      heading.parentNode.insertBefore(container, heading.nextSibling);
    } else {
      console.log('No suitable target found, appending to body');
      // Last resort: append to body
      document.body.appendChild(container);
    }
  }
  
  console.log('Container inserted into DOM');
  
  // Add event listener for the details button
  const detailsButton = container.querySelector('.ltc-details-button');
  detailsButton.addEventListener('click', () => {
    console.log('Details button clicked');
    showCarCalculationDetails(carData, calculationResults);
  });

  // Add event listener for the save button
  const saveButton = container.querySelector('.ltc-save-button');
  saveButton.addEventListener('click', () => {
    console.log('Save button clicked');
    saveProduct(carData, calculationResults);
  });
  
  console.log('Car cost display complete');
}

// Show detailed car calculation information
function showCarCalculationDetails(carData, calculationResults) {
  console.log('Showing detailed car calculation modal for:', carData.name);
  
  // Create modal for detailed information
  const modal = document.createElement('div');
  modal.className = 'ltc-modal';
  
  // Format currency values
  const formatCurrency = (value) => {
    return 'CHF ' + value.toFixed(2).replace('.', ',');
  };
  
  console.log('Building car calculation details modal content');
  
  // Create content
  modal.innerHTML = `
    <div class="ltc-modal-content">
      <span class="ltc-modal-close">&times;</span>
      <h2>Car Ownership Cost Calculation Details</h2>
      
      <h3>Car Information</h3>
      <p>
        <strong>Make/Model:</strong> ${carData.name}<br>
        <strong>Year:</strong> ${carData.year} (Age: ${calculationResults.carDetails.age} years)<br>
        <strong>Mileage:</strong> ${carData.mileage} km<br>
        <strong>Fuel Type:</strong> ${carData.fuelType}<br>
        <strong>Fuel Consumption:</strong> ${carData.fuelConsumption} ${carData.fuelType === 'electric' ? 'kWh/100km' : 'L/100km'}<br>
        <strong>Engine Size:</strong> ${carData.engineSize || 'Unknown'}<br>
        <strong>Transmission:</strong> ${carData.transmission || 'Unknown'}
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
      
      <p class="ltc-note">
        Note: All future costs are calculated using Net Present Value (NPV) to account for the time value of money.
      </p>
    </div>
  `;
  
  console.log('Adding modal to DOM');
  
  // Add modal to page
  document.body.appendChild(modal);
  
  // Add event listener for close button
  const closeButton = modal.querySelector('.ltc-modal-close');
  closeButton.addEventListener('click', () => {
    console.log('Modal close button clicked');
    document.body.removeChild(modal);
  });
  
  // Close modal when clicking outside the content
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      console.log('Modal background clicked, closing');
      document.body.removeChild(modal);
    }
  });
  
  console.log('Car calculation details modal displayed');
}

// Initialize the content script
console.log('Starting Lifetime Cost Calculator initialization');
initLifetimeCostCalculator();
