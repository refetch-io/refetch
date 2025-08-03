// Background script for Refetch.io New Tab extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Refetch.io New Tab extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open refetch.io in a new tab when extension icon is clicked
  chrome.tabs.create({ url: 'https://refetch.io' });
}); 