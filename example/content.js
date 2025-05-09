// content.js - Content script for Lifetime Cost Calculator Extension
console.log('Lifetime Cost Calculator: Content script loaded');

// Debug: Log current URL and document title
console.log('Current URL:', window.location.href);
console.log('Document title:', document.title);

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
  const currentUrl = window.location.href;
  console.log('Checking if product page. URL:', currentUrl);
  if (!currentUrl.includes('/product/') && !currentUrl.includes('saturn.de') && !currentUrl.includes('zara.com')) {
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
  console.log('Calling Gemini API for product data extraction...');
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['geminiApiKey'], async function(result) {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        console.error('Gemini API key not set.');
        resolve(null);
        return;
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const prompt = `Extract the following product information from this text (if available):
- Product name
- Price (as a number, in euros)
- Energy consumption (kWh/year)
- Energy efficiency class (A+++, A++, A+, A, B, C, D, E, F, G)
- Product type (e.g., refrigerator, washing machine, dishwasher, dryer, clothing)
- Average repair cost (as a number, in euros, for a typical repair for this product type)
- Expected number of repairs (integer, over the product's typical lifespan)
- Fabric quality (for clothing, a value between 0 and 1)
Return the result as a JSON object with keys: name, price, energyConsumption, energyEfficiencyClass, productType, averageRepairCost, expectedRepairs, fabricQuality.

Text:
${pageText}`;
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
        console.log('Gemini API raw response:', data);
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

// Extract product data from the page using Gemini API, with fallback for Zara
async function extractProductData() {
  try {
    const pageText = document.body.innerText;
    let productData = await callGeminiAPIForProductData(pageText);
    console.log('extractProductData result:', productData);
    if (productData && productData.name && productData.price) {
      console.log('Product data extracted:', productData);
      return productData;
    }
    // Fallback: Try to extract from Zara DOM if Gemini fails
    if (window.location.hostname.includes('zara.com')) {
      console.warn('Gemini failed, attempting Zara fallback extraction');
      // Zara product name
      let name = '';
      let nameSelectors = [
        '[data-product-name]',
        'h1.product-name',
        'h1',
        '.product-detail-info__header-name',
        '.product-name',
        '.product-header__title',
        '.product-title',
      ];
      for (let sel of nameSelectors) {
        let elem = document.querySelector(sel);
        if (elem && elem.textContent.trim().length > 2) {
          name = elem.textContent.trim();
          console.log('Zara fallback: found name with selector', sel, name);
          break;
        }
      }
      if (!name) console.warn('Zara fallback: name not found');
      // Zara price
      let price = '';
      let priceSelectors = [
        '[data-product-price]',
        '.price__amount',
        '.price-current',
        '.product-price',
        '[itemprop="price"]',
        '.product-detail-info__header-price',
        '.price',
      ];
      for (let sel of priceSelectors) {
        let elem = document.querySelector(sel);
        if (elem && elem.textContent.trim().length > 0) {
          price = parsePrice(elem.textContent);
          console.log('Zara fallback: found price with selector', sel, price);
          break;
        }
      }
      if (!price) console.warn('Zara fallback: price not found');
      // Zara material/fabric
      let material = '';
      let materialSelectors = [
        '.composition',
        '.product-detail-info__composition',
        '.product-composition',
        '[data-product-composition]',
        '.product-info-description',
        '.product-description',
        '.description',
      ];
      for (let sel of materialSelectors) {
        let elem = document.querySelector(sel);
        if (elem && elem.textContent.trim().length > 2) {
          material = elem.textContent.trim();
          console.log('Zara fallback: found material with selector', sel, material);
          break;
        }
      }
      if (!material) console.warn('Zara fallback: material not found');
      if (name && price) {
        const fallbackData = { name, price, material, productType: 'clothing' };
        console.log('Zara fallback product data:', fallbackData);
        return fallbackData;
      }
      console.warn('Zara fallback extraction failed');
    }
    return null;
  } catch (error) {
    console.error('Error extracting product data with Gemini or fallback:', error);
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
  } else if (pageText.includes('clothing') || pageText.includes('shirt') || pageText.includes('pants') || pageText.includes('zara')) {
    return 'clothing';
  }
  return 'unknown';
}

// Calculate lifetime cost based on product data and user preferences
function calculateLifetimeCost(productData, preferences) {
  console.log('Calculating lifetime cost for:', productData, preferences);

  // Clothing-specific calculation
  if (productData.productType === 'clothing') {
    // Determine fabric/material quality and lifespan
    let material = (productData.material || '').toLowerCase();
    let quality = 'medium';
    let lifespan = 5; // default
    if (material.includes('wool') || material.includes('cashmere')) {
      quality = 'high';
      lifespan = 20;
    } else if (material.includes('cotton') || material.includes('linen')) {
      quality = 'medium';
      lifespan = 10;
    } else if (material.includes('polyester') || material.includes('synthetic')) {
      quality = 'low';
      lifespan = 5;
    }
    // If user wants a more pessimistic scenario, use lower bounds
    if (material.includes('cheap') || material.includes('low quality')) {
      lifespan = 2;
      quality = 'low';
    } else if (material.includes('high quality')) {
      lifespan = 20;
      quality = 'high';
    }

    // Amortize cost over lifespan
    const purchasePrice = productData.price;
    const annualCost = purchasePrice / lifespan;

    // Maintenance cost: synthetic garments need more frequent washing
    let maintenanceCostPerYear = 0;
    let washesPerYear = 40;
    if (quality === 'low' || material.includes('polyester') || material.includes('synthetic')) {
      washesPerYear = 60; // 50% more washes for synthetics
    }
    maintenanceCostPerYear = washesPerYear * 0.5; // 0.5€ per wash
    const totalMaintenanceCost = maintenanceCostPerYear * lifespan;
    const totalLifetimeCost = purchasePrice + totalMaintenanceCost;

    return {
      purchasePrice,
      annualCost,
      lifespan,
      material,
      quality,
      maintenanceCostPerYear,
      totalMaintenanceCost,
      totalLifetimeCost,
      productType: 'clothing',
      breakdown: {
        purchasePrice,
        annualCost,
        lifespan,
        material,
        quality,
        maintenanceCostPerYear,
        totalMaintenanceCost
      }
    };
  }
  // ...existing code for appliances...
}

// Display lifetime cost results on the page
function displayLifetimeCost(productData, calculationResults) {
  console.log('Displaying lifetime cost results:', calculationResults);

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:10px;right:10px;background:#fff;border:1px solid #ccc;padding:10px;z-index:10000;box-shadow:0 0 10px rgba(0,0,0,0.1);';

  // Build content for clothing
  if (calculationResults.productType === 'clothing') {
    container.innerHTML = `
      <div style="font-weight:700;font-size:1.2em;color:#0077b6;margin-bottom:10px;letter-spacing:1px;">LIFETIME COST CALCULATOR</div>
      <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <b style="flex:1;">${productData.name || 'Prodotto Zara'}</b>
        <span style="font-weight:600;margin-left:10px;">${formatCurrency(productData.price)}</span>
      </div>
      <div style="margin-bottom:10px;">Materiale: <b>${calculationResults.material || 'N/A'}</b> (${calculationResults.quality || 'N/A'} quality)</div>
      <div style="margin-bottom:10px;">Durata stimata: <b>${calculationResults.lifespan} anni</b></div>
      <div style="margin-bottom:10px;">Costo annuale ammortizzato: <b>${formatCurrency(calculationResults.annualCost)}</b></div>
      <div style="margin-bottom:10px;">Costo manutenzione annuale: <b>${formatCurrency(calculationResults.maintenanceCostPerYear)}</b></div>
      <div style="margin-bottom:10px;">Costo totale manutenzione: <b>${formatCurrency(calculationResults.totalMaintenanceCost)}</b></div>
      <div style="margin-bottom:10px;">Costo totale vita: <span style="font-size:1.2em;color:#009900;font-weight:700;">${formatCurrency(calculationResults.totalLifetimeCost)}</span></div>
    `;
  }

  document.body.appendChild(container);
}

// Helper function to format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
}
