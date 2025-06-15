// utils.js
console.log('xCost: utils.js loaded');

// Determine product type based on page content
function determineProductType(pageText) { // Added pageText parameter
  const lowerPageText = pageText.toLowerCase(); // Use the passed parameter
  if (lowerPageText.includes('kühlschrank') || lowerPageText.includes('refrigerator') || lowerPageText.includes('fridge')) {
    return 'refrigerator';
  } else if (lowerPageText.includes('waschmaschine') || lowerPageText.includes('washing machine')) {
    return 'washingMachine';
  } else if (lowerPageText.includes('geschirrspüler') || lowerPageText.includes('dishwasher')) {
    return 'dishwasher';
  } else if (lowerPageText.includes('trockner') || lowerPageText.includes('dryer')) {
    return 'dryer';
  } else if (lowerPageText.includes('clothing') || lowerPageText.includes('shirt') || lowerPageText.includes('pants') || lowerPageText.includes('zara')) {
    // More specific check for Zara to avoid misclassification if 'zara' appears in other contexts
    if (window.location.hostname.includes('zara.com') || lowerPageText.includes('zara brand')) { // Example refinement
        return 'clothing';
    }
  } else if (lowerPageText.includes('auto') || lowerPageText.includes('car') || lowerPageText.includes('fahrzeug')) {
    return 'car';
  }
  return 'unknown';
}