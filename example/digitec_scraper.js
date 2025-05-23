// digitec_scraper.js - Specialized scraping functionality for digitec.ch product pages

/**
 * DigitecScraper - A specialized module for extracting product information from digitec.ch
 */
class DigitecScraper {
  /**
   * Extract all relevant product data from a digitec.ch product page
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
      console.error('Error extracting product data (digitec):', error);
      return null;
    }
  }

  extractProductName() {
    // Digitec typically uses these selectors for product names
    const selectors = [
      'h1[data-testid="product-title"]',
      'h1.product-title',
      '.product-title',
      'h1'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    throw new Error('Could not extract product name');
  }

  extractPrice() {
    // Digitec price selectors
    const selectors = [
      'span[data-testid="product-price"]',
      '.product-detail__price',
      '.product-price',
      '.price',
      'span.price'
    ];
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.match(/[\d,.]+/)) {
        // Extract numeric value
        const priceText = element.textContent.replace(/[^\d,.]/g, '').replace(',', '.');
        return parseFloat(priceText);
      }
    }
    throw new Error('Could not extract product price');
  }

  extractEnergyConsumption() {
    // Try to find energy consumption (kWh/year)
    const regex = /(\d{2,4})\s*kWh\/?Jahr|Jahr\s*[:=]?\s*(\d{2,4})\s*kWh/i;
    const text = document.body.innerText;
    const match = text.match(regex);
    if (match) {
      return parseInt(match[1] || match[2], 10);
    }
    return null;
  }

  extractEnergyEfficiencyClass() {
    // Try to find energy efficiency class (A, B, C, ...)
    const regex = /Energieeffizienzklasse\s*[:=]?\s*([A-G][+]{0,3})/i;
    const text = document.body.innerText;
    const match = text.match(regex);
    if (match) {
      return match[1];
    }
    return null;
  }

  determineProductType() {
    // Try to infer product type from breadcrumbs or page structure
    const breadcrumb = document.querySelector('.breadcrumb, nav[aria-label="breadcrumb"]');
    if (breadcrumb) {
      const items = breadcrumb.innerText.split('\n').map(s => s.trim()).filter(Boolean);
      if (items.length > 1) {
        return items[items.length - 2];
      }
    }
    return 'Appliance';
  }

  extractProductDetails() {
    // Optionally extract more details if needed
    return {};
  }
}

// Export for use in content.js
if (typeof window !== 'undefined') {
  window.DigitecScraper = DigitecScraper;
}
