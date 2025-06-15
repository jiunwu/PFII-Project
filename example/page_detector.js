// page_detector.js
console.log('xCost: page_detector.js loaded');

// Check if the current page is a product page
async function isProductPage() {
  const currentUrl = window.location.href;
  const hostname = window.location.hostname;
  console.log('Checking if product page. URL:', currentUrl, 'Hostname:', hostname);

  // Special handling for Zara sites
  if (hostname.includes('zara.com')) {
    console.log('Detected Zara site');
    
    // Check URL patterns for Zara product pages
    // Added pattern for ...-p<product_id>.html
    const zaraProductPagePattern = /-p[0-9]+\.html/i;
    if (currentUrl.includes('/product/') || currentUrl.includes('/item/') || zaraProductPagePattern.test(currentUrl)) {
      console.log('Zara product page detected from URL pattern');
      return true;
    }
    
    // Check for Zara product elements in the DOM
    const productPageIndicators = [
      '.product-detail',
      '.product-info',
      '[data-product-id]',
      'section[data-product-id]', // Added
      '.product-detail-info', 
      'div[class*="product-detail__info"]', // Added
      'div[class*="product-detail-view"]', // Added: common pattern for product views
      'main[id*="product"]', // Added: main element with product in ID
      '.money-amount__main',
      '[data-qa-price]',
      'span[class*="price"],', // Added: more generic price class
      'h1.product-name', // Added
      'h1[itemprop="name"]', // Added: schema.org itemprop for name
      'span[data-qa-product-name]', // Added
      'button[data-qa-action="add-to-cart"]', // Added
      'button[class*="add-to-cart"]', // Added: class contains add-to-cart
      'button[class*="add-to-bag"]', // Added: class contains add-to-bag
      'form[action*="cart/add"]' // Added: form for adding to cart
    ];
    
    console.log('Attempting to detect Zara product page using DOM selectors:', productPageIndicators);
    for (const selector of productPageIndicators) {
      const element = document.querySelector(selector);
      console.log(`Checking for Zara selector: "${selector}" - Found: ${!!element}`);
      if (element) {
        console.log('Zara product page detected from DOM element:', selector);
        return true;
      }
    }
    
    // For debugging - dump potential product elements
    console.log('Main content:', document.body.innerText.substring(0, 500));
    console.log('H1 content:', document.querySelector('h1')?.textContent);
    
    // Removed Gemini API call from here. data_extractor.js will handle it.
    
    // If we're still not sure, check if the page has price-like elements
    const priceElements = document.querySelectorAll('.price, .money-amount, [data-qa-price], .product-price');
    if (priceElements.length > 0) {
      console.log('Potential Zara product page detected from price elements');
      return true;
    }
    
    console.log('Not a Zara product page');
    return false;
  }

  // Standard checks for other sites
  console.log('Checking URL for non-Zara sites:', currentUrl);

  const isTuttiCar = hostname.includes('tutti.ch') &&
                     (currentUrl.includes('/fahrzeuge/') || // German for vehicles
                      currentUrl.includes('/auto/') ||       // German, general for car
                      currentUrl.includes('/automobili/') ||  // Italian for cars
                      currentUrl.includes('/autos/') ||       // German plural for cars, Spanish for cars
                      currentUrl.includes('/vehicules/') ||   // French for vehicles
                      currentUrl.includes('/voitures/'));    // French for cars
  console.log('Is tutti.ch car page?', isTuttiCar);

  if (!currentUrl.includes('/product/') &&
      !hostname.includes('saturn.de') &&
      !hostname.includes('tutti.ch') &&
      !hostname.includes('digitec.ch')
    ) {
    console.log('Not a product page based on URL and host checks (no /product/, not Saturn, not Tutti, not Digitec).');
    return false;
  } else if (hostname.includes('digitec.ch')) {
    const productIdPattern = /-(\d+)(#|$|\?)/;
    const hasProductId = productIdPattern.test(currentUrl);
    const hasProductTitle = document.querySelector('h1[data-testid="product-title"], h1.product-title, .product-title, h1');
    if (!hasProductId || !hasProductTitle) {
      console.log('Not a Digitec product page based on URL or missing product title');
      return false;
    }
    console.log('Is a Digitec product page based on specific checks.');
    return true;
  }

  // Fallback to Gemini for other matched sites or generic /product/ pages
  console.log('URL pattern matches a product page or is a recognized host, proceeding to check content with Gemini API...');
  const pageText = document.body.innerText;
  console.log('Page text length for Gemini API:', pageText.length);
  console.log('Calling Gemini API with isCar param:', isTuttiCar);
  
  // Assuming callGeminiAPIForProductData is available
  const productData = await callGeminiAPIForProductData(pageText, isTuttiCar);
  console.log('Gemini API response:', productData);
  
  if (!productData || !productData.name || !productData.price) {
    console.log('Gemini API did not return sufficient product data (name or price missing)');
    return false;
  }
  
  window._ltcGeminiProductData = productData; // Store for potential use by other functions
  console.log('Stored Gemini product data in window object:', window._ltcGeminiProductData);
  return true;
}