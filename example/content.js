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


// Ensure digitecScraper is defined at the top level
let digitecScraper = null;
if (window.location.hostname.includes('digitec.ch')) {
  if (window.DigitecScraper) {
    digitecScraper = new window.DigitecScraper();
  }
}

// Main function to initialize the content script
async function initLifetimeCostCalculator() {
  console.log('initLifetimeCostCalculator called');
  console.log('Lifetime Cost Calculator: Content script initialized');

  try {
    // Check if we're on a product page
    console.log('Checking if current page is a product page...');
    if (await isProductPage()) {
      console.log('Product page detected, extracting data...');

      try {
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
              
              // Fallback display was here, but it's better handled by specific display functions
              // if productData exists but calculationResults might be minimal.
              // For instance, if preferences are missing, calculate functions should provide defaults.
            } else {
              // Handle missing preferences, perhaps by using default calculation or showing an error/prompt.
              console.warn('User preferences not available. Using default calculations or showing minimal info.');
              // Example: Display with minimal data if preferences are missing
              if (productData.productType === 'car') {
                const minimalCarResults = calculateCarLifetimeCost(productData, {}); // Use empty prefs for defaults
                displayCarLifetimeCost(productData, minimalCarResults);
              } else {
                const fallbackResults = {
                  totalLifetimeCost: productData.price,
                  purchasePrice: productData.price,
                  productType: productData.productType || 'clothing'
                };
                displayLifetimeCost(productData, fallbackResults);
              }
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

// Check if the current page is a product page
async function isProductPage() {
  const currentUrl = window.location.href;
  const hostname = window.location.hostname;
  console.log('Checking if product page. URL:', currentUrl, 'Hostname:', hostname);

  // Special handling for Zara sites
  if (hostname.includes('zara.com')) {
    console.log('Detected Zara site');
    
    // Check URL patterns for Zara product pages
    // Added pattern for ...-p<product_id>.html
    const zaraProductPagePattern = /-p[0-9]+\.html/i;
    if (currentUrl.includes('/product/') || currentUrl.includes('/item/') || zaraProductPagePattern.test(currentUrl)) {
      console.log('Zara product page detected from URL pattern');
      return true;
    }
    
    // Check for Zara product elements in the DOM
    const productPageIndicators = [
      '.product-detail',
      '.product-info',
      '[data-product-id]',
      '.product-detail-info',
      '.money-amount__main',
      '[data-qa-price]'
    ];
    
    for (const selector of productPageIndicators) {
      const element = document.querySelector(selector);
      if (element) {
        console.log('Zara product page detected from DOM element:', selector);
        return true;
      }
    }
    
    // For debugging - dump potential product elements
    console.log('Main content:', document.body.innerText.substring(0, 500));
    console.log('H1 content:', document.querySelector('h1')?.textContent);
    
    // Try to run Gemini API as fallback
    try {
      const pageText = document.body.innerText;
      const productData = await callGeminiAPIForProductData(pageText);
      if (productData && productData.name && productData.price) {
        console.log('Zara product detected by Gemini API:', productData);
        window._ltcGeminiProductData = productData;
        return true;
      }
    } catch (error) {
      console.error('Error detecting product with Gemini for Zara:', error);
    }
    
    // If we're still not sure, check if the page has price-like elements
    const priceElements = document.querySelectorAll('.price, .money-amount, [data-qa-price], .product-price');
    if (priceElements.length > 0) {
      console.log('Potential Zara product page detected from price elements');
      return true;
    }
    
    console.log('Not a Zara product page');
    return false;
  }

  // Standard checks for other sites
  console.log('Checking URL for non-Zara sites:', currentUrl);

  const isTuttiCar = hostname.includes('tutti.ch') &&
                     (currentUrl.includes('/auto/') ||
                      currentUrl.includes('/automobili/') ||
                      currentUrl.includes('/autos/'));
  console.log('Is tutti.ch car page?', isTuttiCar);

  if (!currentUrl.includes('/product/') &&
      !hostname.includes('saturn.de') && // Changed from currentUrl.includes
      !hostname.includes('tutti.ch') &&  // Changed from !isTuttiCar
      !hostname.includes('digitec.ch') // Added this to ensure digitec isn't prematurely excluded if it doesn't have /product/
    ) {
    console.log('Not a product page based on URL and host checks (no /product/, not Saturn, not Tutti, not Digitec).');
    return false;
  } else if (hostname.includes('digitec.ch')) { // Changed from currentUrl.includes
    // Improved: check for product ID in URL and product title element
    const productIdPattern = /-(\d+)(#|$|\?)/;
    const hasProductId = productIdPattern.test(currentUrl);
    const hasProductTitle = document.querySelector('h1[data-testid="product-title"], h1.product-title, .product-title, h1');
    if (!hasProductId || !hasProductTitle) {
      console.log('Not a Digitec product page based on URL or missing product title');
      return false;
    }
    console.log('Is a Digitec product page based on specific checks.');
    return true; // Digitec specific check passes, no need for Gemini here as per original logic
  }

  // If we reach here, the page is considered a potential product page
  // and will proceed to data extraction using Gemini API.
  // This includes tutti.ch (car or other /anzeige/ pages), saturn.de,
  // pages with /product/ in URL, and potentially other sites matched by manifest.
  console.log('URL pattern matches a product page or is a recognized host, proceeding to check content with Gemini API...');

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
async function callGeminiAPIForProductData(pageText, isCar) { // Added isCar parameter
  console.log('Calling Gemini API for product data extraction... isCar:', isCar);
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['geminiApiKey'], async function(result) {
      const apiKey = result.geminiApiKey;
      if (!apiKey) {
        console.error('[LTC DEBUG] Gemini API key not set.');
        resolve(null);
        return;
      }
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      
      const isZara = window.location.hostname.includes('zara.com');
      
      let prompt;
      if (isCar) { // Check if isCar is true
        prompt = `Extract the following car information from this webpage text (if available):
- Make (e.g., Volkswagen, Toyota)
- Model (e.g., Golf, Corolla)
- Year of manufacture (as a number, e.g., 2018)
- Price (as a number only, without currency symbol. If a range, take the lower end)
- Currency (e.g., CHF, EUR)
- Mileage (km, as a number)
- Fuel type (e.g., Petrol, Diesel, Electric, Hybrid)
- Fuel consumption (e.g., L/100km for petrol/diesel, kWh/100km for electric. Provide as a number. If range, take average or typical.)
- Transmission (e.g., Automatic, Manual)
- Location/Canton (e.g., ZH, BE - for Switzerland, if mentioned)
Return the result as a JSON object with keys: make, model, year, price, currency, mileage, fuelType, fuelConsumption, transmission, location.
Ensure price, year, mileage, and fuelConsumption are numbers.

Text:
${pageText}`;
      } else if (isZara) {
        prompt = `Extract the following product information from this Zara.com webpage text (if available):
- Product name
- Price (as a number only, without currency symbol)
- Currency used (EUR, CHF, USD, etc. - if you can detect it)
- Product type (e.g., shirt, dress, pants, jacket, etc.)
- Material/fabric composition
Return the result as a JSON object with keys: name, price, currency, productType, material.

When extracting price:
- Look for price formats like "CHF 59.90" or "59,90 €" or just "59.90"
- For Swiss Zara site, prices are often in CHF format

Text:
${pageText}`;
      } else {
        prompt = `Extract the following product information from this text (if available):
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
      }
      
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
          console.log('Gemini API raw text before replace:', text);
          
          // Refined markdown stripping
          if (text.startsWith("```json")) {
            text = text.substring(7); // Remove ```json prefix
            if (text.endsWith("```")) {
              text = text.substring(0, text.length - 3); // Remove ``` suffix
            }
          } else if (text.startsWith("```")) {
            text = text.substring(3); // Remove ``` prefix
            if (text.endsWith("```")) {
              text = text.substring(0, text.length - 3); // Remove ``` suffix
            }
          }
          text = text.trim(); // Trim whitespace

          console.log('Gemini API raw text after replace and trim:', text);

          let parsedData = null;
          try {
            parsedData = JSON.parse(text);
          } catch (jsonParseError) {
            console.error('[LTC DEBUG] JSON.parse failed. Raw text was:', text);
            console.error('[LTC DEBUG] JSON.parse error:', jsonParseError);
            resolve(null); // Resolve with null if parsing fails
            return;
          }
          
          if (isCar && parsedData) {
            parsedData.name = `${parsedData.make || ''} ${parsedData.model || ''}`.trim();
            parsedData.productType = 'car'; // Ensure productType is set
          } else if (isZara && parsedData) {
            // For Zara products, standardize the data format
            // Store the original currency if provided
            const originalCurrency = parsedData.currency || (window.location.hostname.includes('.ch') ? 'CHF' : 'EUR');
            console.log('Detected currency from Gemini:', originalCurrency);
            
            // Ensure price is processed properly
            if (parsedData.price) {
              parsedData.originalPrice = parsedData.price;
              parsedData.originalCurrency = originalCurrency;
              // Add standard properties
              parsedData.productType = parsedData.productType || 'clothing';
            }
          }
          
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

// Extract product data from the page using Gemini API, with fallback for Zara
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
    
    const isTuttiCar = window.location.hostname.includes('tutti.ch') && 
                       (window.location.href.includes('/auto/') || 
                        window.location.href.includes('/automobili/') || 
                        window.location.href.includes('/autos/'));
    
    console.log('Is tutti.ch car listing?', isTuttiCar);
    
    // Pass isTuttiCar to callGeminiAPIForProductData
    const productData = await callGeminiAPIForProductData(pageText, isTuttiCar);
    console.log('Product data from Gemini API:', productData);
    
    if (productData && productData.price) { // Simplified check, name is added in callGemini for cars
      console.log('Product data extracted successfully:', productData);
      if (isTuttiCar && !productData.productType) productData.productType = 'car'; // Ensure productType
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
        '.product-detail-name',
        '[data-qa-heading="product-name"]'
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
      
      // Zara price - First try the money-amount__main class specifically
      let priceData = null;
      
      // Check .money-amount__main first (it's the most reliable for Zara)
      let moneyAmountElem = document.querySelector('.money-amount__main');
      if (moneyAmountElem) {
        console.log('Found money-amount__main element:', moneyAmountElem);
        console.log('Text content:', moneyAmountElem.textContent);
        priceData = parsePrice(moneyAmountElem.textContent);
        if (priceData) {
          console.log('Extracted price from .money-amount__main:', priceData.amount, 'Currency:', priceData.currency);
        } else {
          console.warn('Failed to parse price from .money-amount__main:', moneyAmountElem.textContent);
        }
      } else {
        console.warn('Could not find .money-amount__main element');
      }
      
      // If still no price, try other selectors
      if (!priceData) {
        let priceSelectors = [
          '[data-product-price]',
          '.price__amount',
          '.price-current',
          '.product-price',
          '[itemprop="price"]',
          '.product-detail-info__header-price',
          '.price',
          '[data-qa-price]',
          '.product-detail-price',
          '.product-price-value',
          '.current-price-elem'
        ];
        
        for (let sel of priceSelectors) {
          let elem = document.querySelector(sel);
          if (elem && elem.textContent.trim().length > 0) {
            console.log('Trying price selector:', sel, 'content:', elem.textContent);
            priceData = parsePrice(elem.textContent);
            if (priceData) {
              console.log('Zara fallback: found price with selector', sel, priceData.amount, 'Currency:', priceData.currency);
              break;
            }
          }
        }
      }
      
      // If still not found, try looking for any element containing price-like text
      if (!priceData) {
        console.log('Trying more aggressive price detection...');
        // Dump all text nodes with numbers for debugging
        const allTextNodes = Array.from(document.querySelectorAll('*'))
          .filter(el => el.childNodes.length === 1 && el.childNodes[0].nodeType === 3)
          .map(el => el.textContent.trim())
          .filter(text => /\d/.test(text));
        
        console.log('All text nodes with numbers:', allTextNodes);
        
        // Specific regex for CHF prices (common in Swiss Zara site)
        const chfRegex = /(CHF\s*[0-9]+[,.][0-9]{2})/i;
        const eurRegex = /(€\s*[0-9]+[,.][0-9]{2})/i;
        const priceRegex = /(CHF|Fr\.|€|\$|£)?\s*([0-9]+[,.][0-9]{2})/i;
        
        // First check direct parents of money-amount__main if it exists
        let priceContainer = document.querySelector('.price-current__amount, .price-current, .product-price-wrapper');
        if (priceContainer) {
          console.log('Found price container:', priceContainer);
          console.log('Price container text:', priceContainer.textContent);
          priceData = parsePrice(priceContainer.textContent);
          if (priceData) {
            console.log('Extracted price from price container:', priceData);
          }
        }
        
        // Last resort - scan everything
        if (!priceData) {
          const allElements = document.querySelectorAll('*');
          
          for (let elem of allElements) {
            if (elem.childNodes.length === 1 && elem.childNodes[0].nodeType === 3) { // Text node
              const text = elem.textContent.trim();
              if (chfRegex.test(text) || eurRegex.test(text) || priceRegex.test(text)) {
                console.log('Found potential price text:', text, 'in element:', elem);
                priceData = parsePrice(text);
                if (priceData) {
                  console.log('Extracted price:', priceData);
                  break;
                }
              }
            }
          }
        }
      }
      
      if (!priceData) {
        console.warn('Zara fallback: price not found after all attempts');
        // Last resort - create a dummy price
        priceData = { amount: 99.99, currency: 'CHF' };
        console.log('Using fallback dummy price:', priceData);
      }
      
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
        '[data-qa-label="composition"]',
        '.product-composition-content'
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
      
      if (name && priceData) {
        const fallbackData = { 
          name, 
          price: priceData.amount, 
          material, 
          productType: 'clothing',
          currency: priceData.currency,
          originalPrice: priceData.amount,
          originalCurrency: priceData.currency
        };
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
  
  console.log('Parsing price text:', priceText);
  
  // Store original currency if detected
  let currency = 'EUR'; // Default currency
  if (priceText.includes('CHF') || priceText.includes('Fr.')) {
    currency = 'CHF';
  } else if (priceText.includes('$')) {
    currency = 'USD';
  } else if (priceText.includes('£')) {
    currency = 'GBP';
  }
  
  // Special case for Zara money-amount__main which might just contain the number
  if (/^\s*\d+[,.]?\d*\s*$/.test(priceText.trim())) {
    console.log('Detected plain number format from Zara');
    const normalizedString = priceText.trim().replace(',', '.');
    const price = parseFloat(normalizedString);
    if (!isNaN(price)) {
      console.log('Extracted price from plain number:', price, 'Currency:', currency);
      return { amount: price, currency: currency };
    }
  }
  
  // Remove all whitespace
  const cleanText = priceText.replace(/\s+/g, '');
  
  // Try different regex patterns to capture prices
  // Pattern for standard price format with decimal separator (like 99,95)
  let match = cleanText.match(/([0-9]+[,.][0-9]{1,2})/);
  
  // If not found, try numeric-only price (without decimals)
  if (!match) {
    match = cleanText.match(/([0-9]+)/);
  }
  
  // If still not found, try with currency symbols/codes
  if (!match) {
    // EUR format
    match = cleanText.match(/€([0-9]+[,.][0-9]{1,2})/);
    // CHF format
    if (!match) match = cleanText.match(/CHF([0-9]+[,.][0-9]{1,2})/);
    if (!match) match = cleanText.match(/Fr\.([0-9]+[,.][0-9]{1,2})/);
    // USD format
    if (!match) match = cleanText.match(/\$([0-9]+[,.][0-9]{1,2})/);
    // GBP format
    if (!match) match = cleanText.match(/£([0-9]+[,.][0-9]{1,2})/);
  }
  
  if (match && match[1]) {
    // Replace comma with dot for decimal point (European format)
    const normalizedString = match[1].replace(',', '.');
    const price = parseFloat(normalizedString);
    console.log('Extracted price:', price, 'Currency:', currency);
    // Return object with both price and currency
    return { amount: price, currency: currency };
  }
  
  // Try to handle weird formats like "29 CHF 90" (29.90 CHF)
  const weirdFormat = priceText.match(/(\d+)\s*(?:CHF|€|\$|£)\s*(\d{2})/i);
  if (weirdFormat) {
    const wholePart = weirdFormat[1];
    const decimalPart = weirdFormat[2];
    const price = parseFloat(`${wholePart}.${decimalPart}`);
    if (!isNaN(price)) {
      console.log('Extracted price from weird format:', price, 'Currency:', currency);
      return { amount: price, currency: currency };
    }
  }
  
  // Last resort: try to find any number in the string
  const anyNumber = cleanText.match(/([0-9]+[,.][0-9]+)/);
  if (anyNumber && anyNumber[1]) {
    const normalizedString = anyNumber[1].replace(',', '.');
    const price = parseFloat(normalizedString);
    console.log('Last resort price extraction:', price, 'Currency:', currency);
    return { amount: price, currency: currency };
  }
  
  // Try to extract just numbers if everything else failed
  const justNumbers = priceText.replace(/[^\d.,]/g, '').trim();
  if (justNumbers) {
    let normalizedString = justNumbers;
    // If there are multiple dots/commas, keep only the last one as decimal separator
    if ((justNumbers.match(/[.,]/g) || []).length > 1) {
      // Find the last dot or comma
      const lastSeparatorIndex = Math.max(justNumbers.lastIndexOf('.'), justNumbers.lastIndexOf(','));
      if (lastSeparatorIndex !== -1) {
        // Replace all separators except the last one
        const beforeLastSeparator = justNumbers.substring(0, lastSeparatorIndex).replace(/[.,]/g, '');
        const afterLastSeparator = justNumbers.substring(lastSeparatorIndex + 1);
        normalizedString = beforeLastSeparator + '.' + afterLastSeparator;
      }
    } else {
      normalizedString = justNumbers.replace(',', '.');
    }
    
    const price = parseFloat(normalizedString);
    if (!isNaN(price)) {
      console.log('Extracted price from just numbers:', price, 'Currency:', currency);
      return { amount: price, currency: currency };
    }
  }
  
  console.warn('Could not parse price from:', priceText);
  return null;
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

  // Validate input data
  if (!productData) {
    console.error('Product data is undefined in calculateLifetimeCost');
    return null;
  }
  
  if (!preferences) {
    console.warn('Preferences are undefined in calculateLifetimeCost, using defaults');
    preferences = {
      electricityRate: 0.30,
      discountRate: 0.02,
      applianceLifespans: {
        refrigerator: 10,
        washingMachine: 8,
        dishwasher: 9,
        dryer: 8,
        clothing: 5,
        unknown: 5
      },
      maintenanceCosts: {
        refrigerator: { averageRepairCost: 350, expectedRepairs: 2 },
        washingMachine: { averageRepairCost: 250, expectedRepairs: 1 },
        dishwasher: { averageRepairCost: 200, expectedRepairs: 1 },
        dryer: { averageRepairCost: 200, expectedRepairs: 1 },
        clothing: { averageRepairCost: 20, expectedRepairs: 0 },
        unknown: { averageRepairCost: 100, expectedRepairs: 1 }
      }
    };
  }

  // Ensure price is a number
  if (typeof productData.price !== 'number' || isNaN(productData.price)) {
    console.warn('Invalid price in product data:', productData.price);
    productData.price = 0;
  }

  // Clothing-specific calculation
  if (productData.productType === 'clothing') {
    try {
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
    } catch (error) {
      console.error('Error calculating clothing lifetime cost:', error);
      // Return fallback calculation result
      return {
        purchasePrice: productData.price,
        annualCost: productData.price / 5,
        lifespan: 5,
        material: productData.material || 'Unknown',
        quality: 'medium',
        maintenanceCostPerYear: 20,
        totalMaintenanceCost: 100,
        totalLifetimeCost: productData.price + 100,
        productType: 'clothing'
      };
    }
  }
  
  // For other product types (non-clothing), create a simple fallback
  return {
    purchasePrice: productData.price,
    energyCostNPV: 0,
    maintenanceCostNPV: 0,
    totalLifetimeCost: productData.price,
    annualEnergyConsumption: 0,
    annualEnergyCost: 0,
    lifespan: 5,
    energyEfficiencyClass: 'Unknown',
    productType: productData.productType || 'unknown'
  };
}

// Placeholder for car-specific lifetime cost calculation
function calculateCarLifetimeCost(productData, preferences) {
  console.log('Calculating Car Lifetime Cost with:', productData, preferences);

  const { price, year, mileage, fuelType, fuelConsumption } = productData;
  const { 
    carOwnershipDuration = 5, // years
    annualMileage = 15000, // km
    fuelPrices = { petrol: 1.8, diesel: 1.9, electric: 0.25 }, // CHF per L or kWh
    carInsuranceAnnual = 1000, // CHF
    carTaxAnnual = 300, // CHF
    carMaintenancePerKm = 0.05, // CHF
    discountRate = 0.02
  } = preferences;

  const purchasePrice = parseFloat(price) || 0;
  const carAge = new Date().getFullYear() - (parseInt(year) || new Date().getFullYear());

  // 1. Depreciation
  let estimatedResaleValue = purchasePrice * Math.pow(0.85, carOwnershipDuration); // 15% annual depreciation
  if (estimatedResaleValue < 0) estimatedResaleValue = 0;
  const totalDepreciation = purchasePrice - estimatedResaleValue;
  const annualDepreciation = totalDepreciation / carOwnershipDuration;

  // 2. Fuel Costs
  const consumption = parseFloat(fuelConsumption) || (fuelType === 'electric' ? 20 : 8); // kWh/100km or L/100km
  const fuelPrice = fuelPrices[fuelType?.toLowerCase()] || fuelPrices.petrol;
  const annualFuelCost = (annualMileage / 100) * consumption * fuelPrice;
  
  let totalFuelCost = 0;
  for (let i = 0; i < carOwnershipDuration; i++) {
    totalFuelCost += annualFuelCost / Math.pow(1 + discountRate, i + 1);
  }

  // 3. Insurance Costs
  let totalInsuranceCost = 0;
  for (let i = 0; i < carOwnershipDuration; i++) {
    totalInsuranceCost += carInsuranceAnnual / Math.pow(1 + discountRate, i + 1);
  }

  // 4. Tax Costs
  let totalTaxCost = 0;
  for (let i = 0; i < carOwnershipDuration; i++) {
    totalTaxCost += carTaxAnnual / Math.pow(1 + discountRate, i + 1);
  }

  // 5. Maintenance Costs
  const annualMaintenanceCost = annualMileage * carMaintenancePerKm;
  let totalMaintenanceCost = 0;
  for (let i = 0; i < carOwnershipDuration; i++) {
    totalMaintenanceCost += annualMaintenanceCost / Math.pow(1 + discountRate, i + 1);
  }

  const totalRunningCostsNPV = totalFuelCost + totalInsuranceCost + totalTaxCost + totalMaintenanceCost;
  const totalNetOwnershipCost = totalDepreciation + totalRunningCostsNPV; 

  const monthlyCost = totalNetOwnershipCost / (carOwnershipDuration * 12);

  return {
    productType: 'car',
    purchasePrice,
    year: productData.year,
    make: productData.make,
    model: productData.model,
    mileage: productData.mileage,
    fuelType: productData.fuelType,
    fuelConsumption: productData.fuelConsumption,
    currency: productData.currency || 'CHF',
    ownershipDuration: carOwnershipDuration, 
    annualMileage,
    
    depreciationCost: totalDepreciation,
    annualDepreciation,
    estimatedResaleValue,

    fuelCostNPV: totalFuelCost,
    annualFuelCost,

    insuranceCostNPV: totalInsuranceCost,
    annualInsuranceCost: carInsuranceAnnual,

    taxCostNPV: totalTaxCost,
    annualTaxCost: carTaxAnnual,

    maintenanceCostNPV: totalMaintenanceCost,
    annualMaintenanceCost,

    totalRunningCostsNPV,
    totalLifetimeCost: totalNetOwnershipCost, 
    monthlyCost
  };
}

// Display car-specific lifetime cost results
function displayCarLifetimeCost(productData, calculationResults) {
  console.log('Displaying Car Lifetime Cost:', productData, calculationResults);

  const containerId = 'lifetime-cost-container';
  let container = document.getElementById(containerId);
  if (container) container.remove(); 

  container = document.createElement('div');
  container.id = containerId;
  container.style.cssText = 'position:fixed;top:10px;right:10px;background:#fff;border:1px solid #ccc;padding:15px;z-index:10000;box-shadow:0 0 10px rgba(0,0,0,0.1);cursor:move; width: 320px; font-size: 14px;';

  let isDragging = false;
  let offsetX, offsetY;
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = container.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;
    container.style.left = rect.left + 'px';
    container.style.top = rect.top + 'px';
    container.style.right = ''; 
    container.style.bottom = '';
    container.style.userSelect = 'none';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    container.style.left = (e.clientX - offsetX) + 'px';
    container.style.top = (e.clientY - offsetY) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      container.style.userSelect = '';
    }
  });

  const format = (val) => `${calculationResults.currency || 'CHF'} ${val.toFixed(2)}`;

  container.innerHTML = `
    <div style="font-weight:bold;font-size:1.2em;color:#0077b6;margin-bottom:10px;text-align:center;">Car Lifetime Cost</div>
    <div style="margin-bottom:8px;"><strong>${productData.make || ''} ${productData.model || productData.name} (${productData.year || 'N/A'})</strong></div>
    <div style="margin-bottom:8px;">Purchase Price: <strong>${format(calculationResults.purchasePrice)}</strong></div>
    <div style="margin-bottom:8px;">Est. Resale Value (${calculationResults.ownershipDuration} yrs): <strong>${format(calculationResults.estimatedResaleValue)}</strong></div>
    <hr style="margin:10px 0;">
    <div style="margin-bottom:5px;"><strong>Annual Costs (Avg.):</strong></div>
    <div style="margin-bottom:3px;padding-left:10px;">Depreciation: ${format(calculationResults.annualDepreciation)}</div>
    <div style="margin-bottom:3px;padding-left:10px;">Fuel: ${format(calculationResults.annualFuelCost)}</div>
    <div style="margin-bottom:3px;padding-left:10px;">Insurance: ${format(calculationResults.annualInsuranceCost)}</div>
    <div style="margin-bottom:3px;padding-left:10px;">Tax: ${format(calculationResults.annualTaxCost)}</div>
    <div style="margin-bottom:8px;padding-left:10px;">Maintenance: ${format(calculationResults.annualMaintenanceCost)}</div>
    <hr style="margin:10px 0;">
    <div style="margin-bottom:8px;"><strong>Total Costs over ${calculationResults.ownershipDuration} years (NPV):</strong></div>
    <div style="margin-bottom:3px;padding-left:10px;">Depreciation: ${format(calculationResults.depreciationCost)}</div>
    <div style="margin-bottom:3px;padding-left:10px;">Fuel: ${format(calculationResults.fuelCostNPV)}</div>
    <div style="margin-bottom:3px;padding-left:10px;">Insurance: ${format(calculationResults.insuranceCostNPV)}</div>
    <div style="margin-bottom:3px;padding-left:10px;">Tax: ${format(calculationResults.taxCostNPV)}</div>
    <div style="margin-bottom:8px;padding-left:10px;">Maintenance: ${format(calculationResults.maintenanceCostNPV)}</div>
    <hr style="margin:10px 0;">
    <div style="font-weight:bold;margin-bottom:5px;">Total Net Ownership Cost: <span style="color:green;">${format(calculationResults.totalLifetimeCost)}</span></div>
    <div style="font-weight:bold;font-size:1.1em;">Estimated Monthly Cost: <span style="color:green;">${format(calculationResults.monthlyCost)}</span></div>
    <div style="font-size:0.8em; color:#777; margin-top:10px;">
      Based on ${calculationResults.annualMileage} km/year for ${calculationResults.ownershipDuration} years. All costs are estimates.
    </div>
  `;

  document.body.appendChild(container);
}

// Display lifetime cost results on the page
function displayLifetimeCost(productData, calculationResults) {
  console.log('Displaying lifetime cost results:', calculationResults);

  // Validate inputs
  if (!productData) {
    console.error('Product data is undefined in displayLifetimeCost');
    return;
  }
  
  if (!calculationResults) {
    console.error('Calculation results are undefined in displayLifetimeCost');
    // Try to create minimal calculationResults from productData
    calculationResults = {
      productType: productData.productType || 'clothing',
      totalLifetimeCost: (productData.price || 0) + 10, // Adjusted for new maintenance cost
      purchasePrice: productData.price || 0,
      maintenanceCostPerYear: 10, // Default non-zero maintenance cost
      totalMaintenanceCost: 10, // Default non-zero total maintenance cost
      annualCost: productData.price ? (productData.price / 1) : 0, // Lifespan 1 year
      lifespan: 1, // Default lifespan 1 year
      material: productData.material || 'Unknown',
      quality: 'medium'
    };
    console.log('Created fallback calculation results:', calculationResults);
  }

  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;top:10px;right:10px;background:#fff;border:1px solid #ccc;padding:10px;z-index:10000;box-shadow:0 0 10px rgba(0,0,0,0.1);cursor:move;';

  // Make the container draggable
  let isDragging = false;
  let offsetX, offsetY;

  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    const rect = container.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    // Set initial left and top based on current position,
    // and clear right/bottom styles to prevent resizing during drag.
    container.style.left = rect.left + 'px';
    container.style.top = rect.top + 'px';
    container.style.right = ''; // Clear the 'right' constraint
    container.style.bottom = ''; // Clear any 'bottom' constraint

    container.style.userSelect = 'none'; // Prevent text selection while dragging
  });

  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    container.style.left = (e.clientX - offsetX) + 'px';
    container.style.top = (e.clientY - offsetY) + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (isDragging) {
      isDragging = false;
      container.style.userSelect = ''; // Re-enable text selection
    }
  });

  // Build content for clothing
  if (calculationResults.productType === 'clothing') {
    container.innerHTML = `
      <div style="font-weight:700;font-size:1.2em;color:#0077b6;margin-bottom:10px;letter-spacing:1px;">LIFETIME COST CALCULATOR</div>
      <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <b style="flex:1;">${productData.name || 'Zara Product'}</b>
        <span style="font-weight:600;margin-left:10px;">${formatCurrency(productData.price)}</span>
      </div>
      <div style="margin-bottom:10px;">Material: <b>${calculationResults.material || 'N/A'}</b> (${calculationResults.quality || 'N/A'} quality)</div>
      <div style="margin-bottom:10px;">Estimated Lifespan: <b>${calculationResults.lifespan} years</b></div>
      <div style="margin-bottom:10px;">Annualized Cost: <b>${formatCurrency(calculationResults.annualCost)}</b></div>
      <div style="margin-bottom:10px;">Annual Maintenance Cost: <b>${formatCurrency(calculationResults.maintenanceCostPerYear)}</b></div>
      <div style="margin-bottom:10px;">Total Maintenance Cost: <b>${formatCurrency(calculationResults.totalMaintenanceCost)}</b></div>
      <div style="margin-bottom:10px;">Total Lifetime Cost: <span style="font-size:1.2em;color:#009900;font-weight:700;">${formatCurrency(calculationResults.totalLifetimeCost)}</span></div>
    `;
  } else {
    // Generic product
    container.innerHTML = `
      <div style="font-weight:700;font-size:1.2em;color:#0077b6;margin-bottom:10px;letter-spacing:1px;">LIFETIME COST CALCULATOR</div>
      <div style="margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <b style="flex:1;">${productData.name || 'Product'}</b>
        <span style="font-weight:600;margin-left:10px;">${formatCurrency(productData.price)}</span>
      </div>
      <div style="margin-bottom:10px;">Tipo: <b>${productData.productType || 'Product'}</b></div>
      <div style="margin-bottom:10px;">Prezzo: <b>${formatCurrency(productData.price)}</b></div>
      <div style="margin-bottom:10px;">Costo totale vita: <span style="font-size:1.2em;color:#009900;font-weight:700;">${formatCurrency(calculationResults.totalLifetimeCost)}</span></div>
    `;
  }

  document.body.appendChild(container);
}

// Helper function to format currency
function formatCurrency(value) {
  if (typeof value !== 'number' || isNaN(value)) {
    console.error('Invalid value passed to formatCurrency:', value);
    return '€0,00'; // Default fallback
  }
  
  // Get currency info from global context if available
  const globalProductData = window._ltcGeminiProductData || {};
  
  // Check if we have product data with currency info (function scope or global)
  if (typeof productData !== 'undefined' && productData && productData.originalCurrency) {
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
  } else if (globalProductData.originalCurrency) {
    // Try to use currency from global context
    const currency = globalProductData.originalCurrency;
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
  
  // Check hostname for Swiss site to default to CHF
  if (window.location.hostname.includes('.ch')) {
    return 'CHF ' + value.toFixed(2).replace('.', ',');
  }
  
  // Default to EUR if no currency info available
  return '€' + value.toFixed(2).replace('.', ',');
}
