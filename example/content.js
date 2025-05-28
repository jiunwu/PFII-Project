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
              if (productData.productType === 'car') {
                console.log('Calculating car lifetime costs...');
                // calculateCarLifetimeCost is now in lifetime_calculator.js
                calculationResults = calculateCarLifetimeCost(productData, response.preferences);
                console.log('Car calculation results:', calculationResults);
              } else {
                console.log('Calculating appliance lifetime costs...');
                // calculateLifetimeCost is now in lifetime_calculator.js
                calculationResults = calculateLifetimeCost(productData, response.preferences);
                console.log('Appliance calculation results:', calculationResults);
              }

              // Display results on the page
              if (productData.productType === 'car') {
                console.log('Displaying car lifetime cost...');
                // displayCarLifetimeCost is now in results_ui.js
                displayCarLifetimeCost(productData, calculationResults);
              } else {
                console.log('Displaying appliance lifetime cost...');
                // displayLifetimeCost is now in results_ui.js
                displayLifetimeCost(productData, calculationResults);
              }

              // Notify background script that a product was detected
              chrome.runtime.sendMessage({ 
                type: 'PRODUCT_DETECTED',
                productData: productData,
                calculationResults: calculationResults
              });
              
            } else {
              // Handle missing preferences, perhaps by using default calculation or showing an error/prompt.
              console.warn('User preferences not available. Using default calculations or showing minimal info.');
              if (productData.productType === 'car') {
                const minimalCarResults = calculateCarLifetimeCost(productData, {}); // Use empty prefs for defaults
                displayCarLifetimeCost(productData, minimalCarResults);
              } else {
                const fallbackResults = {
                  totalLifetimeCost: productData.price,
                  purchasePrice: productData.price,
                  productType: productData.productType || 'clothing' // Ensure productType is available
                };
                // displayLifetimeCost is now in results_ui.js
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

// All other functions (isProductPage, callGeminiAPIForProductData, extractProductData, parsePrice, 
// extractEnergyConsumption, extractEnergyEfficiencyClass, determineProductType, 
// calculateLifetimeCost, calculateCarLifetimeCost, displayCarLifetimeCost, displayLifetimeCost)
// have been moved to their respective modules (page_detector.js, data_extractor.js, 
// utils.js, lifetime_calculator.js, results_ui.js) and are loaded globally via manifest.json.
