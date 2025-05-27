// background.js - Service Worker for Lifetime Cost Calculator Extension

// Initialize default settings when the extension is installed
chrome.runtime.onInstalled.addListener(() => {
  // Set default preferences
  chrome.storage.sync.get('preferences', (data) => {
    if (!data.preferences) {
      const defaultPreferences = {
        electricityRate: 0.30, // €/kWh
        discountRate: 0.02, // 2%
        applianceLifespans: {
          refrigerator: 10,
          washingMachine: 8,
          dishwasher: 9,
          dryer: 8
        },
        // Car-specific settings
        carOwnershipDuration: 5, // years
        annualMileage: 15000, // km per year
        gasolinePrice: 1.90, // CHF per liter
        dieselPrice: 1.95, // CHF per liter
        electricityRate: 0.25 // CHF per kWh for EVs
      };
      
      chrome.storage.sync.set({ preferences: defaultPreferences });
      console.log('Default preferences initialized:', defaultPreferences);
    }
  });
});

let lastProductData = null;
let lastCalculationResults = null;

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PREFERENCES') {
    // Return user preferences to content script
    chrome.storage.sync.get('preferences', (data) => {
      sendResponse({ preferences: data.preferences });
    });
    return true; // Required for asynchronous response
  }
  
  if (message.type === 'PRODUCT_DETECTED') {
    // Update extension icon to indicate active state
    chrome.action.setBadgeText({ 
      text: 'ON',
      tabId: sender.tab && sender.tab.id
    });
    chrome.action.setBadgeBackgroundColor({ 
      color: '#4CAF50',
      tabId: sender.tab && sender.tab.id
    });
    
    // Store the product data for use in the popup
    chrome.storage.local.set({ 
      currentProduct: message.productData,
      calculationResults: message.calculationResults
    });

    lastProductData = message.productData;
    lastCalculationResults = message.calculationResults;
    
    return;
  }
  
  if (message.type === 'NO_PRODUCT') {
    console.log('NO_PRODUCT message received from tab:', sender.tab ? sender.tab.id : 'unknown');
    const tabId = sender.tab ? sender.tab.id : null;

    if (tabId) {
      chrome.action.setBadgeText({ text: 'OFF', tabId: tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#757575', tabId: tabId });
    }

    // Only clear the global/popup-visible data if the message is from the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      if (activeTabs && activeTabs.length > 0 && tabId && activeTabs[0].id === tabId) {
        console.log('NO_PRODUCT from active tab. Clearing global product data.');
        lastProductData = null;
        lastCalculationResults = null;
        chrome.storage.local.remove(['currentProduct', 'calculationResults']);
      } else if (!tabId && activeTabs.length === 0) {
        // Fallback if tabId is not available but we are sure it's not a tab context (e.g. service worker itself)
        // Or if we want to be more aggressive (though current logic is safer for multi-tab)
        console.log('NO_PRODUCT from non-tab context or no active tab. Clearing global product data.');
        lastProductData = null;
        lastCalculationResults = null;
        chrome.storage.local.remove(['currentProduct', 'calculationResults']);
      }
      else {
        console.log('NO_PRODUCT from non-active tab or tabId unknown. Global product data remains unchanged.');
      }
    });
    return; // No sendResponse needed
  }

  if (message.type === 'GET_LAST_PRODUCT') {
    sendResponse({
      productData: lastProductData,
      calculationResults: lastCalculationResults
    });
    return true;
  }
});

// Listen for tab updates to check if we're on a product page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // When an active tab starts loading, clear its stale data
  if (changeInfo.status === 'loading') {
    chrome.tabs.query({ active: true, currentWindow: true }, (activeTabs) => {
      if (activeTabs && activeTabs.length > 0 && activeTabs[0].id === tabId) {
        console.log(`Active tab ${tabId} started loading. Clearing lastProductData.`);
        lastProductData = null;
        lastCalculationResults = null;
        chrome.storage.local.remove(['currentProduct', 'calculationResults']);
        // Reset badge for this tab
        chrome.action.setBadgeText({ text: '', tabId: tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#757575', tabId: tabId }); // Default/inactive color
      }
    });
  }

  if (changeInfo.status === 'complete' && tab.url) {
    // Check if the URL matches a product page pattern
    const isProductPage = tab.url.match(/saturn\.de\/.*\/product\//) || tab.url.match(/zara\.com\/.*\/product\//);
    
    // Check for tutti.ch car pages
    const isTuttiCarPage = tab.url.match(/tutti\.ch\/.*\/(auto|automobili|autos)\//);
    
    if (isProductPage || isTuttiCarPage) {
      console.log('Product page detected:', tab.url);
      // The content script will be automatically injected based on the manifest.json matches
      console.log('Injecting content script into tab:', tabId);
     
    } else {
      // Reset badge if not on a product page
      chrome.action.setBadgeText({ 
        text: '',
        tabId: tabId
      });
    }
  }
});

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
