# Chrome Extension Development Research

## Manifest.json Structure
The manifest.json file is a crucial configuration file for Chrome extensions that defines the extension's structure and behavior. For our Lifetime Cost Calculator extension, we'll need to include:

- `manifest_version`: Must be 3 (latest version)
- `name`: The name of our extension ("Lifetime Cost Calculator")
- `version`: Version number (e.g., "1.0.0")
- `description`: Brief description of what our extension does
- `icons`: Icons in different sizes (48px, 128px)
- `permissions`: Required permissions for our extension
- `content_scripts`: JavaScript files to be injected into web pages
- `background`: Service worker for handling events
- `action`: Defines the appearance and behavior of the extension icon

## Content Scripts
Content scripts are JavaScript files that run in the context of web pages. They can:
- Access and manipulate the DOM of the pages the user visits
- Read details from product pages (prices, specifications, etc.)
- Inject our lifetime cost calculation UI into the page

Key properties for content_scripts:
- `matches`: URL patterns where scripts should be injected (e.g., "https://*.saturn.de/*")
- `js`: JavaScript files to inject
- `css`: CSS files to inject
- `run_at`: When to inject the scripts (document_idle, document_start, document_end)

## Background Scripts
Background scripts (service workers in Manifest V3) act as the extension's event handlers. They:
- Run in the background
- Handle events like tab updates, browser actions
- Store and process data
- Communicate with content scripts

## Permissions
Our extension will need permissions to:
- Access and modify content on specific websites (saturn.de and potentially other e-commerce sites)
- Store data (for user preferences and calculation parameters)

## Browser APIs
Relevant Chrome APIs for our extension:
- DOM manipulation: To read product information and inject our UI
- Storage API: To save user preferences and calculation parameters
- Tabs API: To detect when the user is viewing a product page
- Runtime API: For communication between content scripts and background script

## Next Steps
Now that we have a solid understanding of Chrome extension basics, we need to research product lifetime cost calculation methods to determine:
- What data we need to extract from product pages
- How to calculate lifetime costs for different product types
- What parameters to include in our calculations (energy costs, maintenance, etc.)
