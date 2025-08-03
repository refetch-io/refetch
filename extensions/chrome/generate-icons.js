const fs = require('fs');
const path = require('path');

console.log('🎨 Refetch.io Chrome Extension - Icon Generation');
console.log('================================================');
console.log('');

// Check if icons directory exists
const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
    console.log('✅ Created icons directory');
}

// Check for SVG file
const svgPath = path.join(iconsDir, 'icon.svg');
if (!fs.existsSync(svgPath)) {
    console.log('❌ icon.svg not found in icons directory');
    process.exit(1);
}

console.log('✅ Found icon.svg');

// Check for required PNG files
const requiredSizes = [16, 48, 128];
const missingFiles = [];

requiredSizes.forEach(size => {
    const pngPath = path.join(iconsDir, `icon${size}.png`);
    if (!fs.existsSync(pngPath)) {
        missingFiles.push(`icon${size}.png`);
    }
});

if (missingFiles.length === 0) {
    console.log('✅ All required icon files are present!');
    console.log('');
    console.log('The extension is ready to be loaded in Chrome.');
} else {
    console.log('❌ Missing icon files:', missingFiles.join(', '));
    console.log('');
    console.log('📋 To generate the missing PNG icons:');
    console.log('');
    console.log('Method 1 - Using a web browser:');
    console.log('1. Open chrome-extension/icons/icon.svg in your web browser');
    console.log('2. Right-click on the icon and select "Save image as..."');
    console.log('3. Save it as icon128.png');
    console.log('4. Use an image editor to resize to the required sizes');
    console.log('');
    console.log('Method 2 - Using online tools:');
    console.log('- https://convertio.co/svg-png/');
    console.log('- https://cloudconvert.com/svg-to-png');
    console.log('- https://www.svgviewer.dev/');
    console.log('');
    console.log('Method 3 - Using command line (if you have ImageMagick):');
    console.log('cd chrome-extension/icons');
    console.log('convert icon.svg -resize 16x16 icon16.png');
    console.log('convert icon.svg -resize 48x48 icon48.png');
    console.log('convert icon.svg -resize 128x128 icon128.png');
    console.log('');
    console.log('Required files:');
    requiredSizes.forEach(size => {
        const status = fs.existsSync(path.join(iconsDir, `icon${size}.png`)) ? '✅' : '❌';
        console.log(`${status} icon${size}.png (${size}x${size} pixels)`);
    });
}

console.log('');
console.log('📖 Installation Instructions:');
console.log('1. Open Chrome and go to chrome://extensions/');
console.log('2. Enable "Developer mode"');
console.log('3. Click "Load unpacked" and select the chrome-extension folder');
console.log('4. Open a new tab to test the extension'); 