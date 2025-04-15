# Developer Documentation - Lifetime Cost Calculator Chrome Extension

## Project Structure

The Lifetime Cost Calculator Chrome extension is organized into the following structure:

```
chrome-extension-ltc/
├── code/
│   ├── manifest.json         # Extension manifest file
│   ├── background.js         # Background service worker
│   ├── content.js            # Content script for product pages
│   ├── content.css           # Styles for injected UI elements
│   ├── popup.html            # Popup UI HTML
│   ├── popup.js              # Popup UI script
│   ├── options.html          # Options page HTML
│   ├── options.js            # Options page script
│   ├── saturn_scraper.js     # Specialized scraping for saturn.de
│   ├── lifetime_calculator.js # Lifetime cost calculation logic
│   ├── results_ui.js         # UI rendering for calculation results
│   └── images/               # Extension icons and images
├── docs/
│   ├── extension_basics.md   # Research on Chrome extension basics
│   ├── lifetime_cost_calculation.md # Methodology for cost calculations
│   ├── extension_architecture.md # Component architecture design
│   └── user_guide.md         # User documentation
└── README.md                 # Project overview
```

## Component Overview

### 1. Manifest (manifest.json)

The manifest file defines the extension's metadata, permissions, and component relationships. Key configurations include:

- Manifest version 3 compliance
- Permissions for storage and activeTab
- Host permissions for saturn.de
- Content script injection patterns
- Background service worker registration
- Action popup configuration

### 2. Background Script (background.js)

The background script runs as a service worker and handles:

- Extension initialization and default preference setup
- Communication between content scripts and popup
- Badge status updates based on product detection
- Storage of current product data and calculation results

### 3. Content Script (content.js)

The content script is injected into saturn.de product pages and coordinates:

- Product page detection
- Data extraction via the SaturnScraper
- Lifetime cost calculation via the LifetimeCalculator
- Results display via the ResultsUI
- Communication with the background script

### 4. Saturn Scraper (saturn_scraper.js)

The SaturnScraper class provides specialized functionality for extracting product data from saturn.de pages:

- Product name and model extraction
- Price extraction with fallback mechanisms
- Energy consumption and efficiency class detection
- Product type determination
- Additional product details extraction (dimensions, capacity, etc.)

### 5. Lifetime Calculator (lifetime_calculator.js)

The LifetimeCalculator class implements the core calculation logic:

- Energy cost calculation over product lifespan
- Maintenance cost estimation
- Net present value (NPV) calculations
- Year-by-year cost breakdown
- Product comparison functionality
- Break-even point calculations

### 6. Results UI (results_ui.js)

The ResultsUI class handles the display of calculation results:

- Creation and insertion of UI elements on product pages
- Generation of detailed modal with cost breakdowns
- Simple visualization of cost components
- Handling of preference updates and recalculation

### 7. Popup UI (popup.html, popup.js)

The popup interface provides:

- Current extension status display
- Summary of lifetime cost calculation
- Quick access to detailed information
- Display of current user preferences
- Link to the options page

### 8. Options Page (options.html, options.js)

The options page allows users to customize:

- Electricity rate
- Discount rate for NPV calculations
- Expected lifespans for different appliance types
- Maintenance cost parameters

## Data Flow

1. **Initialization**:
   - Background script loads when browser starts
   - Default preferences are set if not already configured

2. **Page Navigation**:
   - User navigates to a product page on saturn.de
   - Content script is injected based on URL pattern matching

3. **Product Detection**:
   - Content script checks if the page is a product page
   - If confirmed, it initializes the SaturnScraper

4. **Data Extraction**:
   - SaturnScraper extracts product information:
     - Product name and model
     - Price
     - Energy consumption
     - Energy efficiency class
     - Product type

5. **Calculation**:
   - Content script retrieves user preferences from storage
   - LifetimeCalculator uses the extracted data and preferences to calculate:
     - Energy costs over the product lifetime
     - Maintenance costs
     - Total lifetime cost with NPV

6. **Results Display**:
   - ResultsUI creates and injects UI elements to display the calculation results
   - Results are shown directly on the product page

7. **Background Communication**:
   - Content script sends the product data and calculation results to the background script
   - Background script updates the extension icon badge and stores the data

8. **Popup Interaction**:
   - When user clicks the extension icon, popup retrieves and displays the current product data
   - Popup provides access to detailed information and settings

9. **Settings Update**:
   - User can modify calculation parameters in the options page
   - When settings are saved, content script is notified
   - Calculations are updated with new parameters
   - UI is refreshed to display updated results

## Key Algorithms

### Product Detection

