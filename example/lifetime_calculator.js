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
        clothing: 5,
        unknown: 10
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
    const averageRepairCost = typeof productData.averageRepairCost === 'number' ? productData.averageRepairCost : 350;
    const numRepairs = typeof productData.expectedRepairs === 'number' ? productData.expectedRepairs : 2;
    const maintenanceResults = this.calculateMaintenanceCosts(averageRepairCost, numRepairs, lifespan);

    // Cap maintenanceCostNPV at productData.price
    let cappedMaintenanceCostNPV = maintenanceResults.maintenanceCostNPV;
    if (cappedMaintenanceCostNPV > productData.price) {
      console.warn(`LifetimeCalculator: MaintenanceCostNPV (${cappedMaintenanceCostNPV.toFixed(2)}) exceeded product price (${productData.price.toFixed(2)}). Capping at price.`);
      cappedMaintenanceCostNPV = productData.price;
    }

    // Calculate total lifetime cost
    const totalLifetimeCost = productData.price + energyResults.energyCostNPV + cappedMaintenanceCostNPV;

    // Return comprehensive results
    return {
      purchasePrice: productData.price,
      energyCostNPV: energyResults.energyCostNPV,
      maintenanceCostNPV: cappedMaintenanceCostNPV,
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
    // Prioritize productData.energyConsumption (expected from Gemini API)
    let annualEnergyConsumption = productData.energyConsumption;
    if (typeof annualEnergyConsumption !== 'number' || isNaN(annualEnergyConsumption)) {
      console.warn('LifetimeCalculator: productData.energyConsumption is missing or invalid. Using default 300 kWh/year.');
      annualEnergyConsumption = 300; // Default fallback
    }

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
   * @param {string} productType - Type of product (NO LONGER USED, but kept for now to avoid breaking calls if any)
   * @param {number} lifespan - Product lifespan in years
   * @param {number} averageRepairCost - Average cost of a single repair
   * @param {number} numRepairs - Expected number of repairs over the lifespan
   * @returns {Object} Maintenance cost calculation results
   */
  calculateMaintenanceCosts(averageRepairCost, numRepairs, lifespan) {
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
      maintenanceCostNPV += averageRepairCost / Math.pow(1 + this.preferences.discountRate, year);
    }

    return {
      maintenanceCostNPV,
      repairYears,
      repairCost: averageRepairCost
    };
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

// Removed duplicate isProductPage function. Use the global version from page_detector.js instead.

// Export the calculator
if (typeof module !== 'undefined') {
  module.exports = LifetimeCalculator;
}

// Calculate lifetime cost based on product data and user preferences
function calculateLifetimeCost(productData, preferences) {
  console.log('Calculating lifetime cost for:', productData, preferences);

  if (!productData) {
    console.error('Product data is undefined in calculateLifetimeCost');
    return null;
  }
  
  if (!preferences) {
    console.warn('Preferences are undefined in calculateLifetimeCost, using defaults');
    preferences = {
      electricityRate: 0.30,
      discountRate: 0.02,
      applianceLifespans: { refrigerator: 10, washingMachine: 8, dishwasher: 9, dryer: 8, clothing: 5, unknown: 5 },
      maintenanceCosts: {
        refrigerator: { averageRepairCost: 350, expectedRepairs: 2 },
        washingMachine: { averageRepairCost: 250, expectedRepairs: 1 },
        dishwasher: { averageRepairCost: 200, expectedRepairs: 1 },
        dryer: { averageRepairCost: 200, expectedRepairs: 1 },
        clothing: { averageRepairCost: 20, expectedRepairs: 0 },
        unknown: { averageRepairCost: 100, expectedRepairs: 1 }
      }
    };
  }

  if (typeof productData.price !== 'number' || isNaN(productData.price)) {
    console.warn('Invalid price in product data:', productData.price);
    productData.price = 0;
  }

  if (productData.productType === 'clothing') {
    try {
      let material = (productData.material || '').toLowerCase();
      let quality = 'medium';
      let lifespan = 5; 
      if (material.includes('wool') || material.includes('cashmere')) { quality = 'high'; lifespan = 20; }
      else if (material.includes('cotton') || material.includes('linen')) { quality = 'medium'; lifespan = 10; }
      else if (material.includes('polyester') || material.includes('synthetic')) { quality = 'low'; lifespan = 5; }
      if (material.includes('cheap') || material.includes('low quality')) { lifespan = 2; quality = 'low'; }
      else if (material.includes('high quality')) { lifespan = 20; quality = 'high'; }

      const purchasePrice = productData.price;
      const annualCost = purchasePrice / lifespan;
      let maintenanceCostPerYear = 0;
      let washesPerYear = 40;
      if (quality === 'low' || material.includes('polyester') || material.includes('synthetic')) {
        washesPerYear = 60;
      }
      maintenanceCostPerYear = washesPerYear * 0.5; 
      const totalMaintenanceCost = maintenanceCostPerYear * lifespan;
      const totalLifetimeCost = purchasePrice + totalMaintenanceCost;
    
      return {
        purchasePrice, annualCost, lifespan, material, quality, 
        maintenanceCostPerYear, totalMaintenanceCost, totalLifetimeCost,
        productType: 'clothing',
        breakdown: { purchasePrice, annualCost, lifespan, material, quality, maintenanceCostPerYear, totalMaintenanceCost }
      };
    } catch (error) {
      console.error('Error calculating clothing lifetime cost:', error);
      return {
        purchasePrice: productData.price, annualCost: productData.price / 5, lifespan: 5,
        material: productData.material || 'Unknown', quality: 'medium',
        maintenanceCostPerYear: 20, totalMaintenanceCost: 100,
        totalLifetimeCost: productData.price + 100, productType: 'clothing'
      };
    }
  }
  
  return {
    purchasePrice: productData.price, energyCostNPV: 0, maintenanceCostNPV: 0,
    totalLifetimeCost: productData.price, annualEnergyConsumption: 0, annualEnergyCost: 0,
    lifespan: 5, energyEfficiencyClass: 'Unknown', productType: productData.productType || 'unknown'
  };
}

function calculateCarLifetimeCost(productData, preferences) {
  console.log('Calculating Car Lifetime Cost with:', productData, preferences);

  const { price, year, mileage, fuelType, fuelConsumption } = productData;
  const { 
    carOwnershipDuration = 5, annualMileage = 15000,
    fuelPrices = { petrol: 1.8, diesel: 1.9, electric: 0.25 },
    carInsuranceAnnual = 1000, carTaxAnnual = 300, 
    carMaintenancePerKm = 0.05, discountRate = 0.02
  } = preferences;

  const purchasePrice = parseFloat(price) || 0;
  const carAge = new Date().getFullYear() - (parseInt(year) || new Date().getFullYear());

  let estimatedResaleValue = purchasePrice * Math.pow(0.85, carOwnershipDuration);
  if (estimatedResaleValue < 0) estimatedResaleValue = 0;
  const totalDepreciation = purchasePrice - estimatedResaleValue;
  const annualDepreciation = totalDepreciation / carOwnershipDuration;

  const consumption = parseFloat(fuelConsumption) || (fuelType === 'electric' ? 20 : 8);
  const fuelPrice = fuelPrices[fuelType?.toLowerCase()] || fuelPrices.petrol;
  const annualFuelCost = (annualMileage / 100) * consumption * fuelPrice;
  
  let totalFuelCost = 0;
  for (let i = 0; i < carOwnershipDuration; i++) {
    totalFuelCost += annualFuelCost / Math.pow(1 + discountRate, i + 1);
  }

  let totalInsuranceCost = 0;
  for (let i = 0; i < carOwnershipDuration; i++) {
    totalInsuranceCost += carInsuranceAnnual / Math.pow(1 + discountRate, i + 1);
  }

  let totalTaxCost = 0;
  for (let i = 0; i < carOwnershipDuration; i++) {
    totalTaxCost += carTaxAnnual / Math.pow(1 + discountRate, i + 1);
  }

  const annualMaintenanceCost = annualMileage * carMaintenancePerKm;
  let totalMaintenanceCost = 0;
  for (let i = 0; i < carOwnershipDuration; i++) {
    totalMaintenanceCost += annualMaintenanceCost / Math.pow(1 + discountRate, i + 1);
  }

  const totalRunningCostsNPV = totalFuelCost + totalInsuranceCost + totalTaxCost + totalMaintenanceCost;
  const totalNetOwnershipCost = totalDepreciation + totalRunningCostsNPV; 
  const monthlyCost = totalNetOwnershipCost / (carOwnershipDuration * 12);

  return {
    productType: 'car', purchasePrice, year: productData.year, make: productData.make,
    model: productData.model, mileage: productData.mileage, fuelType: productData.fuelType,
    fuelConsumption: productData.fuelConsumption, currency: productData.currency || 'CHF',
    ownershipDuration: carOwnershipDuration, annualMileage, depreciationCost: totalDepreciation,
    annualDepreciation, estimatedResaleValue, fuelCostNPV: totalFuelCost, annualFuelCost,
    insuranceCostNPV: totalInsuranceCost, annualInsuranceCost: carInsuranceAnnual,
    taxCostNPV: totalTaxCost, annualTaxCost: carTaxAnnual, maintenanceCostNPV: totalMaintenanceCost,
    annualMaintenanceCost, totalRunningCostsNPV, totalLifetimeCost: totalNetOwnershipCost, monthlyCost
  };
}
