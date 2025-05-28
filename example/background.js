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

  if (message.type === 'SAVE_CAR_CALCULATION') {
    console.log('SAVE_CAR_CALCULATION message received:', message.productData, message.calculationResults);
    chrome.storage.local.get({ savedCarCalculations: [] }, (data) => {
      const savedCalculations = data.savedCarCalculations;
      savedCalculations.push({
        productData: message.productData,
        calculationResults: message.calculationResults,
        savedAt: new Date().toISOString()
      });
      chrome.storage.local.set({ savedCarCalculations: savedCalculations }, () => {
        if (chrome.runtime.lastError) {
          console.error('Error saving car calculation:', chrome.runtime.lastError);
          sendResponse({ status: 'error', message: chrome.runtime.lastError.message });
        } else {
          console.log('Car calculation saved successfully', savedCalculations);
          sendResponse({ status: 'success' });
        }
      });
    });
    return true; // Required for asynchronous response
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
    // This check is simplified as content scripts handle detailed detection
    // The primary purpose here is for badge updates if needed, though content script can also manage this.
    console.log('Tab update complete for URL:', tab.url);
    // The content script will be automatically injected based on the manifest.json matches
    // and will send a message (PRODUCT_DETECTED or NO_PRODUCT) to update the badge.
  }
});
