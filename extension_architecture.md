# Chrome Extension Architecture - Lifetime Cost Calculator

## Overview
This document outlines the architecture for the Lifetime Cost Calculator Chrome extension. The extension will analyze product pages (focusing initially on refrigerators from saturn.de), extract relevant information, calculate the lifetime cost of the product, and display this information to the user.

## Component Diagram

```
┌─────────────────────────────────────┐
│            Chrome Browser           │
└───────────────────┬─────────────────┘
                    │
┌───────────────────▼─────────────────┐
│        Lifetime Cost Extension      │
│  ┌─────────────┐    ┌─────────────┐ │
│  │  Popup UI   │    │ Options Page│ │
│  └──────┬──────┘    └──────┬──────┘ │
│         │                  │        │
│  ┌──────▼──────────────────▼──────┐ │
│  │        Background Script       │ │
│  │  (Service Worker - Manifest V3)│ │
│  └──────────────┬────────────────┘ │
│                 │                   │
│  ┌──────────────▼────────────────┐ │
│  │         Content Script        │ │
│  └──────────────┬────────────────┘ │
│                 │                   │
│  ┌──────────────▼────────────────┐ │
│  │      Page Data Extractor      │ │
│  └──────────────┬────────────────┘ │
│                 │                   │
│  ┌──────────────▼────────────────┐ │
│  │    Lifetime Cost Calculator   │ │
│  └──────────────┬────────────────┘ │
│                 │                   │
│  ┌──────────────▼────────────────┐ │
│  │       Results Renderer        │ │
│  └─────────────────────────────────┘
└─────────────────────────────────────┘
```

## Component Descriptions

### 1. Popup UI
- Provides user interface when clicking the extension icon
- Displays current status (active/inactive)
- Shows summary of lifetime cost calculation for current product
- Allows user to configure settings (electricity rate, discount rate, etc.)

### 2. Options Page
- Detailed settings configuration
- Allows users to set default values for:
  - Electricity rate (per kWh)
  - Discount rate for NPV calculations
  - Expected lifespan for different appliance types
  - Maintenance cost estimates

### 3. Background Script (Service Worker)
- Manages the extension lifecycle
- Handles communication between components
- Stores user preferences using Chrome Storage API
- Detects when user navigates to a product page

### 4. Content Script
- Injected into product pages that match our URL patterns
- Coordinates the extraction, calculation, and display processes
- Communicates with the background script

### 5. Page Data Extractor
- Extracts product information from the page:
  - Product name and model
  - Purchase price
  - Energy efficiency rating
  - Annual energy consumption (kWh)
- Adapts to different website structures (initially focused on saturn.de)

### 6. Lifetime Cost Calculator
- Implements the calculation methodology from our research
- Calculates:
  - Energy costs over the product lifetime
  - Estimated maintenance costs
  - Net present value of all future costs
  - Total lifetime cost

### 7. Results Renderer
- Creates and injects the UI elements to display lifetime cost information
- Renders comparison with other products if available
- Provides detailed breakdown of costs

## Data Flow

1. **Initialization**:
   - Background script loads when browser starts
   - User preferences are loaded from Chrome Storage

2. **Page Navigation**:
   - Background script detects navigation to a product page
   - Content script is injected if URL matches patterns

3. **Data Extraction**:
   - Content script activates the Page Data Extractor
   - Product information is extracted from the DOM

4. **Calculation**:
   - Extracted data is passed to the Lifetime Cost Calculator
   - Calculator uses user preferences and extracted data to compute lifetime costs

5. **Display**:
   - Results Renderer creates UI elements
   - Lifetime cost information is displayed on the page

6. **User Interaction**:
   - User can interact with the displayed information
   - User can adjust settings via popup or options page
   - Changes trigger recalculation and update of displayed information

## Storage Structure

The extension will use Chrome Storage API to persist user preferences:

```json
{
  "preferences": {
    "electricityRate": 0.30,
    "discountRate": 0.02,
    "applianceLifespans": {
      "refrigerator": 10,
      "washingMachine": 8,
      "dishwasher": 9,
      "dryer": 8
    },
    "maintenanceCosts": {
      "refrigerator": {
        "averageRepairCost": 350,
        "expectedRepairs": 2
      },
      "washingMachine": {
        "averageRepairCost": 250,
        "expectedRepairs": 3
      },
      "dishwasher": {
        "averageRepairCost": 200,
        "expectedRepairs": 2
      },
      "dryer": {
        "averageRepairCost": 220,
        "expectedRepairs": 2
      }
    }
  }
}
```

## User Interface Mockups

### Popup UI
```
┌─────────────────────────────────┐
│  Lifetime Cost Calculator       │
├─────────────────────────────────┤
│  Status: Active                 │
│                                 │
│  Current Product:               │
│  Samsung RB34A7B5E22/EF         │
│                                 │
│  Purchase Price: €799           │
│  Lifetime Energy Cost: €873     │
│  Maintenance Cost: €700         │
│  Total Lifetime Cost: €2,372    │
│                                 │
│  [View Details]                 │
│                                 │
├─────────────────────────────────┤
│  Settings:                      │
│  Electricity Rate: €0.30/kWh    │
│  Discount Rate: 2%              │
│  [Open Settings]                │
└─────────────────────────────────┘
```

### Page Injection UI
```
┌─────────────────────────────────────────────────┐
│  LIFETIME COST CALCULATOR                       │
├─────────────────────────────────────────────────┤
│                                                 │
│  Total Cost of Ownership (10 years): €2,372     │
│                                                 │
│  Breakdown:                                     │
│  • Purchase Price: €799                         │
│  • Energy Cost (NPV): €873                      │
│  • Maintenance (NPV): €700                      │
│                                                 │
│  Annual Energy Consumption: 300 kWh             │
│  Energy Efficiency Class: A+++                  │
│                                                 │
│  [Show Calculation Details]                     │
│                                                 │
└─────────────────────────────────────────────────┘
```

## Technical Considerations

### Cross-Browser Compatibility
- Initially targeting Chrome, but architecture should support easy adaptation to other browsers
- Use standard Web APIs where possible

### Performance
- Minimize DOM operations for better performance
- Use efficient selectors for data extraction
- Cache calculation results to avoid redundant processing

### Security
- Follow Content Security Policy best practices
- Sanitize any data extracted from pages
- Use proper permission scopes

### Extensibility
- Design for easy addition of support for other e-commerce sites
- Allow for expansion to other product categories beyond refrigerators

## Next Steps
1. Implement core extension files (manifest.json, background script, content script)
2. Develop page content scraping functionality for saturn.de
3. Implement lifetime cost calculation logic
4. Create user interface for displaying results
5. Write documentation and usage guide
