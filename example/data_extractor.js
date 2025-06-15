// data_extractor.js
console.log('xCost: data_extractor.js loaded');

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
- Expected number of repairs (integer, over the product\'s typical lifespan)
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
    let productData = null;
    const pageText = document.body.innerText; // Get page text once, early

    // Attempt to use data from page_detector if available
    if (window._ltcGeminiProductData) {
      console.log('Using pre-fetched product data from page_detector:', window._ltcGeminiProductData);
      productData = window._ltcGeminiProductData;
      // window._ltcGeminiProductData = null; // Optional: Clear it after use
    } else {
      const hostname = window.location.hostname;
      const isCarPageForGemini = hostname.includes('tutti.ch') &&
                               (currentUrl.includes('/auto/') ||
                                currentUrl.includes('/automobili/') ||
                                currentUrl.includes('/autos/'));
      console.log('Calling Gemini for product data in extractProductData. isCar:', isCarPageForGemini);
      productData = await callGeminiAPIForProductData(pageText, isCarPageForGemini);
    }

    if (productData) {
      // If productType from Gemini is missing, undefined, or explicitly 'unknown',
      // use determineProductType from utils.js to set it.
      if (!productData.productType || productData.productType === 'unknown' || productData.productType === undefined) {
        console.log(`Product type from Gemini is '${productData.productType}'. Attempting to set with determineProductType.`);
        const determinedType = determineProductType(pageText); // function from utils.js
        if (determinedType && determinedType !== 'unknown') {
          productData.productType = determinedType;
          console.log(`Product type set to '${determinedType}' by determineProductType.`);
        } else {
          console.log(`determineProductType also resulted in '${determinedType}'. Product type remains '${productData.productType}'.`);
        }
      }

      // Ensure 'car' type for tutti.ch car pages if not already correctly set
      const hostname = window.location.hostname; // pageText is already defined above
      const isTuttiCarPage = hostname.includes('tutti.ch') &&
                           (currentUrl.includes('/auto/') ||
                            currentUrl.includes('/automobili/') ||
                            currentUrl.includes('/autos/'));
      if (isTuttiCarPage && productData.productType !== 'car') {
          console.log(`Page is a tutti.ch car page, but productType is '${productData.productType}'. Setting/correcting to 'car'.`);
          productData.productType = 'car';
      }

      // Ensure 'clothing' type for Zara pages if not already correctly set
      // determineProductType has logic for Zara, this is a further fallback/assurance.
      if (window.location.hostname.includes('zara.com') && productData.productType !== 'clothing') {
        const typeFromUtilForZara = determineProductType(pageText); // function from utils.js
        if (typeFromUtilForZara === 'clothing') {
            productData.productType = 'clothing';
            console.log("Ensured productType is 'clothing' for Zara page via determineProductType.");
        } else if (!productData.productType || productData.productType === 'unknown') {
            // If Gemini gave nothing/unknown, and util also didn't give clothing specifically
            productData.productType = 'clothing';
            console.log("Final fallback: Set productType to 'clothing' for Zara page as it was still not specific.");
        } else {
            console.log(`Zara page, productType is '${productData.productType}', not overriding to 'clothing' unless util specifically said so or type was unknown.`);
        }
      }
      
    } else {
      console.log('Gemini API (or pre-fetched data) did not return product data. Cannot determine product type.');
      // If productData is null, we can't add a type to it.
      // content.js will handle the "Could not extract product data" message.
    }

    console.log('Final product data before returning from extractProductData:', productData);
    return productData;

  } catch (error) {
    console.error('Error extracting product data with Gemini or fallback:', error);
    return null;
  }
}

// Helper function to parse price from text
function parsePrice(priceText) {
  if (!priceText) return null;
  
  let currency = 'EUR'; // Default
  if (priceText.includes('CHF') || priceText.includes('Fr.')) currency = 'CHF';
  else if (priceText.includes('$')) currency = 'USD';
  else if (priceText.includes('£')) currency = 'GBP';
  
  if (/^\s*\d+[,.]?\d*\s*$/.test(priceText.trim())) {
    const normalizedString = priceText.trim().replace(',', '.');
    const price = parseFloat(normalizedString);
    if (!isNaN(price)) return { amount: price, currency: currency };
  }
  
  const cleanText = priceText.replace(/\s+/g, '');
  let match = cleanText.match(/([0-9]+[,.][0-9]{1,2})/);
  if (!match) match = cleanText.match(/([0-9]+)/);
  if (!match) {
    match = cleanText.match(/€([0-9]+[,.][0-9]{1,2})/);
    if (!match) match = cleanText.match(/CHF([0-9]+[,.][0-9]{1,2})/);
    if (!match) match = cleanText.match(/Fr\.([0-9]+[,.][0-9]{1,2})/);
    if (!match) match = cleanText.match(/\$([0-9]+[,.][0-9]{1,2})/);
    if (!match) match = cleanText.match(/£([0-9]+[,.][0-9]{1,2})/);
  }
  
  if (match && match[1]) {
    const normalizedString = match[1].replace(',', '.');
    const price = parseFloat(normalizedString);
    return { amount: price, currency: currency };
  }
  
  const weirdFormat = priceText.match(/(\d+)\s*(?:CHF|€|\$|£)\s*(\d{2})/i);
  if (weirdFormat) {
    const price = parseFloat(`${weirdFormat[1]}.${weirdFormat[2]}`);
    if (!isNaN(price)) return { amount: price, currency: currency };
  }
  
  const anyNumber = cleanText.match(/([0-9]+[,.][0-9]+)/);
  if (anyNumber && anyNumber[1]) {
    const normalizedString = anyNumber[1].replace(',', '.');
    const price = parseFloat(normalizedString);
    return { amount: price, currency: currency };
  }
  
  const justNumbers = priceText.replace(/[^\d.,]/g, '').trim();
  if (justNumbers) {
    let normalizedString = justNumbers;
    if ((justNumbers.match(/[.,]/g) || []).length > 1) {
      const lastSeparatorIndex = Math.max(justNumbers.lastIndexOf('.'), justNumbers.lastIndexOf(','));
      if (lastSeparatorIndex !== -1) {
        const beforeLastSeparator = justNumbers.substring(0, lastSeparatorIndex).replace(/[.,]/g, '');
        const afterLastSeparator = justNumbers.substring(lastSeparatorIndex + 1);
        normalizedString = beforeLastSeparator + '.' + afterLastSeparator;
      }
    } else {
      normalizedString = justNumbers.replace(',', '.');
    }
    const price = parseFloat(normalizedString);
    if (!isNaN(price)) return { amount: price, currency: currency };
  }
  
  console.warn('Could not parse price from:', priceText);
  return null;
}

// Extract energy consumption from Gemini API result
function extractEnergyConsumption() {
  const productData = window._ltcGeminiProductData; // Assumes this is set by extractProductData
  if (productData && productData.energyConsumption) {
    return productData.energyConsumption;
  }
  return 300; // Fallback default
}

// Extract energy efficiency class from Gemini API result
function extractEnergyEfficiencyClass() {
  const productData = window._ltcGeminiProductData; // Assumes this is set by extractProductData
  if (productData && productData.energyEfficiencyClass) {
    return productData.energyEfficiencyClass;
  }
  return 'Unknown';
}