```javascript
function isProductPage() {
  // Check URL pattern
  if (!window.location.href.includes('/product/')) {
    return false;
  }
  
  // Check for product-specific elements
  const productTitleElement = document.querySelector('.product-title, .product-name, h1.name');
  const priceElement = document.querySelector('.price, .product-price, .price-tag');
  
  return productTitleElement && priceElement;
}
```

### Lifetime Cost Calculation

```javascript
function calculateLifetimeCost(productData, preferences) {
  // Get relevant preferences
  const electricityRate = preferences.electricityRate;
  const discountRate = preferences.discountRate;
  const productType = productData.productType || 'refrigerator';
  const lifespan = preferences.applianceLifespans[productType] || 10;
  
  // Calculate annual energy cost
  const annualEnergyConsumption = productData.energyConsumption || 300;
  const annualEnergyCost = annualEnergyConsumption * electricityRate;
  
  // Calculate NPV of energy costs
  let energyNPV = 0;
  for (let year = 1; year <= lifespan; year++) {
    energyNPV += annualEnergyCost / Math.pow(1 + discountRate, year);
  }
  
  // Calculate NPV of maintenance costs
  const maintenanceInfo = preferences.maintenanceCosts[productType];
  const repairCost = maintenanceInfo.averageRepairCost;
  const numRepairs = maintenanceInfo.expectedRepairs;
  
  let maintenanceNPV = 0;
  for (let i = 1; i <= numRepairs; i++) {
    const repairYear = Math.round(i * lifespan / (numRepairs + 1));
    maintenanceNPV += repairCost / Math.pow(1 + discountRate, repairYear);
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
    energyEfficiencyClass: productData.energyEfficiencyClass
  };
}
```

## Extension Permissions

The extension requires the following permissions:

- **storage**: To store user preferences and current product data
- **activeTab**: To interact with the current tab
- **host_permissions for saturn.de**: To access and modify content on saturn.de pages

## Development and Testing

### Development Environment Setup

1. Clone the repository
2. Navigate to `chrome://extensions/` in Chrome
3. Enable Developer mode
4. Click "Load unpacked" and select the `code` directory
5. The extension should now be installed in development mode

### Testing Process

1. **Unit Testing**:
   - Test individual components (SaturnScraper, LifetimeCalculator, ResultsUI)
   - Verify calculation accuracy with known inputs and expected outputs

2. **Integration Testing**:
   - Test communication between components
   - Verify data flow from extraction to calculation to display

3. **End-to-End Testing**:
   - Navigate to various product pages on saturn.de
   - Verify product detection and data extraction
   - Check calculation results and UI rendering
   - Test user interactions with popup and options

### Common Issues and Solutions

1. **Product Detection Failures**:
   - Saturn may update their page structure
   - Solution: Update selectors in SaturnScraper class

2. **Data Extraction Errors**:
   - Energy information may be presented in different formats
   - Solution: Add additional pattern matching in extraction methods

3. **UI Rendering Issues**:
   - Page structure may affect where UI elements are inserted
   - Solution: Add more fallback insertion points in ResultsUI

## Extension Publishing

### Preparing for Chrome Web Store

1. Create production build:
   - Ensure all code is minified and optimized
   - Update version number in manifest.json
   - Prepare promotional images and screenshots

2. Create ZIP file of the `code` directory

3. Submit to Chrome Web Store:
   - Create developer account if needed
   - Fill out store listing information
   - Upload ZIP file
   - Submit for review

### Post-Publishing Maintenance

1. Monitor user feedback and reviews
2. Address bugs and issues promptly
3. Plan and implement feature enhancements
4. Update the extension when saturn.de changes their page structure

## Future Development

### Planned Enhancements

1. **Additional Website Support**:
   - Extend functionality to other e-commerce sites
   - Create abstract scraper class with site-specific implementations

2. **More Product Categories**:
   - Add support for additional appliance types
   - Implement category-specific calculation parameters

3. **Product Comparison**:
   - Allow users to compare lifetime costs between multiple products
   - Implement break-even point visualization

4. **Data Export**:
   - Add functionality to export calculation results
   - Support sharing results via email or social media

5. **Enhanced Visualizations**:
   - Implement interactive charts using a charting library
   - Add year-by-year cost breakdown visualization

### Implementation Roadmap

1. **Version 1.1**: Bug fixes and UI improvements
2. **Version 1.2**: Additional product categories
3. **Version 1.5**: Product comparison functionality
4. **Version 2.0**: Support for additional websites

## Conclusion

The Lifetime Cost Calculator Chrome extension provides a valuable tool for consumers to make more informed purchasing decisions by considering the total cost of ownership. The modular architecture allows for easy maintenance and extension of functionality in the future.
