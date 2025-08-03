# Refetch.io New Tab Chrome Extension

This Chrome extension sets [refetch.io](https://refetch.io) as your new tab page.

## Features

- Automatically redirects new tabs to refetch.io
- Clean, modern loading screen with gradient background
- Smooth user experience with loading animation

## Installation

### Method 1: Load as Unpacked Extension (Recommended for Development)

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" by toggling the switch in the top right corner
3. Click "Load unpacked" button
4. Select the `chrome-extension` folder from this project
5. The extension should now appear in your extensions list

### Method 2: Package for Distribution

1. In the extensions page, click "Pack extension"
2. Select the `chrome-extension` folder
3. This will create a `.crx` file that can be distributed

## Usage

Once installed, every time you open a new tab, it will automatically redirect to refetch.io.

## Files Structure

```
chrome-extension/
├── manifest.json          # Extension configuration
├── newtab.html           # New tab page that redirects to refetch.io
├── icons/
│   ├── icon.svg          # Source SVG icon
│   ├── icon16.png        # 16x16 icon (needs to be generated)
│   ├── icon48.png        # 48x48 icon (needs to be generated)
│   └── icon128.png       # 128x128 icon (needs to be generated)
└── README.md             # This file
```

## Icon Generation

The extension requires PNG icons in different sizes. You can generate them from the provided SVG:

1. Open `icons/icon.svg` in a browser or image editor
2. Export as PNG in the following sizes:
   - 16x16 pixels → `icon16.png`
   - 48x48 pixels → `icon48.png`
   - 128x128 pixels → `icon128.png`

## Customization

To modify the extension:

- **Change the target URL**: Edit `newtab.html` and update the `window.location.href` value
- **Modify the loading screen**: Edit the CSS and HTML in `newtab.html`
- **Update the extension name**: Edit the `name` field in `manifest.json`

## Troubleshooting

- If the extension doesn't work, make sure it's enabled in `chrome://extensions/`
- Check the browser console for any JavaScript errors
- Ensure all icon files are present in the `icons/` folder

## License

This extension is provided as-is for use with refetch.io. 