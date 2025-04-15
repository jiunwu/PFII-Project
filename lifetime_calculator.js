// lifetime_calculator.js - Specialized module for calculating lifetime costs

/**
 * LifetimeCalculator - A module for calculating the lifetime cost of products
 * Implements the methodology outlined in the lifetime_cost_calculation.md document
 */
class LifetimeCalculator {
  /**
   * Create a new LifetimeCalculator instance
   * @param {Object} preferences - User preferences for calculations
   */
  constructor(preferences) {
    this.preferences = preferences || {
      electricityRate: 0.30, // €/kWh
      discountRate: 0.02, // 2%
      applianceLifespans: {
        refrigerator: 10,
        washingMachine: 8,
        dishwasher: 9,
        dryer: 8,
        unknown: 10
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
        },
        unknown: {
          averageRepairCost: 300,
          expectedRepairs: 2
        }
      }
    };
  }

  /**
   * Calculate the lifetime cost of a product
   * @param {Object} productData - Product data extracted from the page
   * @returns {Object} Calculation results
   */
  calculateLifetimeCost(productData) {
    // Validate input data
    if (!productData || !productData.price) {
      throw new Error('Invalid product data: price is required');
    }

    // Get product type and corresponding lifespan
    const productType = productData.productType || 'unknown';
    const lifespan = this.getLifespan(productType);

    // Calculate energy costs
    const energyResults = this.calculateEnergyCosts(productData, lifespan);

    // Calculate maintenance costs
    const maintenanceResults = this.calculateMaintenanceCosts(productType, lifespan);

    // Calculate total lifetime cost
    const totalLifetimeCost = productData.price + energyResults.energyCostNPV + maintenanceResults.maintenanceCostNPV;

    // Return comprehensive results
    return {
      purchasePrice: productData.price,
      energyCostNPV: energyResults.energyCostNPV,
      maintenanceCostNPV: maintenanceResults.maintenanceCostNPV,
      totalLifetimeCost: totalLifetimeCost,
      annualEnergyConsumption: energyResults.annualEnergyConsumption,
      annualEnergyCost: energyResults.annualEnergyCost,
      lifespan: lifespan,
      energyEfficiencyClass: productData.energyEfficiencyClass || 'Unknown',
      yearlyBreakdown: this.generateYearlyBreakdown(
        productData.price,
        energyResults.annualEnergyCost,
        maintenanceResults.repairYears,
        maintenanceResults.repairCost,
        lifespan
      )
    };
  }

  /**
   * Get the lifespan for a given product type
   * @param {string} productType - Type of product
   * @returns {number} Lifespan in years
   */
  getLifespan(productType) {
    return this.preferences.applianceLifespans[productType] || 
           this.preferences.applianceLifespans.unknown || 
           10;
  }

  /**
   * Calculate energy costs over the product lifetime
   * @param {Object} productData - Product data
   * @param {number} lifespan - Product lifespan in years
   * @returns {Object} Energy cost calculation results
   */
  calculateEnergyCosts(productData, lifespan) {
    // Get annual energy consumption
    const annualEnergyConsumption = productData.energyConsumption || 
                                   this.estimateEnergyConsumption(productData);

    // Calculate annual energy cost
    const annualEnergyCost = annualEnergyConsumption * this.preferences.electricityRate;

    // Calculate NPV of energy costs over lifespan
    let energyCostNPV = 0;
    for (let year = 1; year <= lifespan; year++) {
      energyCostNPV += annualEnergyCost / Math.pow(1 + this.preferences.discountRate, year);
    }

    return {
      annualEnergyConsumption,
      annualEnergyCost,
      energyCostNPV
    };
  }

  /**
   * Calculate maintenance costs over the product lifetime
   * @param {string} productType - Type of product
   * @param {number} lifespan - Product lifespan in years
   * @returns {Object} Maintenance cost calculation results
   */
  calculateMaintenanceCosts(productType, lifespan) {
    // Get maintenance cost parameters
    const maintenanceInfo = this.preferences.maintenanceCosts[productType] || 
                           this.preferences.maintenanceCosts.unknown;

    const repairCost = maintenanceInfo.averageRepairCost;
    const numRepairs = maintenanceInfo.expectedRepairs;

    // Calculate when repairs are likely to happen
    const repairYears = [];
    for (let i = 1; i <= numRepairs; i++) {
      // Distribute repairs throughout the lifespan
      // First repair typically happens after warranty period
      const repairYear = Math.round(i * lifespan / (numRepairs + 1));
      repairYears.push(repairYear);
    }

    // Calculate NPV of maintenance costs
    let maintenanceCostNPV = 0;
    for (const year of repairYears) {
      maintenanceCostNPV += repairCost / Math.pow(1 + this.preferences.discountRate, year);
    }

    return {
      maintenanceCostNPV,
      repairYears,
      repairCost
    };
  }

  /**
   * Estimate energy consumption if not provided
   * @param {Object} productData - Product data
   * @returns {number} Estimated annual energy consumption in kWh
   */
  estimateEnergyConsumption(productData) {
    const productType = productData.productType || 'unknown';
    const energyClass = productData.energyEfficiencyClass;

    // If we have energy class, estimate based on that
    if (energyClass && energyClass !== 'Unknown') {
      return this.estimateEnergyConsumptionFromClass(energyClass, productType);
    }

    // Default values based on product type
    switch (productType) {
      case 'refrigerator': return 300; // Average for refrigerators
      case 'washingMachine': return 200; // Average for washing machines
      case 'dishwasher': return 250; // Average for dishwashers
      case 'dryer': return 500; // Average for dryers
      default: return 300; // General fallback
    }
  }

  /**
   * Estimate energy consumption based on energy efficiency class
   * @param {string} energyClass - Energy efficiency class
   * @param {string} productType - Type of product
   * @returns {number} Estimated annual energy consumption in kWh
   */
  estimateEnergyConsumptionFromClass(energyClass, productType) {
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
   * Generate a year-by-year breakdown of costs
   * @param {number} purchasePrice - Initial purchase price
   * @param {number} annualEnergyCost - Annual energy cost
   * @param {Array} repairYears - Years when repairs are expected
   * @param {number} repairCost - Cost per repair
   * @param {number} lifespan - Product lifespan in years
   * @returns {Array} Year-by-year breakdown of costs
   */
  generateYearlyBreakdown(purchasePrice, annualEnergyCost, repairYears, repairCost, lifespan) {
    const yearlyBreakdown = [];
    
    // Year 0 (purchase)
    yearlyBreakdown.push({
      year: 0,
      costs: {
        purchase: purchasePrice,
        energy: 0,
        maintenance: 0
      },
      npvFactor: 1,
      totalNominal: purchasePrice,
      totalNPV: purchasePrice
    });
    
    // Years 1 to lifespan
    for (let year = 1; year <= lifespan; year++) {
      const npvFactor = 1 / Math.pow(1 + this.preferences.discountRate, year);
      const maintenanceCost = repairYears.includes(year) ? repairCost : 0;
      
      yearlyBreakdown.push({
        year: year,
        costs: {
          purchase: 0,
          energy: annualEnergyCost,
          maintenance: maintenanceCost
        },
        npvFactor: npvFactor,
        totalNominal: annualEnergyCost + maintenanceCost,
        totalNPV: (annualEnergyCost + maintenanceCost) * npvFactor
      });
    }
    
    return yearlyBreakdown;
  }

  /**
   * Calculate the cumulative costs at each year
   * @param {Array} yearlyBreakdown - Year-by-year breakdown of costs
   * @returns {Array} Cumulative costs by year
   */
  calculateCumulativeCosts(yearlyBreakdown) {
    let cumulativeNominal = 0;
    let cumulativeNPV = 0;
    
    return yearlyBreakdown.map(yearData => {
      cumulativeNominal += yearData.totalNominal;
      cumulativeNPV += yearData.totalNPV;
      
      return {
        year: yearData.year,
        cumulativeNominal: cumulativeNominal,
        cumulativeNPV: cumulativeNPV
      };
    });
  }

  /**
   * Compare lifetime costs between multiple products
   * @param {Array} products - Array of product data with calculation results
   * @returns {Object} Comparison results
   */
  compareProducts(products) {
    if (!products || products.length < 2) {
      throw new Error('At least two products are required for comparison');
    }
    
    // Sort products by total lifetime cost
    const sortedProducts = [...products].sort((a, b) => 
      a.calculationResults.totalLifetimeCost - b.calculationResults.totalLifetimeCost
    );
    
    // Calculate savings compared to most expensive option
    const mostExpensive = sortedProducts[sortedProducts.length - 1];
    
    const productsWithSavings = sortedProducts.map(product => {
      const savings = mostExpensive.calculationResults.totalLifetimeCost - 
                     product.calculationResults.totalLifetimeCost;
      
      return {
        ...product,
        savings: savings,
        savingsPercentage: (savings / mostExpensive.calculationResults.totalLifetimeCost) * 100
      };
    });
    
    return {
      cheapestOption: productsWithSavings[0],
      mostExpensiveOption: mostExpensive,
      allProducts: productsWithSavings
    };
  }

  /**
   * Calculate the break-even point between two products
   * @param {Object} product1 - First product with calculation results
   * @param {Object} product2 - Second product with calculation results
   * @returns {Object|null} Break-even point information or null if no break-even
   */
  calculateBreakEvenPoint(product1, product2) {
    // Ensure we have calculation results
    if (!product1.calculationResults || !product2.calculationResults) {
      throw new Error('Both products must have calculation results');
    }
    
    // Get cumulative costs for both products
    const cumulative1 = this.calculateCumulativeCosts(product1.calculationResults.yearlyBreakdown);
    const cumulative2 = this.calculateCumulativeCosts(product2.calculationResults.yearlyBreakdown);
    
    // Find the break-even point (where cumulative costs cross)
    let breakEvenYear = null;
    let breakEvenValue = null;
    
    // We need to find where the cost lines cross
    for (let i = 1; i < Math.min(cumulative1.length, cumulative2.length); i++) {
      const prev1 = cumulative1[i-1].cumulativeNPV;
      const curr1 = cumulative1[i].cumulativeNPV;
      const prev2 = cumulative2[i-1].cumulativeNPV;
      const curr2 = cumulative2[i].cumulativeNPV;
      
      // Check if the lines crossed between previous and current year
      if ((prev1 < prev2 && curr1 >= curr2) || (prev1 > prev2 && curr1 <= curr2)) {
        // Interpolate to find more precise break-even point
        const ratio = Math.abs(prev1 - prev2) / Math.abs((curr1 - curr2) - (prev1 - prev2));
        breakEvenYear = (i - 1) + ratio;
        breakEvenValue = prev1 + ratio * (curr1 - prev1);
        break;
      }
    }
    
    if (breakEvenYear === null) {
      return null; // No break-even point found
    }
    
    return {
      year: breakEvenYear,
      value: breakEvenValue,
      product1Cumulative: cumulative1,
      product2Cumulative: cumulative2
    };
  }
}

// Export the calculator
if (typeof module !== 'undefined') {
  module.exports = LifetimeCalculator;
}
