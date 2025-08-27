// Background script for handling extension events
chrome.runtime.onInstalled.addListener(() => {
    console.log('Myntra Virtual Try-On extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
    // This will open the popup automatically due to manifest configuration
    console.log('Extension icon clicked');
});
