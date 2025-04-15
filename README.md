# Lifetime Cost Calculator Chrome Extension

This repository contains the code and documentation for a Chrome extension that calculates and displays the lifetime costs of products, focusing on appliances like refrigerators from saturn.de.

## Project Overview

The Lifetime Cost Calculator helps consumers make more informed purchasing decisions by showing the total cost of ownership over a product's lifetime, including:

- Initial purchase price
- Energy consumption costs over the product's lifespan
- Maintenance costs
- Net present value (NPV) calculations to account for the time value of money

## Repository Structure

```
chrome-extension-ltc/
├── code/                     # Extension source code
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
│   └── results_ui.js         # UI rendering for calculation results
├── docs/                     # Documentation
│   ├── extension_basics.md   # Research on Chrome extension basics
│   ├── lifetime_cost_calculation.md # Methodology for cost calculations
│   ├── extension_architecture.md # Component architecture design
│   ├── user_guide.md         # User documentation
│   └── developer_documentation.md # Technical documentation
└── README.md                 # This file
```

## Features

- **Automatic Product Detection**: Automatically detects and analyzes product pages on saturn.de
- **Comprehensive Cost Calculation**: Calculates total cost of ownership including purchase price, energy costs, and maintenance
- **Customizable Settings**: Allows users to customize electricity rates, discount rates, expected lifespans, and maintenance costs
- **Visual Results**: Displays results directly on product pages with breakdown of cost components
- **Popup Interface**: Quick access to cost information and settings

## Documentation

For detailed information, please refer to the following documentation:

- [User Guide](docs/user_guide.md) - Installation and usage instructions
- [Developer Documentation](docs/developer_documentation.md) - Technical details and architecture
- [Extension Architecture](docs/extension_architecture.md) - Component design and data flow
- [Lifetime Cost Calculation Methodology](docs/lifetime_cost_calculation.md) - Calculation formulas and approach

## Installation

### For Users

1. Download the latest release
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" using the toggle in the top-right corner
4. Click "Load unpacked" and select the `code` directory
5. The extension should now be installed and visible in your browser toolbar

### For Developers

1. Clone this repository
2. Navigate to the project directory
3. Follow the installation steps above
4. Make changes to the code as needed
5. Reload the extension in Chrome to test your changes

## Usage

1. Navigate to a product page on saturn.de (e.g., a refrigerator)
2. The extension will automatically detect the product and display a "Lifetime Cost Calculator" box on the page
3. View the total cost of ownership and breakdown of costs
4. Click "Show Calculation Details" for more information
5. Use the popup interface to access settings and customize calculation parameters

## License

[License Information]

## Credits

Developed by [Your Name/Organization]
