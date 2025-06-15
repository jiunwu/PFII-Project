// onboarding.js - Onboarding page functionality for xCost Extension

console.log('xCost onboarding page loaded');

document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const apiKeyInput = document.getElementById('gemini-api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const testApiKeyBtn = document.getElementById('test-api-key');
    const successMessage = document.getElementById('success-message');
    const errorMessage = document.getElementById('error-message');
    const finishOnboardingBtn = document.getElementById('finish-onboarding');
    const skipOnboardingBtn = document.getElementById('skip-onboarding');
    const openSettingsBtn = document.getElementById('open-settings');
    const openUserGuideBtn = document.getElementById('open-user-guide');

    let apiKeySaved = false;

    // Check if API key already exists
    chrome.storage.sync.get(['geminiApiKey'], function(result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = '••••••••••••••••••••••••••••••••••••••••';
            apiKeyInput.disabled = true;
            saveApiKeyBtn.textContent = '✅ API Key Already Saved';
            saveApiKeyBtn.disabled = true;
            testApiKeyBtn.disabled = false;
            apiKeySaved = true;
            showSuccessMessage('API key is already configured!');
        }
    });

    // Enable/disable test button based on input
    apiKeyInput.addEventListener('input', function() {
        const hasApiKey = apiKeyInput.value.trim().length > 0;
        testApiKeyBtn.disabled = !hasApiKey || !apiKeySaved;
        
        if (apiKeyInput.value.trim().length > 0 && !apiKeySaved) {
            saveApiKeyBtn.disabled = false;
        }
    });

    // Save API key
    saveApiKeyBtn.addEventListener('click', async function() {
        const apiKey = apiKeyInput.value.trim();
        
        if (!apiKey) {
            showErrorMessage('Please enter your Gemini API key');
            return;
        }

        if (!apiKey.startsWith('AIza')) {
            showErrorMessage('Invalid API key format. Gemini API keys should start with "AIza"');
            return;
        }

        saveApiKeyBtn.disabled = true;
        saveApiKeyBtn.textContent = 'Saving...';

        try {
            // Save to chrome storage
            await new Promise((resolve, reject) => {
                chrome.storage.sync.set({ geminiApiKey: apiKey }, function() {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve();
                    }
                });
            });

            // Test the API key
            const isValid = await testApiKey(apiKey);
            
            if (isValid) {
                apiKeySaved = true;
                testApiKeyBtn.disabled = false;
                saveApiKeyBtn.textContent = '✅ Saved Successfully';
                apiKeyInput.value = '••••••••••••••••••••••••••••••••••••••••';
                apiKeyInput.disabled = true;
                showSuccessMessage('API key saved and verified successfully! xCost is now ready to use.');
            } else {
                throw new Error('API key test failed');
            }
        } catch (error) {
            console.error('Error saving API key:', error);
            saveApiKeyBtn.disabled = false;
            saveApiKeyBtn.textContent = 'Save API Key';
            showErrorMessage('Failed to save or verify API key. Please check the key and try again.');
        }
    });

    // Test API key
    testApiKeyBtn.addEventListener('click', async function() {
        testApiKeyBtn.disabled = true;
        testApiKeyBtn.textContent = 'Testing...';

        try {
            chrome.storage.sync.get(['geminiApiKey'], async function(result) {
                if (result.geminiApiKey) {
                    const isValid = await testApiKey(result.geminiApiKey);
                    
                    if (isValid) {
                        showSuccessMessage('✅ API key is working correctly!');
                    } else {
                        showErrorMessage('❌ API key test failed. Please check your key.');
                    }
                } else {
                    showErrorMessage('No API key found. Please save one first.');
                }
                
                testApiKeyBtn.disabled = false;
                testApiKeyBtn.textContent = 'Test Connection';
            });
        } catch (error) {
            console.error('Error testing API key:', error);
            showErrorMessage('Error testing API key connection.');
            testApiKeyBtn.disabled = false;
            testApiKeyBtn.textContent = 'Test Connection';
        }
    });

    // Finish onboarding
    finishOnboardingBtn.addEventListener('click', function() {
        // Mark onboarding as completed
        chrome.storage.sync.set({ hasOnboarded: true }, function() {
            // Close the onboarding tab
            chrome.tabs.getCurrent(function(tab) {
                chrome.tabs.remove(tab.id);
            });
        });
    });

    // Skip onboarding
    skipOnboardingBtn.addEventListener('click', function() {
        if (confirm('Are you sure you want to skip setup? You can configure xCost later in the extension settings.')) {
            chrome.storage.sync.set({ hasOnboarded: true }, function() {
                chrome.tabs.getCurrent(function(tab) {
                    chrome.tabs.remove(tab.id);
                });
            });
        }
    });

    // Open settings
    openSettingsBtn.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });

    // Open user guide (placeholder)
    openUserGuideBtn.addEventListener('click', function() {
        // You can replace this with an actual user guide URL or page
        alert('User guide coming soon! For now, visit the extension settings for help.');
    });

    // Helper functions
    function showSuccessMessage(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }

    function showErrorMessage(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // Test API key function
    async function testApiKey(apiKey) {
        try {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Hello! This is a test message. Please respond with "API test successful".'
                        }]
                    }]
                })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('API test response:', data);
                return true;
            } else {
                console.error('API test failed:', response.status, response.statusText);
                return false;
            }
        } catch (error) {
            console.error('API test error:', error);
            return false;
        }
    }

    // Add some nice animations
    const steps = document.querySelectorAll('.step');
    steps.forEach((step, index) => {
        step.style.opacity = '0';
        step.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            step.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            step.style.opacity = '1';
            step.style.transform = 'translateY(0)';
        }, index * 200);
    });
});

// Handle keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Enter key to save API key
    if (event.key === 'Enter' && document.activeElement === document.getElementById('gemini-api-key')) {
        document.getElementById('save-api-key').click();
    }
    
    // Escape key to skip onboarding
    if (event.key === 'Escape') {
        document.getElementById('skip-onboarding').click();
    }
});

// Add tooltips for better UX
const buttons = document.querySelectorAll('.btn');
buttons.forEach(button => {
    button.addEventListener('mouseenter', function() {
        if (this.disabled) {
            this.style.cursor = 'not-allowed';
        }
    });
});

console.log('xCost onboarding JavaScript initialized'); 