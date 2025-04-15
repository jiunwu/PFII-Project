// saturn_scraper.js - Specialized scraping functionality for saturn.de product pages

/**
 * SaturnScraper - A specialized module for extracting product information from saturn.de
 * This module provides more robust and specific scraping functionality for saturn.de product pages
 */
class SaturnScraper {
  /**
   * Extract all relevant product data from a saturn.de product page
   * @returns {Object|null} Product data object or null if extraction fails
   */
  extractProductData() {
    try {
      return {
        name: this.extractProductName(),
        price: this.extractPrice(),
        energyConsumption: this.extractEnergyConsumption(),
        energyEfficiencyClass: this.extractEnergyEfficiencyClass(),
        productType: this.determineProductType(),
        productDetails: this.extractProductDetails()
      };
    } catch (error) {
      console.error('Error extracting product data:', error);
      return null;
    }
  }

  /**
   * Extract the product name from the page
   * @returns {string} Product name
   */
  extractProductName() {
    // Saturn typically uses these selectors for product names
    const selectors = [
      'h1.Typostyled__StyledInfoTypo-sc-1jga2g7-0', // Current selector (as of 2025)
      '.product-name',
      '.product-title',
      'h1[data-test="product-title"]',
      'h1.name'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback: try to find any h1 that might contain the product name
    const h1Elements = document.querySelectorAll('h1');
    for (const h1 of h1Elements) {
      if (h1.textContent.trim() && !h1.textContent.includes('Saturn') && !h1.textContent.includes('Anmelden')) {
        return h1.textContent.trim();
      }
    }

    throw new Error('Could not extract product name');
  }

  /**
   * Extract the product price from the page
   * @returns {number} Product price as a float
   */
  extractPrice() {
    // Saturn typically uses these selectors for prices
    const selectors = [
      '[data-test="product-price"]',
      '.price-tag',
      '.product-price',
      '.price-container .price',
      '.price-box .price'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return this.parsePrice(element.textContent);
      }
    }

    // Fallback: look for elements containing price-like text
    const priceRegex = /(\d+[,.]\d+)\s*€/;
    const textNodes = this.getAllTextNodes(document.body);
    
    for (const node of textNodes) {
      const match = node.textContent.match(priceRegex);
      if (match && match[1]) {
        return this.parsePrice(match[1] + ' €');
      }
    }

    throw new Error('Could not extract product price');
  }

  /**
   * Parse a price string into a float
   * @param {string} priceText - Price text to parse
   * @returns {number} Price as a float
   */
  parsePrice(priceText) {
    if (!priceText) return null;
    
    // Remove currency symbols and non-numeric characters except decimal point and comma
    const numericString = priceText.replace(/[^0-9,.]/g, '');
    
    // Replace comma with dot for decimal point (European format)
    const normalizedString = numericString.replace(',', '.');
    
    return parseFloat(normalizedString);
  }

  /**
   * Extract the annual energy consumption from the page
   * @returns {number|null} Annual energy consumption in kWh or null if not found
   */
  extractEnergyConsumption() {
    // Look in product specifications table
    const specRows = document.querySelectorAll('.product-specs tr, .product-details tr, .technical-details tr, [data-test="feature-list"] > div');
    
    for (const row of specRows) {
      const text = row.textContent.toLowerCase();
      
      // Look for energy consumption indicators
      if (text.includes('energieverbrauch') || 
          text.includes('energy consumption') || 
          text.includes('stromverbrauch') ||
          text.includes('kwh/jahr') ||
          text.includes('kwh/year')) {
        
        // Extract the numeric value
        const match = text.match(/(\d+[\.,]?\d*)\s*kwh/i);
        if (match && match[1]) {
          return parseFloat(match[1].replace(',', '.'));
        }
      }
    }
    
    // Look for energy label image
    const energyLabelImg = document.querySelector('img[src*="energy-label"], img[src*="energielabel"], img[alt*="energy"], img[alt*="energie"]');
    if (energyLabelImg) {
      // Energy consumption is often near the energy label
      const parentElement = energyLabelImg.closest('div');
      if (parentElement) {
        const text = parentElement.textContent;
        const match = text.match(/(\d+[\.,]?\d*)\s*kwh/i);
        if (match && match[1]) {
          return parseFloat(match[1].replace(',', '.'));
        }
      }
    }
    
    // If we couldn't find the energy consumption, estimate based on energy class
    const energyClass = this.extractEnergyEfficiencyClass();
    if (energyClass) {
      return this.estimateEnergyConsumptionFromClass(energyClass);
    }
    
    // Default fallback values based on product type
    const productType = this.determineProductType();
    switch (productType) {
      case 'refrigerator': return 300; // Average for refrigerators
      case 'washingMachine': return 200; // Average for washing machines
      case 'dishwasher': return 250; // Average for dishwashers
      case 'dryer': return 500; // Average for dryers
      default: return 300; // General fallback
    }
  }

