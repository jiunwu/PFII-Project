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
        maintenanceCosts: {
          refrigerator: {
            averageRepairCost: 350,
            expectedRepairs: 2
          },
          washingMachine: {
            averageRepairCost: 250,
            expectedRepairs: 3
          },
          dishwasher: {
            averageRepairCost: 200,
            expectedRepairs: 2
          },
          dryer: {
            averageRepairCost: 220,
            expectedRepairs: 2
          }
        }
      };
      
      chrome.storage.sync.set({ preferences: defaultPreferences });
      console.log('Default preferences initialized:', defaultPreferences);
    }
  });
});

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
      tabId: sender.tab.id
    });
    chrome.action.setBadgeBackgroundColor({ 
      color: '#4CAF50',
      tabId: sender.tab.id
    });
    
    // Store the product data for use in the popup
    chrome.storage.local.set({ 
      currentProduct: message.productData,
      calculationResults: message.calculationResults
    });
    
    return true;
  }
  
  if (message.type === 'NO_PRODUCT') {
    // Update extension icon to indicate inactive state
    chrome.action.setBadgeText({ 
      text: 'OFF',
      tabId: sender.tab.id
    });
    chrome.action.setBadgeBackgroundColor({ 
      color: '#757575',
      tabId: sender.tab.id
    });
    
    // Clear stored product data
    chrome.storage.local.remove(['currentProduct', 'calculationResults']);
    
    return true;
  }
});

// Listen for tab updates to check if we're on a product page
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if the URL matches a product page pattern
    const isProductPage = tab.url.match(/saturn\.de\/.*\/product\//);
    
    if (isProductPage) {
      console.log('Product page detected:', tab.url);
      // The content script will be automatically injected based on the manifest.json matches
    } else {
      // Reset badge if not on a product page
      chrome.action.setBadgeText({ 
        text: '',
        tabId: tabId
      });
    }
  }
});
