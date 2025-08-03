# Quick Installation Guide

## Step 1: Generate Icons
First, you need to generate the PNG icons from the SVG file:

```bash
cd chrome-extension
node generate-icons.js
```

Follow the instructions to create the required PNG files.

## Step 2: Install in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder
6. The extension should now appear in your extensions list

## Step 3: Test

Open a new tab (Ctrl+T or Cmd+T) and it should redirect to refetch.io!

## Troubleshooting

- If the extension doesn't work, check that all icon files are present
- Make sure the extension is enabled in chrome://extensions/
- Try refreshing the extension if it doesn't work immediately

## Files Checklist

- ✅ `manifest.json`
- ✅ `newtab.html`
- ✅ `icons/icon.svg`
- ⏳ `icons/icon16.png` (generate this)
- ⏳ `icons/icon48.png` (generate this)
- ⏳ `icons/icon128.png` (generate this) 