  /**
   * Extract the energy efficiency class from the page
   * @returns {string} Energy efficiency class (A+++, A++, etc.) or "Unknown"
   */
  extractEnergyEfficiencyClass() {
    // Look in product specifications table
    const specRows = document.querySelectorAll('.product-specs tr, .product-details tr, .technical-details tr, [data-test="feature-list"] > div');
    
    for (const row of specRows) {
      const text = row.textContent.toLowerCase();
      
      // Look for energy class indicators
      if (text.includes('energieeffizienzklasse') || 
          text.includes('energy class') || 
          text.includes('energy efficiency') ||
          text.includes('effizienzklasse')) {
        
        // Look for energy class (A+++, A++, A+, A, B, C, D, E, F, G)
        const match = text.match(/klasse\s*([A-G]\+*)/i) || 
                      text.match(/class\s*([A-G]\+*)/i) ||
                      text.match(/([A-G]\+{1,3})/i);
        
        if (match && match[1]) {
          return match[1].toUpperCase();
        }
      }
    }
    
    // Look for energy label image and check nearby text
    const energyLabelImg = document.querySelector('img[src*="energy-label"], img[src*="energielabel"], img[alt*="energy"], img[alt*="energie"]');
    if (energyLabelImg) {
      const parentElement = energyLabelImg.closest('div');
      if (parentElement) {
        const text = parentElement.textContent;
        const match = text.match(/([A-G]\+{1,3})/i);
        if (match && match[1]) {
          return match[1].toUpperCase();
        }
      }
    }
    
    // Look for energy class in any image alt text
    const images = document.querySelectorAll('img');
    for (const img of images) {
      if (img.alt && img.alt.match(/([A-G]\+{1,3})/i)) {
        const match = img.alt.match(/([A-G]\+{1,3})/i);
        if (match && match[1]) {
          return match[1].toUpperCase();
        }
      }
    }
    
    return 'Unknown';
  }

  /**
   * Determine the product type based on page content
   * @returns {string} Product type (refrigerator, washingMachine, etc.)
   */
  determineProductType() {
    const pageText = document.body.textContent.toLowerCase();
    const url = window.location.href.toLowerCase();
    
    // Check URL first as it's often more reliable
    if (url.includes('kuehlschrank') || url.includes('kuhlschrank') || url.includes('refrigerator')) {
      return 'refrigerator';
    } else if (url.includes('waschmaschine') || url.includes('washing-machine')) {
      return 'washingMachine';
    } else if (url.includes('geschirrspuler') || url.includes('geschirrspüler') || url.includes('dishwasher')) {
      return 'dishwasher';
    } else if (url.includes('trockner') || url.includes('dryer')) {
      return 'dryer';
    }
    
    // Check page content as fallback
    if (pageText.includes('kühlschrank') || pageText.includes('kuehlschrank') || 
        pageText.includes('refrigerator') || pageText.includes('fridge')) {
      return 'refrigerator';
    } else if (pageText.includes('waschmaschine') || pageText.includes('washing machine')) {
      return 'washingMachine';
    } else if (pageText.includes('geschirrspüler') || pageText.includes('geschirrspuler') || 
               pageText.includes('dishwasher')) {
      return 'dishwasher';
    } else if (pageText.includes('trockner') || pageText.includes('dryer')) {
      return 'dryer';
    }
    
    // Check product categories if available
    const breadcrumbs = document.querySelectorAll('.breadcrumb a, .breadcrumbs a, nav[aria-label="breadcrumb"] a');
    for (const crumb of breadcrumbs) {
      const text = crumb.textContent.toLowerCase();
      if (text.includes('kühl') || text.includes('kuhl') || text.includes('refrig') || text.includes('fridge')) {
        return 'refrigerator';
      } else if (text.includes('wasch') || text.includes('wash')) {
        return 'washingMachine';
      } else if (text.includes('geschirr') || text.includes('dish')) {
        return 'dishwasher';
      } else if (text.includes('trockn') || text.includes('dry')) {
        return 'dryer';
      }
    }
    
    return 'unknown';
  }

