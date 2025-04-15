# Lifetime Cost Calculator - Chrome Extension

## Overview

The Lifetime Cost Calculator is a Chrome extension that helps consumers make more informed purchasing decisions by calculating and displaying the total lifetime cost of products. When browsing product pages on saturn.de, the extension automatically extracts product information, calculates the lifetime cost including energy consumption and maintenance, and displays this information directly on the page.

## Features

- **Automatic Product Detection**: Automatically detects and analyzes product pages on saturn.de
- **Comprehensive Cost Calculation**: Calculates total cost of ownership including:
  - Purchase price
  - Energy consumption costs over the product's lifetime
  - Estimated maintenance costs
  - Net present value (NPV) calculations to account for the time value of money
- **Customizable Settings**: Allows users to customize:
  - Electricity rates
  - Discount rates for NPV calculations
  - Expected lifespans for different appliance types
  - Maintenance cost estimates
- **Visual Results**: Displays results directly on product pages with:
  - Summary of total lifetime cost
  - Breakdown of cost components
  - Detailed modal with visualizations
- **Popup Interface**: Quick access to cost information and settings

## Installation

### From Chrome Web Store (Recommended)

1. Visit the Chrome Web Store (link to be provided after publishing)
2. Click "Add to Chrome"
3. Confirm the installation when prompted

### Manual Installation (Developer Mode)

1. Download the extension files or clone the repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and visible in your browser toolbar

## Usage

### Viewing Lifetime Costs

1. Navigate to a product page on saturn.de (e.g., a refrigerator, washing machine, dishwasher, or dryer)
2. The extension will automatically detect the product and display a "Lifetime Cost Calculator" box on the page
3. This box shows:
   - Total cost of ownership over the product's lifetime
   - Breakdown of purchase price, energy costs, and maintenance costs
   - Annual energy consumption and energy efficiency class

### Viewing Detailed Information

1. Click the "Show Calculation Details" button in the calculator box
2. A modal will appear with:
   - Detailed product information
   - Comprehensive cost breakdown
   - Visual representation of cost components
   - Explanation of the calculation methodology

### Using the Popup Interface

1. Click the extension icon in the Chrome toolbar
2. If you're on a product page, the popup will show:
   - Product name and type
   - Summary of lifetime costs
   - Quick access to detailed information
3. If you're not on a product page, the popup will prompt you to navigate to a product page on saturn.de

### Customizing Settings

1. Click the extension icon in the Chrome toolbar
2. Click "Open Settings" at the bottom of the popup
3. In the settings page, you can customize:
   - **General Settings**:
     - Electricity Rate (€/kWh)
     - Discount Rate (%)
   - **Appliance Lifespan Settings**:
     - Expected lifespan for refrigerators, washing machines, dishwashers, and dryers
   - **Maintenance Cost Settings**:
     - Average repair cost for each appliance type
     - Expected number of repairs over the appliance's lifetime
4. Click "Save Settings" to apply your changes
5. If you're on a product page, the lifetime cost calculation will automatically update with your new settings

## Understanding the Calculations

### Total Lifetime Cost

The total lifetime cost is calculated as:

```
Total Lifetime Cost = Purchase Price + Energy Cost (NPV) + Maintenance Cost (NPV)
```

### Energy Cost

Energy cost is calculated based on:
- Annual energy consumption (kWh/year)
- Electricity rate (€/kWh)
- Expected appliance lifespan (years)
- Discount rate for NPV calculation

The formula used is:

```
Energy Cost (NPV) = Σ(Annual Energy Cost / (1 + Discount Rate)^Year)
```

Where:
- Annual Energy Cost = Annual Energy Consumption × Electricity Rate
- The sum is calculated for each year of the appliance's lifespan

### Maintenance Cost

Maintenance cost is calculated based on:
- Average repair cost
- Expected number of repairs over the appliance's lifetime
- Discount rate for NPV calculation

The formula used is:

```
Maintenance Cost (NPV) = Σ(Repair Cost / (1 + Discount Rate)^Year)
```

Where:
- Repair costs are distributed throughout the appliance's lifespan
- The sum is calculated for each repair event

### Net Present Value (NPV)

NPV is used to account for the time value of money. It recognizes that future costs are worth less than present costs due to factors like inflation and opportunity cost.

The discount rate used in NPV calculations can be customized in the extension settings.

## Supported Products

The extension currently supports the following product types on saturn.de:
- Refrigerators
- Washing Machines
- Dishwashers
- Dryers

Support for additional product types and websites may be added in future updates.

## Limitations

- The extension currently only works on saturn.de product pages
- Product information extraction may not be 100% accurate for all products
- Energy consumption estimates are used when exact values cannot be extracted
- Maintenance cost estimates are based on average values and may not reflect actual repair costs for specific products

## Troubleshooting

### Extension Not Detecting Products

If the extension is not detecting products on saturn.de:

1. Make sure you're on a product detail page (URL should contain "/product/")
2. Refresh the page
3. Check if the product is one of the supported types (refrigerator, washing machine, dishwasher, dryer)
4. If the issue persists, try disabling and re-enabling the extension

### Calculation Results Not Updating

If the calculation results don't update after changing settings:

1. Make sure you clicked "Save Settings" in the options page
2. Refresh the product page
3. If the issue persists, try restarting Chrome

### Other Issues

For other issues or to report bugs, please contact the developer at [contact information].

## Privacy

The Lifetime Cost Calculator extension:
- Does not collect or transmit any personal data
- Does not track your browsing history
- Only accesses data on saturn.de product pages
- Stores your preferences locally in your browser

## Future Enhancements

Planned enhancements for future versions include:
- Support for additional e-commerce websites
- Support for more product categories
- Product comparison functionality
- Export and sharing of calculation results
- Enhanced visualizations and charts

## Credits

Developed by [Your Name/Organization]

## License

[License Information]