  /**
   * Extract additional product details that might be useful
   * @returns {Object} Object containing additional product details
   */
  extractProductDetails() {
    const details = {};
    
    // Extract product model/SKU
    details.model = this.extractModelNumber();
    
    // Extract brand
    details.brand = this.extractBrand();
    
    // Extract dimensions if available
    const dimensions = this.extractDimensions();
    if (dimensions) {
      details.dimensions = dimensions;
    }
    
    // Extract capacity for refrigerators
    if (this.determineProductType() === 'refrigerator') {
      details.capacity = this.extractCapacity();
    }
    
    return details;
  }

  /**
   * Extract the product model number
   * @returns {string|null} Model number or null if not found
   */
  extractModelNumber() {
    // Look in product specifications table
    const specRows = document.querySelectorAll('.product-specs tr, .product-details tr, .technical-details tr, [data-test="feature-list"] > div');
    
    for (const row of specRows) {
      const text = row.textContent.toLowerCase();
      
      if (text.includes('modell') || text.includes('model') || 
          text.includes('artikelnummer') || text.includes('article number') ||
          text.includes('sku') || text.includes('bestellnummer')) {
        
        // Extract the model number - typically alphanumeric
        const modelText = row.textContent.split(':').pop().trim();
        if (modelText) {
          return modelText;
        }
      }
    }
    
    // Try to extract from the page title or product name
    const productName = this.extractProductName();
    if (productName) {
      // Model numbers often appear in parentheses or after the product name
      const match = productName.match(/\(([A-Za-z0-9\-_]+)\)/) || 
                    productName.match(/([A-Z0-9]+[A-Z0-9\-_]+)$/);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }

  /**
   * Extract the product brand
   * @returns {string|null} Brand name or null if not found
   */
  extractBrand() {
    // Look for brand in breadcrumbs
    const breadcrumbs = document.querySelectorAll('.breadcrumb a, .breadcrumbs a, nav[aria-label="breadcrumb"] a');
    for (const crumb of breadcrumbs) {
      const text = crumb.textContent.trim();
      // Common appliance brands
      const brands = ['Samsung', 'LG', 'Bosch', 'Siemens', 'AEG', 'Miele', 'Beko', 
                      'Liebherr', 'Gorenje', 'Bauknecht', 'Grundig', 'Haier', 'Hisense'];
      
      for (const brand of brands) {
        if (text.includes(brand)) {
          return brand;
        }
      }
    }
    
    // Look in product name
    const productName = this.extractProductName();
    if (productName) {
      const brands = ['Samsung', 'LG', 'Bosch', 'Siemens', 'AEG', 'Miele', 'Beko', 
                      'Liebherr', 'Gorenje', 'Bauknecht', 'Grundig', 'Haier', 'Hisense'];
      
      for (const brand of brands) {
        if (productName.includes(brand)) {
          return brand;
        }
      }
    }
    
    return null;
  }

  /**
   * Extract product dimensions
   * @returns {Object|null} Object with width, height, depth or null if not found
   */
  extractDimensions() {
    // Look in product specifications table
    const specRows = document.querySelectorAll('.product-specs tr, .product-details tr, .technical-details tr, [data-test="feature-list"] > div');
    
    let width = null;
    let height = null;
    let depth = null;
    
    for (const row of specRows) {
      const text = row.textContent.toLowerCase();
      
      if (text.includes('breite') || text.includes('width')) {
        const match = text.match(/(\d+[\.,]?\d*)\s*cm/i);
        if (match && match[1]) {
          width = parseFloat(match[1].replace(',', '.'));
        }
      }
      
      if (text.includes('höhe') || text.includes('hohe') || text.includes('height')) {
        const match = text.match(/(\d+[\.,]?\d*)\s*cm/i);
        if (match && match[1]) {
          height = parseFloat(match[1].replace(',', '.'));
        }
      }
      
      if (text.includes('tiefe') || text.includes('depth')) {
        const match = text.match(/(\d+[\.,]?\d*)\s*cm/i);
        if (match && match[1]) {
          depth = parseFloat(match[1].replace(',', '.'));
        }
      }
    }
    
    if (width || height || depth) {
      return { width, height, depth };
    }
    
    return null;
  }

  /**
   * Extract refrigerator capacity
   * @returns {number|null} Capacity in liters or null if not found
   */
  extractCapacity() {
    // Look in product specifications table
    const specRows = document.querySelectorAll('.product-specs tr, .product-details tr, .technical-details tr, [data-test="feature-list"] > div');
    
    for (const row of specRows) {
      const text = row.textContent.toLowerCase();
      
      if (text.includes('fassungsvermögen') || text.includes('kapazität') || 
          text.includes('capacity') || text.includes('volumen') || 
          text.includes('nutzinhalt') || text.includes('volume')) {
        
        const match = text.match(/(\d+[\.,]?\d*)\s*l/i) || 
                      text.match(/(\d+[\.,]?\d*)\s*liter/i);
        
        if (match && match[1]) {
          return parseFloat(match[1].replace(',', '.'));
        }
      }
    }
    
    return null;
  }

  /**
   * Estimate energy consumption based on energy efficiency class
   * @param {string} energyClass - Energy efficiency class
   * @returns {number} Estimated annual energy consumption in kWh
   */
  estimateEnergyConsumptionFromClass(energyClass) {
    const productType = this.determineProductType();
    
    // These are rough estimates based on typical values
    if (productType === 'refrigerator') {
      switch (energyClass) {
        case 'A+++': return 150;
        case 'A++': return 200;
        case 'A+': return 250;
        case 'A': return 300;
        case 'B': return 350;
        case 'C': return 400;
        case 'D': return 450;
        default: return 300;
      }
    } else if (productType === 'washingMachine') {
      switch (energyClass) {
        case 'A+++': return 130;
        case 'A++': return 160;
        case 'A+': return 190;
        case 'A': return 220;
        case 'B': return 250;
        case 'C': return 280;
        default: return 200;
      }
    } else if (productType === 'dishwasher') {
      switch (energyClass) {
        case 'A+++': return 180;
        case 'A++': return 210;
        case 'A+': return 240;
        case 'A': return 270;
        case 'B': return 300;
        default: return 250;
      }
    } else if (productType === 'dryer') {
      switch (energyClass) {
        case 'A+++': return 160;
        case 'A++': return 200;
        case 'A+': return 250;
        case 'A': return 300;
        case 'B': return 400;
        case 'C': return 500;
        default: return 350;
      }
    }
    
    return 300; // Default fallback
  }

  /**
   * Get all text nodes under a given element
   * @param {Element} element - The element to search under
   * @returns {Array} Array of text nodes
   */
  getAllTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    
    return textNodes;
  }
}

// Export the scraper
if (typeof module !== 'undefined') {
  module.exports = SaturnScraper;
}
